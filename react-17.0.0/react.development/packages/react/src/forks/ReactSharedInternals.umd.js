  var ReactSharedInternals$1 = {
    ReactCurrentDispatcher: ReactCurrentDispatcher,
    ReactCurrentOwner: ReactCurrentOwner,
    IsSomeRendererActing: IsSomeRendererActing,
    ReactCurrentBatchConfig: ReactCurrentBatchConfig,
    // Used by renderers to avoid bundling object-assign twice in UMD bundles:
    assign: assign,
    // Re-export the schedule API(s) for UMD bundles.
    // This avoids introducing a dependency on a new UMD global in a minor update,
    // Since that would be a breaking change (e.g. for all existing CodeSandboxes).
    // This re-export is only required for UMD bundles;
    // CJS bundles use the shared NPM package.
    Scheduler: Scheduler,
    SchedulerTracing: SchedulerTracing
  };

  {
    ReactSharedInternals$1.ReactDebugCurrentFrame = ReactDebugCurrentFrame;
  }