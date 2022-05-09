  var topLevelEventsToReactNames = new Map(); // NOTE: Capitalization is important in this list!
  //
  // E.g. it needs "pointerDown", not "pointerdown".
  // This is because we derive both React name ("onPointerDown")
  // and DOM name ("pointerdown") from the same list.
  //
  // Exceptions that don't match this convention are listed separately.
  //
  // prettier-ignore

  var simpleEventPluginEvents = ['abort', 'auxClick', 'cancel', 'canPlay', 'canPlayThrough', 'click', 'close', 'contextMenu', 'copy', 'cut', 'drag', 'dragEnd', 'dragEnter', 'dragExit', 'dragLeave', 'dragOver', 'dragStart', 'drop', 'durationChange', 'emptied', 'encrypted', 'ended', 'error', 'gotPointerCapture', 'input', 'invalid', 'keyDown', 'keyPress', 'keyUp', 'load', 'loadedData', 'loadedMetadata', 'loadStart', 'lostPointerCapture', 'mouseDown', 'mouseMove', 'mouseOut', 'mouseOver', 'mouseUp', 'paste', 'pause', 'play', 'playing', 'pointerCancel', 'pointerDown', 'pointerMove', 'pointerOut', 'pointerOver', 'pointerUp', 'progress', 'rateChange', 'reset', 'resize', 'seeked', 'seeking', 'stalled', 'submit', 'suspend', 'timeUpdate', 'touchCancel', 'touchEnd', 'touchStart', 'volumeChange', 'scroll', 'toggle', 'touchMove', 'waiting', 'wheel'];

  function registerSimpleEvent(domEventName, reactName) {
    topLevelEventsToReactNames.set(domEventName, reactName);
    registerTwoPhaseEvent(reactName, [domEventName]);
  }

  function registerSimpleEvents() {
    for (var i = 0; i < simpleEventPluginEvents.length; i++) {
      var eventName = simpleEventPluginEvents[i];
      var domEventName = eventName.toLowerCase();
      var capitalizedEvent = eventName[0].toUpperCase() + eventName.slice(1);
      registerSimpleEvent(domEventName, 'on' + capitalizedEvent);
    } // Special cases where event names don't match.


    registerSimpleEvent(ANIMATION_END, 'onAnimationEnd');
    registerSimpleEvent(ANIMATION_ITERATION, 'onAnimationIteration');
    registerSimpleEvent(ANIMATION_START, 'onAnimationStart');
    registerSimpleEvent('dblclick', 'onDoubleClick');
    registerSimpleEvent('focusin', 'onFocus');
    registerSimpleEvent('focusout', 'onBlur');
    registerSimpleEvent(TRANSITION_END, 'onTransitionEnd');
  }