  function startTransition(scope) {
    var prevTransition = ReactCurrentBatchConfig.transition;
    ReactCurrentBatchConfig.transition = 1;

    try {
      scope();
    } finally {
      ReactCurrentBatchConfig.transition = prevTransition;
    }
  }