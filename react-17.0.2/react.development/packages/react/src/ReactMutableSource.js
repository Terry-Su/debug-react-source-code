  function createMutableSource(source, getVersion) {
    var mutableSource = {
      _getVersion: getVersion,
      _source: source,
      _workInProgressVersionPrimary: null,
      _workInProgressVersionSecondary: null
    };

    {
      mutableSource._currentPrimaryRenderer = null;
      mutableSource._currentSecondaryRenderer = null;
    }

    return mutableSource;
  }