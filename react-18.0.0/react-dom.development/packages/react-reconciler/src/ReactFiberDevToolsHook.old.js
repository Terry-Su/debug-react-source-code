  var rendererID = null;
  var injectedHook = null;
  var injectedProfilingHooks = null;
  var hasLoggedError = false;
  var isDevToolsPresent = typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined';
  function injectInternals(internals) {
    if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined') {
      // No DevTools
      return false;
    }

    var hook = __REACT_DEVTOOLS_GLOBAL_HOOK__;

    if (hook.isDisabled) {
      // This isn't a real property on the hook, but it can be set to opt out
      // of DevTools integration and associated warnings and logs.
      // https://github.com/facebook/react/issues/3877
      return true;
    }

    if (!hook.supportsFiber) {
      {
        error('The installed version of React DevTools is too old and will not work ' + 'with the current version of React. Please update React DevTools. ' + 'https://reactjs.org/link/react-devtools');
      } // DevTools exists, even though it doesn't support Fiber.


      return true;
    }

    try {
      if (enableSchedulingProfiler) {
        // Conditionally inject these hooks only if Timeline profiler is supported by this build.
        // This gives DevTools a way to feature detect that isn't tied to version number
        // (since profiling and timeline are controlled by different feature flags).
        internals = assign({}, internals, {
          getLaneLabelMap: getLaneLabelMap,
          injectProfilingHooks: injectProfilingHooks
        });
      }

      rendererID = hook.inject(internals); // We have successfully injected, so now it is safe to set up hooks.

      injectedHook = hook;
    } catch (err) {
      // Catch all errors because it is unsafe to throw during initialization.
      {
        error('React instrumentation encountered an error: %s.', err);
      }
    }

    if (hook.checkDCE) {
      // This is the real DevTools.
      return true;
    } else {
      // This is likely a hook installed by Fast Refresh runtime.
      return false;
    }
  }
  function onScheduleRoot(root, children) {
    {
      if (injectedHook && typeof injectedHook.onScheduleFiberRoot === 'function') {
        try {
          injectedHook.onScheduleFiberRoot(rendererID, root, children);
        } catch (err) {
          if ( !hasLoggedError) {
            hasLoggedError = true;

            error('React instrumentation encountered an error: %s', err);
          }
        }
      }
    }
  }
  function onCommitRoot(root, eventPriority) {
    if (injectedHook && typeof injectedHook.onCommitFiberRoot === 'function') {
      try {
        var didError = (root.current.flags & DidCapture) === DidCapture;

        if (enableProfilerTimer) {
          var schedulerPriority;

          switch (eventPriority) {
            case DiscreteEventPriority:
              schedulerPriority = ImmediatePriority;
              break;

            case ContinuousEventPriority:
              schedulerPriority = UserBlockingPriority;
              break;

            case DefaultEventPriority:
              schedulerPriority = NormalPriority;
              break;

            case IdleEventPriority:
              schedulerPriority = IdlePriority;
              break;

            default:
              schedulerPriority = NormalPriority;
              break;
          }

          injectedHook.onCommitFiberRoot(rendererID, root, schedulerPriority, didError);
        } else {
          injectedHook.onCommitFiberRoot(rendererID, root, undefined, didError);
        }
      } catch (err) {
        {
          if (!hasLoggedError) {
            hasLoggedError = true;

            error('React instrumentation encountered an error: %s', err);
          }
        }
      }
    }
  }
  function onPostCommitRoot(root) {
    if (injectedHook && typeof injectedHook.onPostCommitFiberRoot === 'function') {
      try {
        injectedHook.onPostCommitFiberRoot(rendererID, root);
      } catch (err) {
        {
          if (!hasLoggedError) {
            hasLoggedError = true;

            error('React instrumentation encountered an error: %s', err);
          }
        }
      }
    }
  }
  function onCommitUnmount(fiber) {
    if (injectedHook && typeof injectedHook.onCommitFiberUnmount === 'function') {
      try {
        injectedHook.onCommitFiberUnmount(rendererID, fiber);
      } catch (err) {
        {
          if (!hasLoggedError) {
            hasLoggedError = true;

            error('React instrumentation encountered an error: %s', err);
          }
        }
      }
    }
  }
  function setIsStrictModeForDevtools(newIsStrictMode) {
    {
      if (typeof unstable_yieldValue$1 === 'function') {
        // We're in a test because Scheduler.unstable_yieldValue only exists
        // in SchedulerMock. To reduce the noise in strict mode tests,
        // suppress warnings and disable scheduler yielding during the double render
        unstable_setDisableYieldValue$1(newIsStrictMode);
        setSuppressWarning(newIsStrictMode);
      }

      if (injectedHook && typeof injectedHook.setStrictMode === 'function') {
        try {
          injectedHook.setStrictMode(rendererID, newIsStrictMode);
        } catch (err) {
          {
            if (!hasLoggedError) {
              hasLoggedError = true;

              error('React instrumentation encountered an error: %s', err);
            }
          }
        }
      }
    }
  } // Profiler API hooks

  function injectProfilingHooks(profilingHooks) {
    injectedProfilingHooks = profilingHooks;
  }

  function getLaneLabelMap() {
    {
      var map = new Map();
      var lane = 1;

      for (var index = 0; index < TotalLanes; index++) {
        var label = getLabelForLane(lane);
        map.set(lane, label);
        lane *= 2;
      }

      return map;
    }
  }

  function markCommitStarted(lanes) {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markCommitStarted === 'function') {
        injectedProfilingHooks.markCommitStarted(lanes);
      }
    }
  }
  function markCommitStopped() {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markCommitStopped === 'function') {
        injectedProfilingHooks.markCommitStopped();
      }
    }
  }
  function markComponentRenderStarted(fiber) {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentRenderStarted === 'function') {
        injectedProfilingHooks.markComponentRenderStarted(fiber);
      }
    }
  }
  function markComponentRenderStopped() {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentRenderStopped === 'function') {
        injectedProfilingHooks.markComponentRenderStopped();
      }
    }
  }
  function markComponentPassiveEffectMountStarted(fiber) {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentPassiveEffectMountStarted === 'function') {
        injectedProfilingHooks.markComponentPassiveEffectMountStarted(fiber);
      }
    }
  }
  function markComponentPassiveEffectMountStopped() {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentPassiveEffectMountStopped === 'function') {
        injectedProfilingHooks.markComponentPassiveEffectMountStopped();
      }
    }
  }
  function markComponentPassiveEffectUnmountStarted(fiber) {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentPassiveEffectUnmountStarted === 'function') {
        injectedProfilingHooks.markComponentPassiveEffectUnmountStarted(fiber);
      }
    }
  }
  function markComponentPassiveEffectUnmountStopped() {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentPassiveEffectUnmountStopped === 'function') {
        injectedProfilingHooks.markComponentPassiveEffectUnmountStopped();
      }
    }
  }
  function markComponentLayoutEffectMountStarted(fiber) {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentLayoutEffectMountStarted === 'function') {
        injectedProfilingHooks.markComponentLayoutEffectMountStarted(fiber);
      }
    }
  }
  function markComponentLayoutEffectMountStopped() {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentLayoutEffectMountStopped === 'function') {
        injectedProfilingHooks.markComponentLayoutEffectMountStopped();
      }
    }
  }
  function markComponentLayoutEffectUnmountStarted(fiber) {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentLayoutEffectUnmountStarted === 'function') {
        injectedProfilingHooks.markComponentLayoutEffectUnmountStarted(fiber);
      }
    }
  }
  function markComponentLayoutEffectUnmountStopped() {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentLayoutEffectUnmountStopped === 'function') {
        injectedProfilingHooks.markComponentLayoutEffectUnmountStopped();
      }
    }
  }
  function markComponentErrored(fiber, thrownValue, lanes) {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentErrored === 'function') {
        injectedProfilingHooks.markComponentErrored(fiber, thrownValue, lanes);
      }
    }
  }
  function markComponentSuspended(fiber, wakeable, lanes) {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentSuspended === 'function') {
        injectedProfilingHooks.markComponentSuspended(fiber, wakeable, lanes);
      }
    }
  }
  function markLayoutEffectsStarted(lanes) {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markLayoutEffectsStarted === 'function') {
        injectedProfilingHooks.markLayoutEffectsStarted(lanes);
      }
    }
  }
  function markLayoutEffectsStopped() {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markLayoutEffectsStopped === 'function') {
        injectedProfilingHooks.markLayoutEffectsStopped();
      }
    }
  }
  function markPassiveEffectsStarted(lanes) {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markPassiveEffectsStarted === 'function') {
        injectedProfilingHooks.markPassiveEffectsStarted(lanes);
      }
    }
  }
  function markPassiveEffectsStopped() {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markPassiveEffectsStopped === 'function') {
        injectedProfilingHooks.markPassiveEffectsStopped();
      }
    }
  }
  function markRenderStarted(lanes) {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markRenderStarted === 'function') {
        injectedProfilingHooks.markRenderStarted(lanes);
      }
    }
  }
  function markRenderYielded() {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markRenderYielded === 'function') {
        injectedProfilingHooks.markRenderYielded();
      }
    }
  }
  function markRenderStopped() {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markRenderStopped === 'function') {
        injectedProfilingHooks.markRenderStopped();
      }
    }
  }
  function markRenderScheduled(lane) {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markRenderScheduled === 'function') {
        injectedProfilingHooks.markRenderScheduled(lane);
      }
    }
  }
  function markForceUpdateScheduled(fiber, lane) {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markForceUpdateScheduled === 'function') {
        injectedProfilingHooks.markForceUpdateScheduled(fiber, lane);
      }
    }
  }
  function markStateUpdateScheduled(fiber, lane) {
    {
      if (injectedProfilingHooks !== null && typeof injectedProfilingHooks.markStateUpdateScheduled === 'function') {
        injectedProfilingHooks.markStateUpdateScheduled(fiber, lane);
      }
    }
  }