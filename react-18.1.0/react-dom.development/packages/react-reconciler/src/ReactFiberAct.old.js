  var ReactCurrentActQueue = ReactSharedInternals.ReactCurrentActQueue;
  function isLegacyActEnvironment(fiber) {
    {
      // Legacy mode. We preserve the behavior of React 17's act. It assumes an
      // act environment whenever `jest` is defined, but you can still turn off
      // spurious warnings by setting IS_REACT_ACT_ENVIRONMENT explicitly
      // to false.
      var isReactActEnvironmentGlobal = // $FlowExpectedError – Flow doesn't know about IS_REACT_ACT_ENVIRONMENT global
      typeof IS_REACT_ACT_ENVIRONMENT !== 'undefined' ? IS_REACT_ACT_ENVIRONMENT : undefined; // $FlowExpectedError - Flow doesn't know about jest

      var jestIsDefined = typeof jest !== 'undefined';
      return  jestIsDefined && isReactActEnvironmentGlobal !== false;
    }
  }
  function isConcurrentActEnvironment() {
    {
      var isReactActEnvironmentGlobal = // $FlowExpectedError – Flow doesn't know about IS_REACT_ACT_ENVIRONMENT global
      typeof IS_REACT_ACT_ENVIRONMENT !== 'undefined' ? IS_REACT_ACT_ENVIRONMENT : undefined;

      if (!isReactActEnvironmentGlobal && ReactCurrentActQueue.current !== null) {
        // TODO: Include link to relevant documentation page.
        error('The current testing environment is not configured to support ' + 'act(...)');
      }

      return isReactActEnvironmentGlobal;
    }
  }