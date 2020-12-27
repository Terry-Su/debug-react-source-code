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
      firstBaseUpdate: null,
      lastBaseUpdate: null,
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
        firstBaseUpdate: currentQueue.firstBaseUpdate,
        lastBaseUpdate: currentQueue.lastBaseUpdate,
        shared: currentQueue.shared,
        effects: currentQueue.effects
      };
      workInProgress.updateQueue = clone;
    }
  }
  function createUpdate(eventTime, lane) {
    var update = {
      eventTime: eventTime,
      lane: lane,
      tag: UpdateState,
      payload: null,
      callback: null,
      next: null
    };
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
  function enqueueCapturedUpdate(workInProgress, capturedUpdate) {
    // Captured updates are updates that are thrown by a child during the render
    // phase. They should be discarded if the render is aborted. Therefore,
    // we should only put them on the work-in-progress queue, not the current one.
    var queue = workInProgress.updateQueue; // Check if the work-in-progress queue is a clone.

    var current = workInProgress.alternate;

    if (current !== null) {
      var currentQueue = current.updateQueue;

      if (queue === currentQueue) {
        // The work-in-progress queue is the same as current. This happens when
        // we bail out on a parent fiber that then captures an error thrown by
        // a child. Since we want to append the update only to the work-in
        // -progress queue, we need to clone the updates. We usually clone during
        // processUpdateQueue, but that didn't happen in this case because we
        // skipped over the parent when we bailed out.
        var newFirst = null;
        var newLast = null;
        var firstBaseUpdate = queue.firstBaseUpdate;

        if (firstBaseUpdate !== null) {
          // Loop through the updates and clone them.
          var update = firstBaseUpdate;

          do {
            var clone = {
              eventTime: update.eventTime,
              lane: update.lane,
              tag: update.tag,
              payload: update.payload,
              callback: update.callback,
              next: null
            };

            if (newLast === null) {
              newFirst = newLast = clone;
            } else {
              newLast.next = clone;
              newLast = clone;
            }

            update = update.next;
          } while (update !== null); // Append the captured update the end of the cloned list.


          if (newLast === null) {
            newFirst = newLast = capturedUpdate;
          } else {
            newLast.next = capturedUpdate;
            newLast = capturedUpdate;
          }
        } else {
          // There are no base updates.
          newFirst = newLast = capturedUpdate;
        }

        queue = {
          baseState: currentQueue.baseState,
          firstBaseUpdate: newFirst,
          lastBaseUpdate: newLast,
          shared: currentQueue.shared,
          effects: currentQueue.effects
        };
        workInProgress.updateQueue = queue;
        return;
      }
    } // Append the update to the end of the list.


    var lastBaseUpdate = queue.lastBaseUpdate;

    if (lastBaseUpdate === null) {
      queue.firstBaseUpdate = capturedUpdate;
    } else {
      lastBaseUpdate.next = capturedUpdate;
    }

    queue.lastBaseUpdate = capturedUpdate;
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
            }

            var nextState = payload.call(instance, prevState, nextProps);

            {
              if ( workInProgress.mode & StrictMode) {
                disableLogs();

                try {
                  payload.call(instance, prevState, nextProps);
                } finally {
                  reenableLogs();
                }
              }

              exitDisallowedContextReadInDEV();
            }

            return nextState;
          } // State object


          return payload;
        }

      case CaptureUpdate:
        {
          workInProgress.flags = workInProgress.flags & ~ShouldCapture | DidCapture;
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
            }

            partialState = _payload.call(instance, prevState, nextProps);

            {
              if ( workInProgress.mode & StrictMode) {
                disableLogs();

                try {
                  _payload.call(instance, prevState, nextProps);
                } finally {
                  reenableLogs();
                }
              }

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

  function processUpdateQueue(workInProgress, props, instance, renderLanes) {
    // This is always non-null on a ClassComponent or HostRoot
    var queue = workInProgress.updateQueue;
    hasForceUpdate = false;

    {
      currentlyProcessingQueue = queue.shared;
    }

    var firstBaseUpdate = queue.firstBaseUpdate;
    var lastBaseUpdate = queue.lastBaseUpdate; // Check if there are pending updates. If so, transfer them to the base queue.

    var pendingQueue = queue.shared.pending;

    if (pendingQueue !== null) {
      queue.shared.pending = null; // The pending queue is circular. Disconnect the pointer between first
      // and last so that it's non-circular.

      var lastPendingUpdate = pendingQueue;
      var firstPendingUpdate = lastPendingUpdate.next;
      lastPendingUpdate.next = null; // Append pending updates to base queue

      if (lastBaseUpdate === null) {
        firstBaseUpdate = firstPendingUpdate;
      } else {
        lastBaseUpdate.next = firstPendingUpdate;
      }

      lastBaseUpdate = lastPendingUpdate; // If there's a current queue, and it's different from the base queue, then
      // we need to transfer the updates to that queue, too. Because the base
      // queue is a singly-linked list with no cycles, we can append to both
      // lists and take advantage of structural sharing.
      // TODO: Pass `current` as argument

      var current = workInProgress.alternate;

      if (current !== null) {
        // This is always non-null on a ClassComponent or HostRoot
        var currentQueue = current.updateQueue;
        var currentLastBaseUpdate = currentQueue.lastBaseUpdate;

        if (currentLastBaseUpdate !== lastBaseUpdate) {
          if (currentLastBaseUpdate === null) {
            currentQueue.firstBaseUpdate = firstPendingUpdate;
          } else {
            currentLastBaseUpdate.next = firstPendingUpdate;
          }

          currentQueue.lastBaseUpdate = lastPendingUpdate;
        }
      }
    } // These values may change as we process the queue.


    if (firstBaseUpdate !== null) {
      // Iterate through the list of updates to compute the result.
      var newState = queue.baseState; // TODO: Don't need to accumulate this. Instead, we can remove renderLanes
      // from the original lanes.

      var newLanes = NoLanes;
      var newBaseState = null;
      var newFirstBaseUpdate = null;
      var newLastBaseUpdate = null;
      var update = firstBaseUpdate;

      do {
        var updateLane = update.lane;
        var updateEventTime = update.eventTime;

        if (!isSubsetOfLanes(renderLanes, updateLane)) {
          // Priority is insufficient. Skip this update. If this is the first
          // skipped update, the previous update/state is the new base
          // update/state.
          var clone = {
            eventTime: updateEventTime,
            lane: updateLane,
            tag: update.tag,
            payload: update.payload,
            callback: update.callback,
            next: null
          };

          if (newLastBaseUpdate === null) {
            newFirstBaseUpdate = newLastBaseUpdate = clone;
            newBaseState = newState;
          } else {
            newLastBaseUpdate = newLastBaseUpdate.next = clone;
          } // Update the remaining priority in the queue.


          newLanes = mergeLanes(newLanes, updateLane);
        } else {
          // This update does have sufficient priority.
          if (newLastBaseUpdate !== null) {
            var _clone = {
              eventTime: updateEventTime,
              // This update is going to be committed so we never want uncommit
              // it. Using NoLane works because 0 is a subset of all bitmasks, so
              // this will never be skipped by the check above.
              lane: NoLane,
              tag: update.tag,
              payload: update.payload,
              callback: update.callback,
              next: null
            };
            newLastBaseUpdate = newLastBaseUpdate.next = _clone;
          } // Process this update.


          newState = getStateFromUpdate(workInProgress, queue, update, newState, props, instance);
          var callback = update.callback;

          if (callback !== null) {
            workInProgress.flags |= Callback;
            var effects = queue.effects;

            if (effects === null) {
              queue.effects = [update];
            } else {
              effects.push(update);
            }
          }
        }

        update = update.next;

        if (update === null) {
          pendingQueue = queue.shared.pending;

          if (pendingQueue === null) {
            break;
          } else {
            // An update was scheduled from inside a reducer. Add the new
            // pending updates to the end of the list and keep processing.
            var _lastPendingUpdate = pendingQueue; // Intentionally unsound. Pending updates form a circular list, but we
            // unravel them when transferring them to the base queue.

            var _firstPendingUpdate = _lastPendingUpdate.next;
            _lastPendingUpdate.next = null;
            update = _firstPendingUpdate;
            queue.lastBaseUpdate = _lastPendingUpdate;
            queue.shared.pending = null;
          }
        }
      } while (true);

      if (newLastBaseUpdate === null) {
        newBaseState = newState;
      }

      queue.baseState = newBaseState;
      queue.firstBaseUpdate = newFirstBaseUpdate;
      queue.lastBaseUpdate = newLastBaseUpdate; // Set the remaining expiration time to be whatever is remaining in the queue.
      // This should be fine because the only two other things that contribute to
      // expiration time are props and context. We're already in the middle of the
      // begin phase by the time we start processing the queue, so we've already
      // dealt with the props. Context in components that specify
      // shouldComponentUpdate is tricky; but we'll have to account for
      // that regardless.

      markSkippedUpdateLanes(newLanes);
      workInProgress.lanes = newLanes;
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