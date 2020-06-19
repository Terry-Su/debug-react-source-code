  /**
   * @interface Event
   * @see http://www.w3.org/TR/2009/WD-css3-transitions-20090320/#transition-events-
   * @see https://developer.mozilla.org/en-US/docs/Web/API/TransitionEvent
   */

  var SyntheticTransitionEvent = SyntheticEvent.extend({
    propertyName: null,
    elapsedTime: null,
    pseudoElement: null
  });