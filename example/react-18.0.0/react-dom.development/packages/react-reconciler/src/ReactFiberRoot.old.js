
  function FiberRootNode(containerInfo, tag, hydrate, identifierPrefix, onRecoverableError) {
    this.tag = tag;
    this.containerInfo = containerInfo;
    this.pendingChildren = null;
    this.current = null;
    this.pingCache = null;
    this.finishedWork = null;
    this.timeoutHandle = noTimeout;
    this.context = null;
    this.pendingContext = null;
    this.callbackNode = null;
    this.callbackPriority = NoLane;
    this.eventTimes = createLaneMap(NoLanes);
    this.expirationTimes = createLaneMap(NoTimestamp);
    this.pendingLanes = NoLanes;
    this.suspendedLanes = NoLanes;
    this.pingedLanes = NoLanes;
    this.expiredLanes = NoLanes;
    this.mutableReadLanes = NoLanes;
    this.finishedLanes = NoLanes;
    this.entangledLanes = NoLanes;
    this.entanglements = createLaneMap(NoLanes);
    this.identifierPrefix = identifierPrefix;
    this.onRecoverableError = onRecoverableError;

    {
      this.pooledCache = null;
      this.pooledCacheLanes = NoLanes;
    }

    {
      this.mutableSourceEagerHydrationData = null;
    }

    {
      this.effectDuration = 0;
      this.passiveEffectDuration = 0;
    }

    {
      this.memoizedUpdaters = new Set();
      var pendingUpdatersLaneMap = this.pendingUpdatersLaneMap = [];

      for (var _i = 0; _i < TotalLanes; _i++) {
        pendingUpdatersLaneMap.push(new Set());
      }
    }

    {
      switch (tag) {
        case ConcurrentRoot:
          this._debugRootType = hydrate ? 'hydrateRoot()' : 'createRoot()';
          break;

        case LegacyRoot:
          this._debugRootType = hydrate ? 'hydrate()' : 'render()';
          break;
      }
    }
  }

  function createFiberRoot(containerInfo, tag, hydrate, initialChildren, hydrationCallbacks, isStrictMode, concurrentUpdatesByDefaultOverride, // TODO: We have several of these arguments that are conceptually part of the
  // host config, but because they are passed in at runtime, we have to thread
  // them through the root constructor. Perhaps we should put them all into a
  // single type, like a DynamicHostConfig that is defined by the renderer.
  identifierPrefix, onRecoverableError, transitionCallbacks) {
    var root = new FiberRootNode(containerInfo, tag, hydrate, identifierPrefix, onRecoverableError);
    // stateNode is any.


    var uninitializedFiber = createHostRootFiber(tag, isStrictMode);
    root.current = uninitializedFiber;
    uninitializedFiber.stateNode = root;

    {
      var initialCache = createCache();
      retainCache(initialCache); // The pooledCache is a fresh cache instance that is used temporarily
      // for newly mounted boundaries during a render. In general, the
      // pooledCache is always cleared from the root at the end of a render:
      // it is either released when render commits, or moved to an Offscreen
      // component if rendering suspends. Because the lifetime of the pooled
      // cache is distinct from the main memoizedState.cache, it must be
      // retained separately.

      root.pooledCache = initialCache;
      retainCache(initialCache);
      var initialState = {
        element: initialChildren,
        isDehydrated: hydrate,
        cache: initialCache,
        transitions: null
      };
      uninitializedFiber.memoizedState = initialState;
    }

    initializeUpdateQueue(uninitializedFiber);
    return root;
  }