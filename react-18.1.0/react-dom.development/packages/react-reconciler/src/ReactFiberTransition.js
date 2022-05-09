  var ReactCurrentBatchConfig$1 = ReactSharedInternals.ReactCurrentBatchConfig;
  var NoTransition = null;
  function requestCurrentTransition() {
    return ReactCurrentBatchConfig$1.transition;
  }