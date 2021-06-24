  var ReactCurrentBatchConfig = ReactSharedInternals.ReactCurrentBatchConfig;
  var NoTransition = 0;
  function requestCurrentTransition() {
    return ReactCurrentBatchConfig.transition;
  }