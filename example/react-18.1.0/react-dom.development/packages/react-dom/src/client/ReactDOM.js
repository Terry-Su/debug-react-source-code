  setAttemptSynchronousHydration(attemptSynchronousHydration$1);
  setAttemptContinuousHydration(attemptContinuousHydration$1);
  setAttemptHydrationAtCurrentPriority(attemptHydrationAtCurrentPriority$1);
  setGetCurrentUpdatePriority(getCurrentUpdatePriority);
  setAttemptHydrationAtPriority(runWithPriority);

  {
    if (typeof Map !== 'function' || // $FlowIssue Flow incorrectly thinks Map has no prototype
    Map.prototype == null || typeof Map.prototype.forEach !== 'function' || typeof Set !== 'function' || // $FlowIssue Flow incorrectly thinks Set has no prototype
    Set.prototype == null || typeof Set.prototype.clear !== 'function' || typeof Set.prototype.forEach !== 'function') {
      error('React depends on Map and Set built-in types. Make sure that you load a ' + 'polyfill in older browsers. https://reactjs.org/link/react-polyfills');
    }
  }

  setRestoreImplementation(restoreControlledState$3);
  setBatchingImplementation(batchedUpdates$1, discreteUpdates, flushSync);

  function createPortal$1(children, container) {
    var key = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    if (!isValidContainer(container)) {
      throw new Error('Target container is not a DOM element.');
    } // TODO: pass ReactDOM portal implementation as third argument
    // $FlowFixMe The Flow type is opaque but there's no way to actually create it.


    return createPortal(children, container, null, key);
  }

  function renderSubtreeIntoContainer(parentComponent, element, containerNode, callback) {
    return unstable_renderSubtreeIntoContainer(parentComponent, element, containerNode, callback);
  }

  var Internals = {
    usingClientEntryPoint: false,
    // Keep in sync with ReactTestUtils.js.
    // This is an array for better minification.
    Events: [getInstanceFromNode, getNodeFromInstance, getFiberCurrentPropsFromNode, enqueueStateRestore, restoreStateIfNeeded, batchedUpdates$1]
  };

  function createRoot$1(container, options) {
    {
      if (!Internals.usingClientEntryPoint && !true) {
        error('You are importing createRoot from "react-dom" which is not supported. ' + 'You should instead import it from "react-dom/client".');
      }
    }

    return createRoot(container, options);
  }

  function hydrateRoot$1(container, initialChildren, options) {
    {
      if (!Internals.usingClientEntryPoint && !true) {
        error('You are importing hydrateRoot from "react-dom" which is not supported. ' + 'You should instead import it from "react-dom/client".');
      }
    }

    return hydrateRoot(container, initialChildren, options);
  } // Overload the definition to the two valid signatures.
  // Warning, this opts-out of checking the function body.


  // eslint-disable-next-line no-redeclare
  function flushSync$1(fn) {
    {
      if (isAlreadyRendering()) {
        error('flushSync was called from inside a lifecycle method. React cannot ' + 'flush when React is already rendering. Consider moving this call to ' + 'a scheduler task or micro task.');
      }
    }

    return flushSync(fn);
  }
  var foundDevTools = injectIntoDevTools({
    findFiberByHostInstance: getClosestInstanceFromNode,
    bundleType:  1 ,
    version: ReactVersion,
    rendererPackageName: 'react-dom'
  });

  {
    if (!foundDevTools && canUseDOM && window.top === window.self) {
      // If we're in Chrome or Firefox, provide a download link if not installed.
      if (navigator.userAgent.indexOf('Chrome') > -1 && navigator.userAgent.indexOf('Edge') === -1 || navigator.userAgent.indexOf('Firefox') > -1) {
        var protocol = window.location.protocol; // Don't warn in exotic cases like chrome-extension://.

        if (/^(https?|file):$/.test(protocol)) {
          // eslint-disable-next-line react-internal/no-production-logging
          console.info('%cDownload the React DevTools ' + 'for a better development experience: ' + 'https://reactjs.org/link/react-devtools' + (protocol === 'file:' ? '\nYou might need to use a local HTTP server (instead of file://): ' + 'https://reactjs.org/link/react-devtools-faq' : ''), 'font-weight:bold');
        }
      }
    }
  }