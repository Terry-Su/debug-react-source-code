  var UserBlockingPriority$1 = unstable_UserBlockingPriority,
      runWithPriority = unstable_runWithPriority; // TODO: can we stop exporting these?

  var _enabled = true; // This is exported in FB builds for use by legacy FB layer infra.
  // We'd like to remove this but it's not clear if this is safe.

  function setEnabled(enabled) {
    _enabled = !!enabled;
  }
  function isEnabled() {
    return _enabled;
  }
  function createEventListenerWrapperWithPriority(targetContainer, domEventName, eventSystemFlags) {
    var eventPriority = getEventPriorityForPluginSystem(domEventName);
    var listenerWrapper;

    switch (eventPriority) {
      case DiscreteEvent:
        listenerWrapper = dispatchDiscreteEvent;
        break;

      case UserBlockingEvent:
        listenerWrapper = dispatchUserBlockingUpdate;
        break;

      case ContinuousEvent:
      default:
        listenerWrapper = dispatchEvent;
        break;
    }

    return listenerWrapper.bind(null, domEventName, eventSystemFlags, targetContainer);
  }

  function dispatchDiscreteEvent(domEventName, eventSystemFlags, container, nativeEvent) {
    {
      flushDiscreteUpdatesIfNeeded(nativeEvent.timeStamp);
    }

    discreteUpdates(dispatchEvent, domEventName, eventSystemFlags, container, nativeEvent);
  }

  function dispatchUserBlockingUpdate(domEventName, eventSystemFlags, container, nativeEvent) {
    {
      runWithPriority(UserBlockingPriority$1, dispatchEvent.bind(null, domEventName, eventSystemFlags, container, nativeEvent));
    }
  }

  function dispatchEvent(domEventName, eventSystemFlags, targetContainer, nativeEvent) {
    if (!_enabled) {
      return;
    }

    var allowReplay = true;

    {
      // TODO: replaying capture phase events is currently broken
      // because we used to do it during top-level native bubble handlers
      // but now we use different bubble and capture handlers.
      // In eager mode, we attach capture listeners early, so we need
      // to filter them out until we fix the logic to handle them correctly.
      // This could've been outside the flag but I put it inside to reduce risk.
      allowReplay = (eventSystemFlags & IS_CAPTURE_PHASE) === 0;
    }

    if (allowReplay && hasQueuedDiscreteEvents() && isReplayableDiscreteEvent(domEventName)) {
      // If we already have a queue of discrete events, and this is another discrete
      // event, then we can't dispatch it regardless of its target, since they
      // need to dispatch in order.
      queueDiscreteEvent(null, // Flags that we're not actually blocked on anything as far as we know.
      domEventName, eventSystemFlags, targetContainer, nativeEvent);
      return;
    }

    var blockedOn = attemptToDispatchEvent(domEventName, eventSystemFlags, targetContainer, nativeEvent);

    if (blockedOn === null) {
      // We successfully dispatched this event.
      if (allowReplay) {
        clearIfContinuousEvent(domEventName, nativeEvent);
      }

      return;
    }

    if (allowReplay) {
      if (isReplayableDiscreteEvent(domEventName)) {
        // This this to be replayed later once the target is available.
        queueDiscreteEvent(blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent);
        return;
      }

      if (queueIfContinuousEvent(blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent)) {
        return;
      } // We need to clear only if we didn't queue because
      // queueing is accummulative.


      clearIfContinuousEvent(domEventName, nativeEvent);
    } // This is not replayable so we'll invoke it but without a target,
    // in case the event system needs to trace it.


    dispatchEventForPluginEventSystem(domEventName, eventSystemFlags, nativeEvent, null, targetContainer);
  } // Attempt dispatching an event. Returns a SuspenseInstance or Container if it's blocked.

  function attemptToDispatchEvent(domEventName, eventSystemFlags, targetContainer, nativeEvent) {
    // TODO: Warn if _enabled is false.
    var nativeEventTarget = getEventTarget(nativeEvent);
    var targetInst = getClosestInstanceFromNode(nativeEventTarget);

    if (targetInst !== null) {
      var nearestMounted = getNearestMountedFiber(targetInst);

      if (nearestMounted === null) {
        // This tree has been unmounted already. Dispatch without a target.
        targetInst = null;
      } else {
        var tag = nearestMounted.tag;

        if (tag === SuspenseComponent) {
          var instance = getSuspenseInstanceFromFiber(nearestMounted);

          if (instance !== null) {
            // Queue the event to be replayed later. Abort dispatching since we
            // don't want this event dispatched twice through the event system.
            // TODO: If this is the first discrete event in the queue. Schedule an increased
            // priority for this boundary.
            return instance;
          } // This shouldn't happen, something went wrong but to avoid blocking
          // the whole system, dispatch the event without a target.
          // TODO: Warn.


          targetInst = null;
        } else if (tag === HostRoot) {
          var root = nearestMounted.stateNode;

          if (root.hydrate) {
            // If this happens during a replay something went wrong and it might block
            // the whole system.
            return getContainerFromFiber(nearestMounted);
          }

          targetInst = null;
        } else if (nearestMounted !== targetInst) {
          // If we get an event (ex: img onload) before committing that
          // component's mount, ignore it for now (that is, treat it as if it was an
          // event on a non-React tree). We might also consider queueing events and
          // dispatching them after the mount.
          targetInst = null;
        }
      }
    }

    dispatchEventForPluginEventSystem(domEventName, eventSystemFlags, nativeEvent, targetInst, targetContainer); // We're not blocked on anything.

    return null;
  }