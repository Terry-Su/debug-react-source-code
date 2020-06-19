var ReactSharedInternals = {
  ReactCurrentOwner: ReactCurrentOwner,
  // Used by renderers to avoid bundling object-assign twice in UMD bundles:
  assign: objectAssign
};

{
  // Re-export the schedule API(s) for UMD bundles.
  // This avoids introducing a dependency on a new UMD global in a minor update,
  // Since that would be a breaking change (e.g. for all existing CodeSandboxes).
  // This re-export is only required for UMD bundles;
  // CJS bundles use the shared NPM package.
  objectAssign(ReactSharedInternals, {
    Scheduler: {
      unstable_cancelCallback: unstable_cancelCallback,
      unstable_now: getCurrentTime,
      unstable_scheduleCallback: unstable_scheduleCallback,
      unstable_runWithPriority: unstable_runWithPriority,
      unstable_wrapCallback: unstable_wrapCallback,
      unstable_getCurrentPriorityLevel: unstable_getCurrentPriorityLevel
    },
    SchedulerTracing: {
      __interactionsRef: interactionsRef,
      __subscriberRef: subscriberRef,
      unstable_clear: unstable_clear,
      unstable_getCurrent: unstable_getCurrent,
      unstable_getThreadID: unstable_getThreadID,
      unstable_subscribe: unstable_subscribe,
      unstable_trace: unstable_trace,
      unstable_unsubscribe: unstable_unsubscribe,
      unstable_wrap: unstable_wrap
    }
  });
}

{
  objectAssign(ReactSharedInternals, {
    // These should not be included in production.
    ReactDebugCurrentFrame: ReactDebugCurrentFrame,
    // Shim for React DOM 16.0.0 which still destructured (but not used) this.
    // TODO: remove in React 17.0.
    ReactComponentTreeHook: {}
  });
}

