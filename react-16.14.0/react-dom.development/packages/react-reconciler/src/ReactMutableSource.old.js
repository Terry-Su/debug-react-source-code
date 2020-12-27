  // and should be reset before starting a new render.
  // This tracks which mutable sources need to be reset after a render.

  var workInProgressSources = [];
  var rendererSigil$1;

  {
    // Used to detect multiple renderers using the same mutable source.
    rendererSigil$1 = {};
  }

  function markSourceAsDirty(mutableSource) {
    workInProgressSources.push(mutableSource);
  }
  function resetWorkInProgressVersions() {
    for (var i = 0; i < workInProgressSources.length; i++) {
      var mutableSource = workInProgressSources[i];

      {
        mutableSource._workInProgressVersionPrimary = null;
      }
    }

    workInProgressSources.length = 0;
  }
  function getWorkInProgressVersion(mutableSource) {
    {
      return mutableSource._workInProgressVersionPrimary;
    }
  }
  function setWorkInProgressVersion(mutableSource, version) {
    {
      mutableSource._workInProgressVersionPrimary = version;
    }

    workInProgressSources.push(mutableSource);
  }
  function warnAboutMultipleRenderersDEV(mutableSource) {
    {
      {
        if (mutableSource._currentPrimaryRenderer == null) {
          mutableSource._currentPrimaryRenderer = rendererSigil$1;
        } else if (mutableSource._currentPrimaryRenderer !== rendererSigil$1) {
          error('Detected multiple renderers concurrently rendering the ' + 'same mutable source. This is currently unsupported.');
        }
      }
    }
  } // Eager reads the version of a mutable source and stores it on the root.