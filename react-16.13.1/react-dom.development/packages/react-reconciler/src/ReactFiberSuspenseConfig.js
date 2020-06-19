  var ReactCurrentBatchConfig = ReactSharedInternals.ReactCurrentBatchConfig;
  function requestCurrentSuspenseConfig() {
    return ReactCurrentBatchConfig.suspense;
  }