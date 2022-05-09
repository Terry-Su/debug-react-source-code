  // the renderer. Such as when we're dispatching events or if third party
  // libraries need to call batchedUpdates. Eventually, this API will go away when
  // everything is batched by default. We'll then have a similar API to opt-out of
  // scheduled work and instead do synchronous work.
  // Defaults

  var batchedUpdatesImpl = function (fn, bookkeeping) {
    return fn(bookkeeping);
  };

  var flushSyncImpl = function () {};

  var isInsideEventHandler = false;

  function finishEventHandler() {
    // Here we wait until all updates have propagated, which is important
    // when using controlled components within layers:
    // https://github.com/facebook/react/issues/1698
    // Then we restore state of any controlled component.
    var controlledComponentsHavePendingUpdates = needsStateRestore();

    if (controlledComponentsHavePendingUpdates) {
      // If a controlled event was fired, we may need to restore the state of
      // the DOM node back to the controlled value. This is necessary when React
      // bails out of the update without touching the DOM.
      // TODO: Restore state in the microtask, after the discrete updates flush,
      // instead of early flushing them here.
      flushSyncImpl();
      restoreStateIfNeeded();
    }
  }

  function batchedUpdates(fn, a, b) {
    if (isInsideEventHandler) {
      // If we are currently inside another batch, we need to wait until it
      // fully completes before restoring state.
      return fn(a, b);
    }

    isInsideEventHandler = true;

    try {
      return batchedUpdatesImpl(fn, a, b);
    } finally {
      isInsideEventHandler = false;
      finishEventHandler();
    }
  } // TODO: Replace with flushSync
  function setBatchingImplementation(_batchedUpdatesImpl, _discreteUpdatesImpl, _flushSyncImpl) {
    batchedUpdatesImpl = _batchedUpdatesImpl;
    flushSyncImpl = _flushSyncImpl;
  }