  var subscribers = null;

  {
    subscribers = new Set();
  }

  function unstable_subscribe(subscriber) {
    {
      subscribers.add(subscriber);

      if (subscribers.size === 1) {
        subscriberRef.current = {
          onInteractionScheduledWorkCompleted: onInteractionScheduledWorkCompleted,
          onInteractionTraced: onInteractionTraced,
          onWorkCanceled: onWorkCanceled,
          onWorkScheduled: onWorkScheduled,
          onWorkStarted: onWorkStarted,
          onWorkStopped: onWorkStopped
        };
      }
    }
  }
  function unstable_unsubscribe(subscriber) {
    {
      subscribers.delete(subscriber);

      if (subscribers.size === 0) {
        subscriberRef.current = null;
      }
    }
  }

  function onInteractionTraced(interaction) {
    var didCatchError = false;
    var caughtError = null;
    subscribers.forEach(function (subscriber) {
      try {
        subscriber.onInteractionTraced(interaction);
      } catch (error) {
        if (!didCatchError) {
          didCatchError = true;
          caughtError = error;
        }
      }
    });

    if (didCatchError) {
      throw caughtError;
    }
  }

  function onInteractionScheduledWorkCompleted(interaction) {
    var didCatchError = false;
    var caughtError = null;
    subscribers.forEach(function (subscriber) {
      try {
        subscriber.onInteractionScheduledWorkCompleted(interaction);
      } catch (error) {
        if (!didCatchError) {
          didCatchError = true;
          caughtError = error;
        }
      }
    });

    if (didCatchError) {
      throw caughtError;
    }
  }

  function onWorkScheduled(interactions, threadID) {
    var didCatchError = false;
    var caughtError = null;
    subscribers.forEach(function (subscriber) {
      try {
        subscriber.onWorkScheduled(interactions, threadID);
      } catch (error) {
        if (!didCatchError) {
          didCatchError = true;
          caughtError = error;
        }
      }
    });

    if (didCatchError) {
      throw caughtError;
    }
  }

  function onWorkStarted(interactions, threadID) {
    var didCatchError = false;
    var caughtError = null;
    subscribers.forEach(function (subscriber) {
      try {
        subscriber.onWorkStarted(interactions, threadID);
      } catch (error) {
        if (!didCatchError) {
          didCatchError = true;
          caughtError = error;
        }
      }
    });

    if (didCatchError) {
      throw caughtError;
    }
  }

  function onWorkStopped(interactions, threadID) {
    var didCatchError = false;
    var caughtError = null;
    subscribers.forEach(function (subscriber) {
      try {
        subscriber.onWorkStopped(interactions, threadID);
      } catch (error) {
        if (!didCatchError) {
          didCatchError = true;
          caughtError = error;
        }
      }
    });

    if (didCatchError) {
      throw caughtError;
    }
  }

  function onWorkCanceled(interactions, threadID) {
    var didCatchError = false;
    var caughtError = null;
    subscribers.forEach(function (subscriber) {
      try {
        subscriber.onWorkCanceled(interactions, threadID);
      } catch (error) {
        if (!didCatchError) {
          didCatchError = true;
          caughtError = error;
        }
      }
    });

    if (didCatchError) {
      throw caughtError;
    }
  }