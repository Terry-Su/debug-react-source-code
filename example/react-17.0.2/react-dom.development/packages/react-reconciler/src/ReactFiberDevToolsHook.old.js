  var rendererID = null;
  var injectedHook = null;
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
      rendererID = hook.inject(internals); // We have successfully injected, so now it is safe to set up hooks.

      injectedHook = hook;
    } catch (err) {
      // Catch all errors because it is unsafe to throw during initialization.
      {
        error('React instrumentation encountered an error: %s.', err);
      }
    } // DevTools exists


    return true;
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
  function onCommitRoot(root, priorityLevel) {
    if (injectedHook && typeof injectedHook.onCommitFiberRoot === 'function') {
      try {
        var didError = (root.current.flags & DidCapture) === DidCapture;

        if (enableProfilerTimer) {
          injectedHook.onCommitFiberRoot(rendererID, root, priorityLevel, didError);
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