  var UpdateState = 0;
  var ReplaceState = 1;
  var ForceUpdate = 2;
  var CaptureUpdate = 3; // Global state that is reset at the beginning of calling `processUpdateQueue`.
  // It should only be read right after calling `processUpdateQueue`, via
  // `checkHasForceUpdateAfterProcessing`.

  var hasForceUpdate = false;
  var didWarnUpdateInsideUpdate;
  var currentlyProcessingQueue;

  {
    didWarnUpdateInsideUpdate = false;
    currentlyProcessingQueue = null;
  }

  function initializeUpdateQueue(fiber) {
    var queue = {
      baseState: fiber.memoizedState,
      baseQueue: null,
      shared: {
        pending: null
      },
      effects: null
    };
    fiber.updateQueue = queue;
  }
  function cloneUpdateQueue(current, workInProgress) {
    // Clone the update queue from current. Unless it's already a clone.
    var queue = workInProgress.updateQueue;
    var currentQueue = current.updateQueue;

    if (queue === currentQueue) {
      var clone = {
        baseState: currentQueue.baseState,
        baseQueue: currentQueue.baseQueue,
        shared: currentQueue.shared,
        effects: currentQueue.effects
      };
      workInProgress.updateQueue = clone;
    }
  }
  function createUpdate(expirationTime, suspenseConfig) {
    var update = {
      expirationTime: expirationTime,
      suspenseConfig: suspenseConfig,
      tag: UpdateState,
      payload: null,
      callback: null,
      next: null
    };
    update.next = update;

    {
      update.priority = getCurrentPriorityLevel();
    }

    return update;
  }
  function enqueueUpdate(fiber, update) {
    var updateQueue = fiber.updateQueue;

    if (updateQueue === null) {
      // Only occurs if the fiber has been unmounted.
      return;
    }

    var sharedQueue = updateQueue.shared;
    var pending = sharedQueue.pending;

    if (pending === null) {
      // This is the first update. Create a circular list.
      update.next = update;
    } else {
      update.next = pending.next;
      pending.next = update;
    }

    sharedQueue.pending = update;

    {
      if (currentlyProcessingQueue === sharedQueue && !didWarnUpdateInsideUpdate) {
        error('An update (setState, replaceState, or forceUpdate) was scheduled ' + 'from inside an update function. Update functions should be pure, ' + 'with zero side-effects. Consider using componentDidUpdate or a ' + 'callback.');

        didWarnUpdateInsideUpdate = true;
      }
    }
  }
  function enqueueCapturedUpdate(workInProgress, update) {
    var current = workInProgress.alternate;

    if (current !== null) {
      // Ensure the work-in-progress queue is a clone
      cloneUpdateQueue(current, workInProgress);
    } // Captured updates go only on the work-in-progress queue.


    var queue = workInProgress.updateQueue; // Append the update to the end of the list.

    var last = queue.baseQueue;

    if (last === null) {
      queue.baseQueue = update.next = update;
      update.next = update;
    } else {
      update.next = last.next;
      last.next = update;
    }
  }

  function getStateFromUpdate(workInProgress, queue, update, prevState, nextProps, instance) {
    switch (update.tag) {
      case ReplaceState:
        {
          var payload = update.payload;

          if (typeof payload === 'function') {
            // Updater function
            {
              enterDisallowedContextReadInDEV();

              if ( workInProgress.mode & StrictMode) {
                payload.call(instance, prevState, nextProps);
              }
            }

            var nextState = payload.call(instance, prevState, nextProps);

            {
              exitDisallowedContextReadInDEV();
            }

            return nextState;
          } // State object


          return payload;
        }

      case CaptureUpdate:
        {
          workInProgress.effectTag = workInProgress.effectTag & ~ShouldCapture | DidCapture;
        }
      // Intentional fallthrough

      case UpdateState:
        {
          var _payload = update.payload;
          var partialState;

          if (typeof _payload === 'function') {
            // Updater function
            {
              enterDisallowedContextReadInDEV();

              if ( workInProgress.mode & StrictMode) {
                _payload.call(instance, prevState, nextProps);
              }
            }

            partialState = _payload.call(instance, prevState, nextProps);

            {
              exitDisallowedContextReadInDEV();
            }
          } else {
            // Partial state object
            partialState = _payload;
          }

          if (partialState === null || partialState === undefined) {
            // Null and undefined are treated as no-ops.
            return prevState;
          } // Merge the partial state and the previous state.


          return _assign({}, prevState, partialState);
        }

      case ForceUpdate:
        {
          hasForceUpdate = true;
          return prevState;
        }
    }

    return prevState;
  }

  function processUpdateQueue(workInProgress, props, instance, renderExpirationTime) {
    // This is always non-null on a ClassComponent or HostRoot
    var queue = workInProgress.updateQueue;
    hasForceUpdate = false;

    {
      currentlyProcessingQueue = queue.shared;
    } // The last rebase update that is NOT part of the base state.


    var baseQueue = queue.baseQueue; // The last pending update that hasn't been processed yet.

    var pendingQueue = queue.shared.pending;

    if (pendingQueue !== null) {
      // We have new updates that haven't been processed yet.
      // We'll add them to the base queue.
      if (baseQueue !== null) {
        // Merge the pending queue and the base queue.
        var baseFirst = baseQueue.next;
        var pendingFirst = pendingQueue.next;
        baseQueue.next = pendingFirst;
        pendingQueue.next = baseFirst;
      }

      baseQueue = pendingQueue;
      queue.shared.pending = null; // TODO: Pass `current` as argument

      var current = workInProgress.alternate;

      if (current !== null) {
        var currentQueue = current.updateQueue;

        if (currentQueue !== null) {
          currentQueue.baseQueue = pendingQueue;
        }
      }
    } // These values may change as we process the queue.


    if (baseQueue !== null) {
      var first = baseQueue.next; // Iterate through the list of updates to compute the result.

      var newState = queue.baseState;
      var newExpirationTime = NoWork;
      var newBaseState = null;
      var newBaseQueueFirst = null;
      var newBaseQueueLast = null;

      if (first !== null) {
        var update = first;

        do {
          var updateExpirationTime = update.expirationTime;

          if (updateExpirationTime < renderExpirationTime) {
            // Priority is insufficient. Skip this update. If this is the first
            // skipped update, the previous update/state is the new base
            // update/state.
            var clone = {
              expirationTime: update.expirationTime,
              suspenseConfig: update.suspenseConfig,
              tag: update.tag,
              payload: update.payload,
              callback: update.callback,
              next: null
            };

            if (newBaseQueueLast === null) {
              newBaseQueueFirst = newBaseQueueLast = clone;
              newBaseState = newState;
            } else {
              newBaseQueueLast = newBaseQueueLast.next = clone;
            } // Update the remaining priority in the queue.


            if (updateExpirationTime > newExpirationTime) {
              newExpirationTime = updateExpirationTime;
            }
          } else {
            // This update does have sufficient priority.
            if (newBaseQueueLast !== null) {
              var _clone = {
                expirationTime: Sync,
                // This update is going to be committed so we never want uncommit it.
                suspenseConfig: update.suspenseConfig,
                tag: update.tag,
                payload: update.payload,
                callback: update.callback,
                next: null
              };
              newBaseQueueLast = newBaseQueueLast.next = _clone;
            } // Mark the event time of this update as relevant to this render pass.
            // TODO: This should ideally use the true event time of this update rather than
            // its priority which is a derived and not reverseable value.
            // TODO: We should skip this update if it was already committed but currently
            // we have no way of detecting the difference between a committed and suspended
            // update here.


            markRenderEventTimeAndConfig(updateExpirationTime, update.suspenseConfig); // Process this update.

            newState = getStateFromUpdate(workInProgress, queue, update, newState, props, instance);
            var callback = update.callback;

            if (callback !== null) {
              workInProgress.effectTag |= Callback;
              var effects = queue.effects;

              if (effects === null) {
                queue.effects = [update];
              } else {
                effects.push(update);
              }
            }
          }

          update = update.next;

          if (update === null || update === first) {
            pendingQueue = queue.shared.pending;

            if (pendingQueue === null) {
              break;
            } else {
              // An update was scheduled from inside a reducer. Add the new
              // pending updates to the end of the list and keep processing.
              update = baseQueue.next = pendingQueue.next;
              pendingQueue.next = first;
              queue.baseQueue = baseQueue = pendingQueue;
              queue.shared.pending = null;
            }
          }
        } while (true);
      }

      if (newBaseQueueLast === null) {
        newBaseState = newState;
      } else {
        newBaseQueueLast.next = newBaseQueueFirst;
      }

      queue.baseState = newBaseState;
      queue.baseQueue = newBaseQueueLast; // Set the remaining expiration time to be whatever is remaining in the queue.
      // This should be fine because the only two other things that contribute to
      // expiration time are props and context. We're already in the middle of the
      // begin phase by the time we start processing the queue, so we've already
      // dealt with the props. Context in components that specify
      // shouldComponentUpdate is tricky; but we'll have to account for
      // that regardless.

      markUnprocessedUpdateTime(newExpirationTime);
      workInProgress.expirationTime = newExpirationTime;
      workInProgress.memoizedState = newState;
    }

    {
      currentlyProcessingQueue = null;
    }
  }

  function callCallback(callback, context) {
    if (!(typeof callback === 'function')) {
      {
        throw Error( "Invalid argument passed as callback. Expected a function. Instead received: " + callback );
      }
    }

    callback.call(context);
  }

  function resetHasForceUpdateBeforeProcessing() {
    hasForceUpdate = false;
  }
  function checkHasForceUpdateAfterProcessing() {
    return hasForceUpdate;
  }
  function commitUpdateQueue(finishedWork, finishedQueue, instance) {
    // Commit the effects
    var effects = finishedQueue.effects;
    finishedQueue.effects = null;

    if (effects !== null) {
      for (var i = 0; i < effects.length; i++) {
        var effect = effects[i];
        var callback = effect.callback;

        if (callback !== null) {
          effect.callback = null;
          callCallback(callback, instance);
        }
      }
    }
  }