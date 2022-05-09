
  var _attemptSynchronousHydration;

  function setAttemptSynchronousHydration(fn) {
    _attemptSynchronousHydration = fn;
  }
  function attemptSynchronousHydration(fiber) {
    _attemptSynchronousHydration(fiber);
  }
  var attemptContinuousHydration;
  function setAttemptContinuousHydration(fn) {
    attemptContinuousHydration = fn;
  }
  var attemptHydrationAtCurrentPriority;
  function setAttemptHydrationAtCurrentPriority(fn) {
    attemptHydrationAtCurrentPriority = fn;
  }
  var getCurrentUpdatePriority$1;
  function setGetCurrentUpdatePriority(fn) {
    getCurrentUpdatePriority$1 = fn;
  }
  var attemptHydrationAtPriority;
  function setAttemptHydrationAtPriority(fn) {
    attemptHydrationAtPriority = fn;
  } // TODO: Upgrade this definition once we're on a newer version of Flow that
  // has this definition built-in.

  var hasScheduledReplayAttempt = false; // The queue of discrete events to be replayed.

  var queuedDiscreteEvents = []; // Indicates if any continuous event targets are non-null for early bailout.
  // if the last target was dehydrated.

  var queuedFocus = null;
  var queuedDrag = null;
  var queuedMouse = null; // For pointer events there can be one latest event per pointerId.

  var queuedPointers = new Map();
  var queuedPointerCaptures = new Map(); // We could consider replaying selectionchange and touchmoves too.

  var queuedExplicitHydrationTargets = [];
  var discreteReplayableEvents = ['mousedown', 'mouseup', 'touchcancel', 'touchend', 'touchstart', 'auxclick', 'dblclick', 'pointercancel', 'pointerdown', 'pointerup', 'dragend', 'dragstart', 'drop', 'compositionend', 'compositionstart', 'keydown', 'keypress', 'keyup', 'input', 'textInput', // Intentionally camelCase
  'copy', 'cut', 'paste', 'click', 'change', 'contextmenu', 'reset', 'submit'];
  function isDiscreteEventThatRequiresHydration(eventType) {
    return discreteReplayableEvents.indexOf(eventType) > -1;
  }

  function createQueuedReplayableEvent(blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent) {
    return {
      blockedOn: blockedOn,
      domEventName: domEventName,
      eventSystemFlags: eventSystemFlags,
      nativeEvent: nativeEvent,
      targetContainers: [targetContainer]
    };
  }

  function clearIfContinuousEvent(domEventName, nativeEvent) {
    switch (domEventName) {
      case 'focusin':
      case 'focusout':
        queuedFocus = null;
        break;

      case 'dragenter':
      case 'dragleave':
        queuedDrag = null;
        break;

      case 'mouseover':
      case 'mouseout':
        queuedMouse = null;
        break;

      case 'pointerover':
      case 'pointerout':
        {
          var pointerId = nativeEvent.pointerId;
          queuedPointers.delete(pointerId);
          break;
        }

      case 'gotpointercapture':
      case 'lostpointercapture':
        {
          var _pointerId = nativeEvent.pointerId;
          queuedPointerCaptures.delete(_pointerId);
          break;
        }
    }
  }

  function accumulateOrCreateContinuousQueuedReplayableEvent(existingQueuedEvent, blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent) {
    if (existingQueuedEvent === null || existingQueuedEvent.nativeEvent !== nativeEvent) {
      var queuedEvent = createQueuedReplayableEvent(blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent);

      if (blockedOn !== null) {
        var _fiber2 = getInstanceFromNode(blockedOn);

        if (_fiber2 !== null) {
          // Attempt to increase the priority of this target.
          attemptContinuousHydration(_fiber2);
        }
      }

      return queuedEvent;
    } // If we have already queued this exact event, then it's because
    // the different event systems have different DOM event listeners.
    // We can accumulate the flags, and the targetContainers, and
    // store a single event to be replayed.


    existingQueuedEvent.eventSystemFlags |= eventSystemFlags;
    var targetContainers = existingQueuedEvent.targetContainers;

    if (targetContainer !== null && targetContainers.indexOf(targetContainer) === -1) {
      targetContainers.push(targetContainer);
    }

    return existingQueuedEvent;
  }

  function queueIfContinuousEvent(blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent) {
    // These set relatedTarget to null because the replayed event will be treated as if we
    // moved from outside the window (no target) onto the target once it hydrates.
    // Instead of mutating we could clone the event.
    switch (domEventName) {
      case 'focusin':
        {
          var focusEvent = nativeEvent;
          queuedFocus = accumulateOrCreateContinuousQueuedReplayableEvent(queuedFocus, blockedOn, domEventName, eventSystemFlags, targetContainer, focusEvent);
          return true;
        }

      case 'dragenter':
        {
          var dragEvent = nativeEvent;
          queuedDrag = accumulateOrCreateContinuousQueuedReplayableEvent(queuedDrag, blockedOn, domEventName, eventSystemFlags, targetContainer, dragEvent);
          return true;
        }

      case 'mouseover':
        {
          var mouseEvent = nativeEvent;
          queuedMouse = accumulateOrCreateContinuousQueuedReplayableEvent(queuedMouse, blockedOn, domEventName, eventSystemFlags, targetContainer, mouseEvent);
          return true;
        }

      case 'pointerover':
        {
          var pointerEvent = nativeEvent;
          var pointerId = pointerEvent.pointerId;
          queuedPointers.set(pointerId, accumulateOrCreateContinuousQueuedReplayableEvent(queuedPointers.get(pointerId) || null, blockedOn, domEventName, eventSystemFlags, targetContainer, pointerEvent));
          return true;
        }

      case 'gotpointercapture':
        {
          var _pointerEvent = nativeEvent;
          var _pointerId2 = _pointerEvent.pointerId;
          queuedPointerCaptures.set(_pointerId2, accumulateOrCreateContinuousQueuedReplayableEvent(queuedPointerCaptures.get(_pointerId2) || null, blockedOn, domEventName, eventSystemFlags, targetContainer, _pointerEvent));
          return true;
        }
    }

    return false;
  } // Check if this target is unblocked. Returns true if it's unblocked.

  function attemptExplicitHydrationTarget(queuedTarget) {
    // TODO: This function shares a lot of logic with findInstanceBlockingEvent.
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
            attemptHydrationAtPriority(queuedTarget.priority, function () {
              attemptHydrationAtCurrentPriority(nearestMounted);
            });
            return;
          }
        } else if (tag === HostRoot) {
          var root = nearestMounted.stateNode;

          if (isRootDehydrated(root)) {
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
    // TODO: This will read the priority if it's dispatched by the React
    // event system but not native events. Should read window.event.type, like
    // we do for updates (getCurrentEventPriority).
    var updatePriority = getCurrentUpdatePriority$1();
    var queuedTarget = {
      blockedOn: null,
      target: target,
      priority: updatePriority
    };
    var i = 0;

    for (; i < queuedExplicitHydrationTargets.length; i++) {
      // Stop once we hit the first target with lower priority than
      if (!isHigherEventPriority(updatePriority, queuedExplicitHydrationTargets[i].priority)) {
        break;
      }
    }

    queuedExplicitHydrationTargets.splice(i, 0, queuedTarget);

    if (i === 0) {
      attemptExplicitHydrationTarget(queuedTarget);
    }
  }

  function attemptReplayContinuousQueuedEvent(queuedEvent) {
    if (queuedEvent.blockedOn !== null) {
      return false;
    }

    var targetContainers = queuedEvent.targetContainers;

    while (targetContainers.length > 0) {
      var targetContainer = targetContainers[0];
      var nextBlockedOn = findInstanceBlockingEvent(queuedEvent.domEventName, queuedEvent.eventSystemFlags, targetContainer, queuedEvent.nativeEvent);

      if (nextBlockedOn === null) {
        {
          var nativeEvent = queuedEvent.nativeEvent;
          var nativeEventClone = new nativeEvent.constructor(nativeEvent.type, nativeEvent);
          setReplayingEvent(nativeEventClone);
          nativeEvent.target.dispatchEvent(nativeEventClone);
          resetReplayingEvent();
        }
      } else {
        // We're still blocked. Try again later.
        var _fiber3 = getInstanceFromNode(nextBlockedOn);

        if (_fiber3 !== null) {
          attemptContinuousHydration(_fiber3);
        }

        queuedEvent.blockedOn = nextBlockedOn;
        return false;
      } // This target container was successfully dispatched. Try the next.


      targetContainers.shift();
    }

    return true;
  }

  function attemptReplayContinuousQueuedEventInMap(queuedEvent, key, map) {
    if (attemptReplayContinuousQueuedEvent(queuedEvent)) {
      map.delete(key);
    }
  }

  function replayUnblockedEvents() {
    hasScheduledReplayAttempt = false;


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