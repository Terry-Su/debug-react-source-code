  // This ensures that the version used for server rendering matches the one
  // that is eventually read during hydration.
  // If they don't match there's a potential tear and a full deopt render is required.

  function registerMutableSourceForHydration(root, mutableSource) {
    var getVersion = mutableSource._getVersion;
    var version = getVersion(mutableSource._source); // TODO Clear this data once all pending hydration work is finished.
    // Retaining it forever may interfere with GC.

    if (root.mutableSourceEagerHydrationData == null) {
      root.mutableSourceEagerHydrationData = [mutableSource, version];
    } else {
      root.mutableSourceEagerHydrationData.push(mutableSource, version);
    }
  }