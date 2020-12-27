
  function registerEvents$2() {
    registerDirectEvent('onMouseEnter', ['mouseout', 'mouseover']);
    registerDirectEvent('onMouseLeave', ['mouseout', 'mouseover']);
    registerDirectEvent('onPointerEnter', ['pointerout', 'pointerover']);
    registerDirectEvent('onPointerLeave', ['pointerout', 'pointerover']);
  }
  /**
   * For almost every interaction we care about, there will be both a top-level
   * `mouseover` and `mouseout` event that occurs. Only use `mouseout` so that
   * we do not extract duplicate events. However, moving the mouse into the
   * browser from outside will not fire a `mouseout` event. In this case, we use
   * the `mouseover` top-level event.
   */


  function extractEvents$2(dispatchQueue, domEventName, targetInst, nativeEvent, nativeEventTarget, eventSystemFlags, targetContainer) {
    var isOverEvent = domEventName === 'mouseover' || domEventName === 'pointerover';
    var isOutEvent = domEventName === 'mouseout' || domEventName === 'pointerout';

    if (isOverEvent && (eventSystemFlags & IS_REPLAYED) === 0) {
      // If this is an over event with a target, we might have already dispatched
      // the event in the out event of the other target. If this is replayed,
      // then it's because we couldn't dispatch against this target previously
      // so we have to do it now instead.
      var related = nativeEvent.relatedTarget || nativeEvent.fromElement;

      if (related) {
        // If the related node is managed by React, we can assume that we have
        // already dispatched the corresponding events during its mouseout.
        if (getClosestInstanceFromNode(related) || isContainerMarkedAsRoot(related)) {
          return;
        }
      }
    }

    if (!isOutEvent && !isOverEvent) {
      // Must not be a mouse or pointer in or out - ignoring.
      return;
    }

    var win; // TODO: why is this nullable in the types but we read from it?

    if (nativeEventTarget.window === nativeEventTarget) {
      // `nativeEventTarget` is probably a window object.
      win = nativeEventTarget;
    } else {
      // TODO: Figure out why `ownerDocument` is sometimes undefined in IE8.
      var doc = nativeEventTarget.ownerDocument;

      if (doc) {
        win = doc.defaultView || doc.parentWindow;
      } else {
        win = window;
      }
    }

    var from;
    var to;

    if (isOutEvent) {
      var _related = nativeEvent.relatedTarget || nativeEvent.toElement;

      from = targetInst;
      to = _related ? getClosestInstanceFromNode(_related) : null;

      if (to !== null) {
        var nearestMounted = getNearestMountedFiber(to);

        if (to !== nearestMounted || to.tag !== HostComponent && to.tag !== HostText) {
          to = null;
        }
      }
    } else {
      // Moving to a node from outside the window.
      from = null;
      to = targetInst;
    }

    if (from === to) {
      // Nothing pertains to our managed components.
      return;
    }

    var SyntheticEventCtor = SyntheticMouseEvent;
    var leaveEventType = 'onMouseLeave';
    var enterEventType = 'onMouseEnter';
    var eventTypePrefix = 'mouse';

    if (domEventName === 'pointerout' || domEventName === 'pointerover') {
      SyntheticEventCtor = SyntheticPointerEvent;
      leaveEventType = 'onPointerLeave';
      enterEventType = 'onPointerEnter';
      eventTypePrefix = 'pointer';
    }

    var fromNode = from == null ? win : getNodeFromInstance(from);
    var toNode = to == null ? win : getNodeFromInstance(to);
    var leave = new SyntheticEventCtor(leaveEventType, eventTypePrefix + 'leave', from, nativeEvent, nativeEventTarget);
    leave.target = fromNode;
    leave.relatedTarget = toNode;
    var enter = null; // We should only process this nativeEvent if we are processing
    // the first ancestor. Next time, we will ignore the event.

    var nativeTargetInst = getClosestInstanceFromNode(nativeEventTarget);

    if (nativeTargetInst === targetInst) {
      var enterEvent = new SyntheticEventCtor(enterEventType, eventTypePrefix + 'enter', to, nativeEvent, nativeEventTarget);
      enterEvent.target = toNode;
      enterEvent.relatedTarget = fromNode;
      enter = enterEvent;
    }

    accumulateEnterLeaveTwoPhaseListeners(dispatchQueue, leave, enter, from, to);
  }