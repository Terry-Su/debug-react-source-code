  var enableClientRenderFallbackOnTextMismatch = true; // Recoil still uses useMutableSource in www, need to delete
  // the react-reconciler package.

  var enableNewReconciler = false; // Support legacy Primer support on internal FB www

  var enableLazyContextPropagation = false; // FB-only usage. The new API has different semantics.

  var enableLegacyHidden = false; // Enables unstable_avoidThisFallback feature in Fiber

  var enableSuspenseAvoidThisFallback = false; // Enables unstable_avoidThisFallback feature in Fizz
  // React DOM Chopping Block
  //
  // Similar to main Chopping Block but only flags related to React DOM. These are
  // grouped because we will likely batch all of them into a single major release.
  // -----------------------------------------------------------------------------
  // Disable support for comment nodes as React DOM containers. Already disabled
  // in open source, but www codebase still relies on it. Need to remove.

  var disableCommentsAsDOMContainers = true; // Disable javascript: URL strings in href for XSS protection.
  // and client rendering, mostly to allow JSX attributes to apply to the custom
  // element's object properties instead of only HTML attributes.
  // https://github.com/facebook/react/issues/11347

  var enableCustomElementPropertySupport = true; // Disables children for <textarea> elements
  var warnAboutStringRefs = false; // -----------------------------------------------------------------------------
  // Debugging and DevTools
  // -----------------------------------------------------------------------------
  // Adds user timing marks for e.g. state updates, suspense, and work loop stuff,
  // for an experimental timeline tool.

  var enableSchedulingProfiler = true; // Helps identify side effects in render-phase lifecycle hooks and setState

  var enableProfilerTimer = true; // Record durations for commit and passive effects phases.

  var enableProfilerCommitHooks = true; // Phase param passed to onRender callback differentiates between an "update" and a "cascading-update".