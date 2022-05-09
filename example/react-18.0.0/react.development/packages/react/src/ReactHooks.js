
  function resolveDispatcher() {
    var dispatcher = ReactCurrentDispatcher.current;

    {
      if (dispatcher === null) {
        error('Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for' + ' one of the following reasons:\n' + '1. You might have mismatching versions of React and the renderer (such as React DOM)\n' + '2. You might be breaking the Rules of Hooks\n' + '3. You might have more than one copy of React in the same app\n' + 'See https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem.');
      }
    } // Will result in a null access error if accessed outside render phase. We
    // intentionally don't throw our own error because this is in a hot path.
    // Also helps ensure this is inlined.


    return dispatcher;
  }

  function getCacheSignal() {
    var dispatcher = resolveDispatcher(); // $FlowFixMe This is unstable, thus optional

    return dispatcher.getCacheSignal();
  }
  function getCacheForType(resourceType) {
    var dispatcher = resolveDispatcher(); // $FlowFixMe This is unstable, thus optional

    return dispatcher.getCacheForType(resourceType);
  }
  function useContext(Context) {
    var dispatcher = resolveDispatcher();

    {
      // TODO: add a more generic warning for invalid values.
      if (Context._context !== undefined) {
        var realContext = Context._context; // Don't deduplicate because this legitimately causes bugs
        // and nobody should be using this in existing code.

        if (realContext.Consumer === Context) {
          error('Calling useContext(Context.Consumer) is not supported, may cause bugs, and will be ' + 'removed in a future major release. Did you mean to call useContext(Context) instead?');
        } else if (realContext.Provider === Context) {
          error('Calling useContext(Context.Provider) is not supported. ' + 'Did you mean to call useContext(Context) instead?');
        }
      }
    }

    return dispatcher.useContext(Context);
  }
  function useState(initialState) {
    var dispatcher = resolveDispatcher();
    return dispatcher.useState(initialState);
  }
  function useReducer(reducer, initialArg, init) {
    var dispatcher = resolveDispatcher();
    return dispatcher.useReducer(reducer, initialArg, init);
  }
  function useRef(initialValue) {
    var dispatcher = resolveDispatcher();
    return dispatcher.useRef(initialValue);
  }
  function useEffect(create, deps) {
    var dispatcher = resolveDispatcher();
    return dispatcher.useEffect(create, deps);
  }
  function useInsertionEffect(create, deps) {
    var dispatcher = resolveDispatcher();
    return dispatcher.useInsertionEffect(create, deps);
  }
  function useLayoutEffect(create, deps) {
    var dispatcher = resolveDispatcher();
    return dispatcher.useLayoutEffect(create, deps);
  }
  function useCallback(callback, deps) {
    var dispatcher = resolveDispatcher();
    return dispatcher.useCallback(callback, deps);
  }
  function useMemo(create, deps) {
    var dispatcher = resolveDispatcher();
    return dispatcher.useMemo(create, deps);
  }
  function useImperativeHandle(ref, create, deps) {
    var dispatcher = resolveDispatcher();
    return dispatcher.useImperativeHandle(ref, create, deps);
  }
  function useDebugValue(value, formatterFn) {
    {
      var dispatcher = resolveDispatcher();
      return dispatcher.useDebugValue(value, formatterFn);
    }
  }
  function useTransition() {
    var dispatcher = resolveDispatcher();
    return dispatcher.useTransition();
  }
  function useDeferredValue(value) {
    var dispatcher = resolveDispatcher();
    return dispatcher.useDeferredValue(value);
  }
  function useId() {
    var dispatcher = resolveDispatcher();
    return dispatcher.useId();
  }
  function useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
    var dispatcher = resolveDispatcher();
    return dispatcher.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  }
  function useCacheRefresh() {
    var dispatcher = resolveDispatcher(); // $FlowFixMe This is unstable, thus optional

    return dispatcher.useCacheRefresh();
  }