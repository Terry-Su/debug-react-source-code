  setAttemptSynchronousHydration(attemptSynchronousHydration$1);
  setAttemptUserBlockingHydration(attemptUserBlockingHydration$1);
  setAttemptContinuousHydration(attemptContinuousHydration$1);
  setAttemptHydrationAtCurrentPriority(attemptHydrationAtCurrentPriority$1);
  setGetCurrentUpdatePriority(getCurrentUpdateLanePriority);
  setAttemptHydrationAtPriority(runWithPriority$2);
  var didWarnAboutUnstableCreatePortal = false;

  {
    if (typeof Map !== 'function' || // $FlowIssue Flow incorrectly thinks Map has no prototype
    Map.prototype == null || typeof Map.prototype.forEach !== 'function' || typeof Set !== 'function' || // $FlowIssue Flow incorrectly thinks Set has no prototype
    Set.prototype == null || typeof Set.prototype.clear !== 'function' || typeof Set.prototype.forEach !== 'function') {
      error('React depends on Map and Set built-in types. Make sure that you load a ' + 'polyfill in older browsers. https://reactjs.org/link/react-polyfills');
    }
  }

  setRestoreImplementation(restoreControlledState$3);
  setBatchingImplementation(batchedUpdates$1, discreteUpdates$1, flushDiscreteUpdates, batchedEventUpdates$1);

  function createPortal$1(children, container) {
    var key = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    if (!isValidContainer(container)) {
      {
        throw Error( "Target container is not a DOM element." );
      }
    } // TODO: pass ReactDOM portal implementation as third argument
    // $FlowFixMe The Flow type is opaque but there's no way to actually create it.


    return createPortal(children, container, null, key);
  }

  function scheduleHydration(target) {
    if (target) {
      queueExplicitHydrationTarget(target);
    }
  }

  function renderSubtreeIntoContainer(parentComponent, element, containerNode, callback) {

    return unstable_renderSubtreeIntoContainer(parentComponent, element, containerNode, callback);
  }

  function unstable_createPortal(children, container) {
    var key = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    {
      if (!didWarnAboutUnstableCreatePortal) {
        didWarnAboutUnstableCreatePortal = true;

        warn('The ReactDOM.unstable_createPortal() alias has been deprecated, ' + 'and will be removed in React 18+. Update your code to use ' + 'ReactDOM.createPortal() instead. It has the exact same API, ' + 'but without the "unstable_" prefix.');
      }
    }

    return createPortal$1(children, container, key);
  }

  var Internals = {
    // Keep in sync with ReactTestUtils.js, and ReactTestUtilsAct.js.
    // This is an array for better minification.
    Events: [getInstanceFromNode, getNodeFromInstance, getFiberCurrentPropsFromNode, enqueueStateRestore, restoreStateIfNeeded, flushPassiveEffects, // TODO: This is related to `act`, not events. Move to separate key?
    IsThisRendererActing]
  };
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