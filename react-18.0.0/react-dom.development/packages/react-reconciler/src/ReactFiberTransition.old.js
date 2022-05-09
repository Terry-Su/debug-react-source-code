  // used during the previous render by placing it here, on the stack.

  var resumedCache = createCursor(null);

  function peekCacheFromPool() {
    // If we're rendering inside a Suspense boundary that is currently hidden,
    // we should use the same cache that we used during the previous render, if
    // one exists.


    var cacheResumedFromPreviousRender = resumedCache.current;

    if (cacheResumedFromPreviousRender !== null) {
      return cacheResumedFromPreviousRender;
    } // Otherwise, check the root's cache pool.


    var root = getWorkInProgressRoot();
    var cacheFromRootCachePool = root.pooledCache;
    return cacheFromRootCachePool;
  }

  function requestCacheFromPool(renderLanes) {
    // Similar to previous function, except if there's not already a cache in the
    // pool, we allocate a new one.
    var cacheFromPool = peekCacheFromPool();

    if (cacheFromPool !== null) {
      return cacheFromPool;
    } // Create a fresh cache and add it to the root cache pool. A cache can have
    // multiple owners:
    // - A cache pool that lives on the FiberRoot. This is where all fresh caches
    //   are originally created (TODO: except during refreshes, until we implement
    //   this correctly). The root takes ownership immediately when the cache is
    //   created. Conceptually, root.pooledCache is an Option<Arc<Cache>> (owned),
    //   and the return value of this function is a &Arc<Cache> (borrowed).
    // - One of several fiber types: host root, cache boundary, suspense
    //   component. These retain and release in the commit phase.


    var root = getWorkInProgressRoot();
    var freshCache = createCache();
    root.pooledCache = freshCache;
    retainCache(freshCache);

    if (freshCache !== null) {
      root.pooledCacheLanes |= renderLanes;
    }

    return freshCache;
  }
  function pushTransition(offscreenWorkInProgress, prevCachePool) {
    {
      if (prevCachePool === null) {
        push(resumedCache, resumedCache.current, offscreenWorkInProgress);
      } else {
        push(resumedCache, prevCachePool.pool, offscreenWorkInProgress);
      }
    }
  }
  function popTransition(workInProgress) {
    {
      pop(resumedCache, workInProgress);
    }
  }
  function getSuspendedCache() {
    // cache that would have been used to render fresh data during this render,
    // if there was any, so that we can resume rendering with the same cache when
    // we receive more data.


    var cacheFromPool = peekCacheFromPool();

    if (cacheFromPool === null) {
      return null;
    }

    return {
      // We must also save the parent, so that when we resume we can detect
      // a refresh.
      parent:  CacheContext._currentValue ,
      pool: cacheFromPool
    };
  }
  function getOffscreenDeferredCache() {

    var cacheFromPool = peekCacheFromPool();

    if (cacheFromPool === null) {
      return null;
    }

    return {
      // We must also store the parent, so that when we resume we can detect
      // a refresh.
      parent:  CacheContext._currentValue ,
      pool: cacheFromPool
    };
  }