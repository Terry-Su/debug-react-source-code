
  function withSuspenseConfig(scope, config) {
    var previousConfig = ReactCurrentBatchConfig.suspense;
    ReactCurrentBatchConfig.suspense = config === undefined ? null : config;

    try {
      scope();
    } finally {
      ReactCurrentBatchConfig.suspense = previousConfig;
    }
  }