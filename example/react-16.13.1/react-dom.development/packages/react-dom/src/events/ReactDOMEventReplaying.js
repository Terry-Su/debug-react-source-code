  var attemptSynchronousHydration;
  function setAttemptSynchronousHydration(fn) {
    attemptSynchronousHydration = fn;
  }
  var attemptUserBlockingHydration;
  function setAttemptUserBlockingHydration(fn) {
    attemptUserBlockingHydration = fn;
  }
  var attemptContinuousHydration;
  function setAttemptContinuousHydration(fn) {
    attemptContinuousHydration = fn;
  }
  var attemptHydrationAtCurrentPriority;
  function setAttemptHydrationAtCurrentPriority(fn) {
    attemptHydrationAtCurrentPriority = fn;
  } // TODO: Upgrade this definition once we're on a newer version of Flow that
  var hasScheduledReplayAttempt = false; // The queue of discrete events to be replayed.

  var queuedDiscreteEvents = []; // Indicates if any continuous event targets are non-null for early bailout.
  // if the last target was dehydrated.

  var queuedFocus = null;
  var queuedDrag = null;
  var queuedMouse = null; // For pointer events there can be one latest event per pointerId.

  var queuedPointers = new Map();
  var queuedPointerCaptures = new Map(); // We could consider replaying selectionchange and touchmoves too.

  var queuedExplicitHydrationTargets = [];
  function hasQueuedDiscreteEvents() {
    return queuedDiscreteEvents.length > 0;
  }
  var discreteReplayableEvents = [TOP_MOUSE_DOWN, TOP_MOUSE_UP, TOP_TOUCH_CANCEL, TOP_TOUCH_END, TOP_TOUCH_START, TOP_AUX_CLICK, TOP_DOUBLE_CLICK, TOP_POINTER_CANCEL, TOP_POINTER_DOWN, TOP_POINTER_UP, TOP_DRAG_END, TOP_DRAG_START, TOP_DROP, TOP_COMPOSITION_END, TOP_COMPOSITION_START, TOP_KEY_DOWN, TOP_KEY_PRESS, TOP_KEY_UP, TOP_INPUT, TOP_TEXT_INPUT, TOP_CLOSE, TOP_CANCEL, TOP_COPY, TOP_CUT, TOP_PASTE, TOP_CLICK, TOP_CHANGE, TOP_CONTEXT_MENU, TOP_RESET, TOP_SUBMIT];
  var continuousReplayableEvents = [TOP_FOCUS, TOP_BLUR, TOP_DRAG_ENTER, TOP_DRAG_LEAVE, TOP_MOUSE_OVER, TOP_MOUSE_OUT, TOP_POINTER_OVER, TOP_POINTER_OUT, TOP_GOT_POINTER_CAPTURE, TOP_LOST_POINTER_CAPTURE];
  function isReplayableDiscreteEvent(eventType) {
    return discreteReplayableEvents.indexOf(eventType) > -1;
  }

  function trapReplayableEventForDocument(topLevelType, document, listenerMap) {
    legacyListenToTopLevelEvent(topLevelType, document, listenerMap);
  }

  function eagerlyTrapReplayableEvents(container, document) {
    var listenerMapForDoc = getListenerMapForElement(document); // Discrete

    discreteReplayableEvents.forEach(function (topLevelType) {
      trapReplayableEventForDocument(topLevelType, document, listenerMapForDoc);
    }); // Continuous

    continuousReplayableEvents.forEach(function (topLevelType) {
      trapReplayableEventForDocument(topLevelType, document, listenerMapForDoc);
    });
  }

  function createQueuedReplayableEvent(blockedOn, topLevelType, eventSystemFlags, container, nativeEvent) {
    return {
      blockedOn: blockedOn,
      topLevelType: topLevelType,
      eventSystemFlags: eventSystemFlags | IS_REPLAYED,
      nativeEvent: nativeEvent,
      container: container
    };
  }

  function queueDiscreteEvent(blockedOn, topLevelType, eventSystemFlags, container, nativeEvent) {
    var queuedEvent = createQueuedReplayableEvent(blockedOn, topLevelType, eventSystemFlags, container, nativeEvent);
    queuedDiscreteEvents.push(queuedEvent);

    {
      if (queuedDiscreteEvents.length === 1) {
        // If this was the first discrete event, we might be able to
        // synchronously unblock it so that preventDefault still works.
        while (queuedEvent.blockedOn !== null) {
          var _fiber = getInstanceFromNode$1(queuedEvent.blockedOn);

          if (_fiber === null) {
            break;
          }

          attemptSynchronousHydration(_fiber);

          if (queuedEvent.blockedOn === null) {
            // We got unblocked by hydration. Let's try again.
            replayUnblockedEvents(); // If we're reblocked, on an inner boundary, we might need
            // to attempt hydrating that one.

            continue;
          } else {
            // We're still blocked from hydration, we have to give up
            // and replay later.
            break;
          }
        }
      }
    }
  } // Resets the replaying for this type of continuous event to no event.

  function clearIfContinuousEvent(topLevelType, nativeEvent) {
    switch (topLevelType) {
      case TOP_FOCUS:
      case TOP_BLUR:
        queuedFocus = null;
        break;

      case TOP_DRAG_ENTER:
      case TOP_DRAG_LEAVE:
        queuedDrag = null;
        break;

      case TOP_MOUSE_OVER:
      case TOP_MOUSE_OUT:
        queuedMouse = null;
        break;

      case TOP_POINTER_OVER:
      case TOP_POINTER_OUT:
        {
          var pointerId = nativeEvent.pointerId;
          queuedPointers.delete(pointerId);
          break;
        }

      case TOP_GOT_POINTER_CAPTURE:
      case TOP_LOST_POINTER_CAPTURE:
        {
          var _pointerId = nativeEvent.pointerId;
          queuedPointerCaptures.delete(_pointerId);
          break;
        }
    }
  }

  function accumulateOrCreateContinuousQueuedReplayableEvent(existingQueuedEvent, blockedOn, topLevelType, eventSystemFlags, container, nativeEvent) {
    if (existingQueuedEvent === null || existingQueuedEvent.nativeEvent !== nativeEvent) {
      var queuedEvent = createQueuedReplayableEvent(blockedOn, topLevelType, eventSystemFlags, container, nativeEvent);

      if (blockedOn !== null) {
        var _fiber2 = getInstanceFromNode$1(blockedOn);

        if (_fiber2 !== null) {
          // Attempt to increase the priority of this target.
          attemptContinuousHydration(_fiber2);
        }
      }

      return queuedEvent;
    } // If we have already queued this exact event, then it's because
    // the different event systems have different DOM event listeners.
    // We can accumulate the flags and store a single event to be
    // replayed.


    existingQueuedEvent.eventSystemFlags |= eventSystemFlags;
    return existingQueuedEvent;
  }

  function queueIfContinuousEvent(blockedOn, topLevelType, eventSystemFlags, container, nativeEvent) {
    // These set relatedTarget to null because the replayed event will be treated as if we
    // moved from outside the window (no target) onto the target once it hydrates.
    // Instead of mutating we could clone the event.
    switch (topLevelType) {
      case TOP_FOCUS:
        {
          var focusEvent = nativeEvent;
          queuedFocus = accumulateOrCreateContinuousQueuedReplayableEvent(queuedFocus, blockedOn, topLevelType, eventSystemFlags, container, focusEvent);
          return true;
        }

      case TOP_DRAG_ENTER:
        {
          var dragEvent = nativeEvent;
          queuedDrag = accumulateOrCreateContinuousQueuedReplayableEvent(queuedDrag, blockedOn, topLevelType, eventSystemFlags, container, dragEvent);
          return true;
        }

      case TOP_MOUSE_OVER:
        {
          var mouseEvent = nativeEvent;
          queuedMouse = accumulateOrCreateContinuousQueuedReplayableEvent(queuedMouse, blockedOn, topLevelType, eventSystemFlags, container, mouseEvent);
          return true;
        }

      case TOP_POINTER_OVER:
        {
          var pointerEvent = nativeEvent;
          var pointerId = pointerEvent.pointerId;
          queuedPointers.set(pointerId, accumulateOrCreateContinuousQueuedReplayableEvent(queuedPointers.get(pointerId) || null, blockedOn, topLevelType, eventSystemFlags, container, pointerEvent));
          return true;
        }

      case TOP_GOT_POINTER_CAPTURE:
        {
          var _pointerEvent = nativeEvent;
          var _pointerId2 = _pointerEvent.pointerId;
          queuedPointerCaptures.set(_pointerId2, accumulateOrCreateContinuousQueuedReplayableEvent(queuedPointerCaptures.get(_pointerId2) || null, blockedOn, topLevelType, eventSystemFlags, container, _pointerEvent));
          return true;
        }
    }

    return false;
  } // Check if this target is unblocked. Returns true if it's unblocked.

  function attemptExplicitHydrationTarget(queuedTarget) {
    // TODO: This function shares a lot of logic with attemptToDispatchEvent.
    // Try to unify them. It's a bit tricky since it would require two return
    // values.
    var targetInst = getClosestInstanceFromNode(queuedTarget.target);

    if (targetInst !== null) {
      var nearestMounted = getNearestMountedFiber(targetInst);

      if (nearestMounted !== null) {
        var tag = nearestMounted.tag;

        if (tag === SuspenseComponent) {
          var instance = getSuspenseInstanceFromFiber(nearestMounted);

          if (instance !== null) {
            // We're blocked on hydrating this boundary.
            // Increase its priority.
            queuedTarget.blockedOn = instance;
            unstable_runWithPriority(queuedTarget.priority, function () {
              attemptHydrationAtCurrentPriority(nearestMounted);
            });
            return;
          }
        } else if (tag === HostRoot) {
          var root = nearestMounted.stateNode;

          if (root.hydrate) {
            queuedTarget.blockedOn = getContainerFromFiber(nearestMounted); // We don't currently have a way to increase the priority of
            // a root other than sync.

            return;
          }
        }
      }
    }

    queuedTarget.blockedOn = null;
  }

  function queueExplicitHydrationTarget(target) {
    {
      var priority = unstable_getCurrentPriorityLevel();
      var queuedTarget = {
        blockedOn: null,
        target: target,
        priority: priority
      };
      var i = 0;

      for (; i < queuedExplicitHydrationTargets.length; i++) {
        if (priority <= queuedExplicitHydrationTargets[i].priority) {
          break;
        }
      }

      queuedExplicitHydrationTargets.splice(i, 0, queuedTarget);

      if (i === 0) {
        attemptExplicitHydrationTarget(queuedTarget);
      }
    }
  }

  function attemptReplayContinuousQueuedEvent(queuedEvent) {
    if (queuedEvent.blockedOn !== null) {
      return false;
    }

    var nextBlockedOn = attemptToDispatchEvent(queuedEvent.topLevelType, queuedEvent.eventSystemFlags, queuedEvent.container, queuedEvent.nativeEvent);

    if (nextBlockedOn !== null) {
      // We're still blocked. Try again later.
      var _fiber3 = getInstanceFromNode$1(nextBlockedOn);

      if (_fiber3 !== null) {
        attemptContinuousHydration(_fiber3);
      }

      queuedEvent.blockedOn = nextBlockedOn;
      return false;
    }

    return true;
  }

  function attemptReplayContinuousQueuedEventInMap(queuedEvent, key, map) {
    if (attemptReplayContinuousQueuedEvent(queuedEvent)) {
      map.delete(key);
    }
  }

  function replayUnblockedEvents() {
    hasScheduledReplayAttempt = false; // First replay discrete events.

    while (queuedDiscreteEvents.length > 0) {
      var nextDiscreteEvent = queuedDiscreteEvents[0];

      if (nextDiscreteEvent.blockedOn !== null) {
        // We're still blocked.
        // Increase the priority of this boundary to unblock
        // the next discrete event.
        var _fiber4 = getInstanceFromNode$1(nextDiscreteEvent.blockedOn);

        if (_fiber4 !== null) {
          attemptUserBlockingHydration(_fiber4);
        }

        break;
      }

      var nextBlockedOn = attemptToDispatchEvent(nextDiscreteEvent.topLevelType, nextDiscreteEvent.eventSystemFlags, nextDiscreteEvent.container, nextDiscreteEvent.nativeEvent);

      if (nextBlockedOn !== null) {
        // We're still blocked. Try again later.
        nextDiscreteEvent.blockedOn = nextBlockedOn;
      } else {
        // We've successfully replayed the first event. Let's try the next one.
        queuedDiscreteEvents.shift();
      }
    } // Next replay any continuous events.


    if (queuedFocus !== null && attemptReplayContinuousQueuedEvent(queuedFocus)) {
      queuedFocus = null;
    }

    if (queuedDrag !== null && attemptReplayContinuousQueuedEvent(queuedDrag)) {
      queuedDrag = null;
    }

    if (queuedMouse !== null && attemptReplayContinuousQueuedEvent(queuedMouse)) {
      queuedMouse = null;
    }

    queuedPointers.forEach(attemptReplayContinuousQueuedEventInMap);
    queuedPointerCaptures.forEach(attemptReplayContinuousQueuedEventInMap);
  }

  function scheduleCallbackIfUnblocked(queuedEvent, unblocked) {
    if (queuedEvent.blockedOn === unblocked) {
      queuedEvent.blockedOn = null;

      if (!hasScheduledReplayAttempt) {
        hasScheduledReplayAttempt = true; // Schedule a callback to attempt replaying as many events as are
        // now unblocked. This first might not actually be unblocked yet.
        // We could check it early to avoid scheduling an unnecessary callback.

        unstable_scheduleCallback(unstable_NormalPriority, replayUnblockedEvents);
      }
    }
  }

  function retryIfBlockedOn(unblocked) {
    // Mark anything that was blocked on this as no longer blocked
    // and eligible for a replay.
    if (queuedDiscreteEvents.length > 0) {
      scheduleCallbackIfUnblocked(queuedDiscreteEvents[0], unblocked); // This is a exponential search for each boundary that commits. I think it's
      // worth it because we expect very few discrete events to queue up and once
      // we are actually fully unblocked it will be fast to replay them.

      for (var i = 1; i < queuedDiscreteEvents.length; i++) {
        var queuedEvent = queuedDiscreteEvents[i];

        if (queuedEvent.blockedOn === unblocked) {
          queuedEvent.blockedOn = null;
        }
      }
    }

    if (queuedFocus !== null) {
      scheduleCallbackIfUnblocked(queuedFocus, unblocked);
    }

    if (queuedDrag !== null) {
      scheduleCallbackIfUnblocked(queuedDrag, unblocked);
    }

    if (queuedMouse !== null) {
      scheduleCallbackIfUnblocked(queuedMouse, unblocked);
    }

    var unblock = function (queuedEvent) {
      return scheduleCallbackIfUnblocked(queuedEvent, unblocked);
    };

    queuedPointers.forEach(unblock);
    queuedPointerCaptures.forEach(unblock);

    for (var _i = 0; _i < queuedExplicitHydrationTargets.length; _i++) {
      var queuedTarget = queuedExplicitHydrationTargets[_i];

      if (queuedTarget.blockedOn === unblocked) {
        queuedTarget.blockedOn = null;
      }
    }

    while (queuedExplicitHydrationTargets.length > 0) {
      var nextExplicitTarget = queuedExplicitHydrationTargets[0];

      if (nextExplicitTarget.blockedOn !== null) {
        // We're still blocked.
        break;
      } else {
        attemptExplicitHydrationTarget(nextExplicitTarget);

        if (nextExplicitTarget.blockedOn === null) {
          // We're unblocked.
          queuedExplicitHydrationTargets.shift();
        }
      }
    }
  }