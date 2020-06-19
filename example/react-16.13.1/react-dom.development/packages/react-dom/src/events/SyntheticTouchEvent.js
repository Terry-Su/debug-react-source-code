  /**
   * @interface TouchEvent
   * @see http://www.w3.org/TR/touch-events/
   */

  var SyntheticTouchEvent = SyntheticUIEvent.extend({
    touches: null,
    targetTouches: null,
    changedTouches: null,
    altKey: null,
    metaKey: null,
    ctrlKey: null,
    shiftKey: null,
    getModifierState: getEventModifierState
  });