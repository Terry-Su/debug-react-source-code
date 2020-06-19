  var DEFAULT_THREAD_ID = 0; // Counters used to generate unique IDs.

  var interactionIDCounter = 0;
  var threadIDCounter = 0; // Set of currently traced interactions.
  // Interactions "stack"–
  // Meaning that newly traced interactions are appended to the previously active set.
  // When an interaction goes out of scope, the previous set (if any) is restored.

  var interactionsRef = null; // Listener(s) to notify when interactions begin and end.

  var subscriberRef = null;

  {
    interactionsRef = {
      current: new Set()
    };
    subscriberRef = {
      current: null
    };
  }
  function unstable_clear(callback) {

    var prevInteractions = interactionsRef.current;
    interactionsRef.current = new Set();

    try {
      return callback();
    } finally {
      interactionsRef.current = prevInteractions;
    }
  }
  function unstable_getCurrent() {
    {
      return interactionsRef.current;
    }
  }
  function unstable_getThreadID() {
    return ++threadIDCounter;
  }
  function unstable_trace(name, timestamp, callback) {
    var threadID = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : DEFAULT_THREAD_ID;

    var interaction = {
      __count: 1,
      id: interactionIDCounter++,
      name: name,
      timestamp: timestamp
    };
    var prevInteractions = interactionsRef.current; // Traced interactions should stack/accumulate.
    // To do that, clone the current interactions.
    // The previous set will be restored upon completion.

    var interactions = new Set(prevInteractions);
    interactions.add(interaction);
    interactionsRef.current = interactions;
    var subscriber = subscriberRef.current;
    var returnValue;

    try {
      if (subscriber !== null) {
        subscriber.onInteractionTraced(interaction);
      }
    } finally {
      try {
        if (subscriber !== null) {
          subscriber.onWorkStarted(interactions, threadID);
        }
      } finally {
        try {
          returnValue = callback();
        } finally {
          interactionsRef.current = prevInteractions;

          try {
            if (subscriber !== null) {
              subscriber.onWorkStopped(interactions, threadID);
            }
          } finally {
            interaction.__count--; // If no async work was scheduled for this interaction,
            // Notify subscribers that it's completed.

            if (subscriber !== null && interaction.__count === 0) {
              subscriber.onInteractionScheduledWorkCompleted(interaction);
            }
          }
        }
      }
    }

    return returnValue;
  }
  function unstable_wrap(callback) {
    var threadID = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : DEFAULT_THREAD_ID;

    var wrappedInteractions = interactionsRef.current;
    var subscriber = subscriberRef.current;

    if (subscriber !== null) {
      subscriber.onWorkScheduled(wrappedInteractions, threadID);
    } // Update the pending async work count for the current interactions.
    // Update after calling subscribers in case of error.


    wrappedInteractions.forEach(function (interaction) {
      interaction.__count++;
    });
    var hasRun = false;

    function wrapped() {
      var prevInteractions = interactionsRef.current;
      interactionsRef.current = wrappedInteractions;
      subscriber = subscriberRef.current;

      try {
        var returnValue;

        try {
          if (subscriber !== null) {
            subscriber.onWorkStarted(wrappedInteractions, threadID);
          }
        } finally {
          try {
            returnValue = callback.apply(undefined, arguments);
          } finally {
            interactionsRef.current = prevInteractions;

            if (subscriber !== null) {
              subscriber.onWorkStopped(wrappedInteractions, threadID);
            }
          }
        }

        return returnValue;
      } finally {
        if (!hasRun) {
          // We only expect a wrapped function to be executed once,
          // But in the event that it's executed more than once–
          // Only decrement the outstanding interaction counts once.
          hasRun = true; // Update pending async counts for all wrapped interactions.
          // If this was the last scheduled async work for any of them,
          // Mark them as completed.

          wrappedInteractions.forEach(function (interaction) {
            interaction.__count--;

            if (subscriber !== null && interaction.__count === 0) {
              subscriber.onInteractionScheduledWorkCompleted(interaction);
            }
          });
        }
      }
    }

    wrapped.cancel = function cancel() {
      subscriber = subscriberRef.current;

      try {
        if (subscriber !== null) {
          subscriber.onWorkCanceled(wrappedInteractions, threadID);
        }
      } finally {
        // Update pending async counts for all wrapped interactions.
        // If this was the last scheduled async work for any of them,
        // Mark them as completed.
        wrappedInteractions.forEach(function (interaction) {
          interaction.__count--;

          if (subscriber && interaction.__count === 0) {
            subscriber.onInteractionScheduledWorkCompleted(interaction);
          }
        });
      }
    };

    return wrapped;
  }