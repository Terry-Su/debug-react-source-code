  var eventTypes$2 = {
    mouseEnter: {
      registrationName: 'onMouseEnter',
      dependencies: [TOP_MOUSE_OUT, TOP_MOUSE_OVER]
    },
    mouseLeave: {
      registrationName: 'onMouseLeave',
      dependencies: [TOP_MOUSE_OUT, TOP_MOUSE_OVER]
    },
    pointerEnter: {
      registrationName: 'onPointerEnter',
      dependencies: [TOP_POINTER_OUT, TOP_POINTER_OVER]
    },
    pointerLeave: {
      registrationName: 'onPointerLeave',
      dependencies: [TOP_POINTER_OUT, TOP_POINTER_OVER]
    }
  };
  var EnterLeaveEventPlugin = {
    eventTypes: eventTypes$2,

    /**
     * For almost every interaction we care about, there will be both a top-level
     * `mouseover` and `mouseout` event that occurs. Only use `mouseout` so that
     * we do not extract duplicate events. However, moving the mouse into the
     * browser from outside will not fire a `mouseout` event. In this case, we use
     * the `mouseover` top-level event.
     */
    extractEvents: function (topLevelType, targetInst, nativeEvent, nativeEventTarget, eventSystemFlags) {
      var isOverEvent = topLevelType === TOP_MOUSE_OVER || topLevelType === TOP_POINTER_OVER;
      var isOutEvent = topLevelType === TOP_MOUSE_OUT || topLevelType === TOP_POINTER_OUT;

      if (isOverEvent && (eventSystemFlags & IS_REPLAYED) === 0 && (nativeEvent.relatedTarget || nativeEvent.fromElement)) {
        // If this is an over event with a target, then we've already dispatched
        // the event in the out event of the other target. If this is replayed,
        // then it's because we couldn't dispatch against this target previously
        // so we have to do it now instead.
        return null;
      }

      if (!isOutEvent && !isOverEvent) {
        // Must not be a mouse or pointer in or out - ignoring.
        return null;
      }

      var win;

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
        from = targetInst;
        var related = nativeEvent.relatedTarget || nativeEvent.toElement;
        to = related ? getClosestInstanceFromNode(related) : null;

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
        return null;
      }

      var eventInterface, leaveEventType, enterEventType, eventTypePrefix;

      if (topLevelType === TOP_MOUSE_OUT || topLevelType === TOP_MOUSE_OVER) {
        eventInterface = SyntheticMouseEvent;
        leaveEventType = eventTypes$2.mouseLeave;
        enterEventType = eventTypes$2.mouseEnter;
        eventTypePrefix = 'mouse';
      } else if (topLevelType === TOP_POINTER_OUT || topLevelType === TOP_POINTER_OVER) {
        eventInterface = SyntheticPointerEvent;
        leaveEventType = eventTypes$2.pointerLeave;
        enterEventType = eventTypes$2.pointerEnter;
        eventTypePrefix = 'pointer';
      }

      var fromNode = from == null ? win : getNodeFromInstance$1(from);
      var toNode = to == null ? win : getNodeFromInstance$1(to);
      var leave = eventInterface.getPooled(leaveEventType, from, nativeEvent, nativeEventTarget);
      leave.type = eventTypePrefix + 'leave';
      leave.target = fromNode;
      leave.relatedTarget = toNode;
      var enter = eventInterface.getPooled(enterEventType, to, nativeEvent, nativeEventTarget);
      enter.type = eventTypePrefix + 'enter';
      enter.target = toNode;
      enter.relatedTarget = fromNode;
      accumulateEnterLeaveDispatches(leave, enter, from, to); // If we are not processing the first ancestor, then we
      // should not process the same nativeEvent again, as we
      // will have already processed it in the first ancestor.

      if ((eventSystemFlags & IS_FIRST_ANCESTOR) === 0) {
        return [leave];
      }

      return [leave, enter];
    }
  };