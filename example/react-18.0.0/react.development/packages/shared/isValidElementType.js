  var REACT_MODULE_REFERENCE = Symbol.for('react.module.reference');
  function isValidElementType(type) {
    if (typeof type === 'string' || typeof type === 'function') {
      return true;
    } // Note: typeof might be other than 'symbol' or 'number' (e.g. if it's a polyfill).


    if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing  || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden  || type === REACT_OFFSCREEN_TYPE || enableScopeAPI  ||  type === REACT_CACHE_TYPE || enableTransitionTracing ) {
      return true;
    }

    if (typeof type === 'object' && type !== null) {
      if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
      // types supported by any Flight configuration anywhere since
      // we don't know which Flight build this will end up being used
      // with.
      type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== undefined) {
        return true;
      }
    }

    return false;
  }