  function startTransition(scope, options) {
    var prevTransition = ReactCurrentBatchConfig.transition;
    ReactCurrentBatchConfig.transition = {};
    var currentTransition = ReactCurrentBatchConfig.transition;

    {
      ReactCurrentBatchConfig.transition._updatedFibers = new Set();
    }

    try {
      scope();
    } finally {
      ReactCurrentBatchConfig.transition = prevTransition;

      {
        if (prevTransition === null && currentTransition._updatedFibers) {
          var updatedFibersCount = currentTransition._updatedFibers.size;

          if (updatedFibersCount > 10) {
            warn('Detected a large number of updates inside startTransition. ' + 'If this is due to a subscription please re-write it to use React provided hooks. ' + 'Otherwise concurrent mode guarantees are off the table.');
          }

          currentTransition._updatedFibers.clear();
        }
      }
    }
  }