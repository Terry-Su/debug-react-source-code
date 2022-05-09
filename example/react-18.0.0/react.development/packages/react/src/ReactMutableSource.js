  function createMutableSource(source, getVersion) {
    var mutableSource = {
      _getVersion: getVersion,
      _source: source,
      _workInProgressVersionPrimary: null,
      _workInProgressVersionSecondary: null
    };

    {
      mutableSource._currentPrimaryRenderer = null;
      mutableSource._currentSecondaryRenderer = null; // Used to detect side effects that update a mutable source during render.
      // See https://github.com/facebook/react/issues/19948

      mutableSource._currentlyRenderingFiber = null;
      mutableSource._initialVersionAsOfFirstRender = null;
    }

    return mutableSource;
  }