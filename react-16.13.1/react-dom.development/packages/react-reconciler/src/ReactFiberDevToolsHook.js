  var onScheduleFiberRoot = null;
  var onCommitFiberRoot = null;
  var onCommitFiberUnmount = null;
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
        error('The installed version of React DevTools is too old and will not work ' + 'with the current version of React. Please update React DevTools. ' + 'https://fb.me/react-devtools');
      } // DevTools exists, even though it doesn't support Fiber.


      return true;
    }

    try {
      var rendererID = hook.inject(internals); // We have successfully injected, so now it is safe to set up hooks.

      if (true) {
        // Only used by Fast Refresh
        if (typeof hook.onScheduleFiberRoot === 'function') {
          onScheduleFiberRoot = function (root, children) {
            try {
              hook.onScheduleFiberRoot(rendererID, root, children);
            } catch (err) {
              if (true && !hasLoggedError) {
                hasLoggedError = true;

                error('React instrumentation encountered an error: %s', err);
              }
            }
          };
        }
      }

      onCommitFiberRoot = function (root, expirationTime) {
        try {
          var didError = (root.current.effectTag & DidCapture) === DidCapture;

          if (enableProfilerTimer) {
            var currentTime = getCurrentTime();
            var priorityLevel = inferPriorityFromExpirationTime(currentTime, expirationTime);
            hook.onCommitFiberRoot(rendererID, root, priorityLevel, didError);
          } else {
            hook.onCommitFiberRoot(rendererID, root, undefined, didError);
          }
        } catch (err) {
          if (true) {
            if (!hasLoggedError) {
              hasLoggedError = true;

              error('React instrumentation encountered an error: %s', err);
            }
          }
        }
      };

      onCommitFiberUnmount = function (fiber) {
        try {
          hook.onCommitFiberUnmount(rendererID, fiber);
        } catch (err) {
          if (true) {
            if (!hasLoggedError) {
              hasLoggedError = true;

              error('React instrumentation encountered an error: %s', err);
            }
          }
        }
      };
    } catch (err) {
      // Catch all errors because it is unsafe to throw during initialization.
      {
        error('React instrumentation encountered an error: %s.', err);
      }
    } // DevTools exists


    return true;
  }
  function onScheduleRoot(root, children) {
    if (typeof onScheduleFiberRoot === 'function') {
      onScheduleFiberRoot(root, children);
    }
  }
  function onCommitRoot(root, expirationTime) {
    if (typeof onCommitFiberRoot === 'function') {
      onCommitFiberRoot(root, expirationTime);
    }
  }
  function onCommitUnmount(fiber) {
    if (typeof onCommitFiberUnmount === 'function') {
      onCommitFiberUnmount(fiber);
    }
  }