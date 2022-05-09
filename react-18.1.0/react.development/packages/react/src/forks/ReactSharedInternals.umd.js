  var ReactSharedInternals$1 = {
    ReactCurrentDispatcher: ReactCurrentDispatcher,
    ReactCurrentOwner: ReactCurrentOwner,
    ReactCurrentBatchConfig: ReactCurrentBatchConfig,
    // Re-export the schedule API(s) for UMD bundles.
    // This avoids introducing a dependency on a new UMD global in a minor update,
    // Since that would be a breaking change (e.g. for all existing CodeSandboxes).
    // This re-export is only required for UMD bundles;
    // CJS bundles use the shared NPM package.
    Scheduler: Scheduler
  };

  {
    ReactSharedInternals$1.ReactCurrentActQueue = ReactCurrentActQueue;
    ReactSharedInternals$1.ReactDebugCurrentFrame = ReactDebugCurrentFrame;
  }

  {
    ReactSharedInternals$1.ContextRegistry = ContextRegistry;
  }