  // This is imported by the event replaying implementation in React DOM. It's
  // in a separate file to break a circular dependency between the renderer and
  // the reconciler.
  function isRootDehydrated(root) {
    var currentState = root.current.memoizedState;
    return currentState.isDehydrated;
  }