  /**
   * @interface Event
   * @see http://www.w3.org/TR/css3-animations/#AnimationEvent-interface
   * @see https://developer.mozilla.org/en-US/docs/Web/API/AnimationEvent
   */

  var SyntheticAnimationEvent = SyntheticEvent.extend({
    animationName: null,
    elapsedTime: null,
    pseudoElement: null
  });