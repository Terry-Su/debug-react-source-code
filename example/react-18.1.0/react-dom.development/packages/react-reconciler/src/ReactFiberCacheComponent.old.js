  // replace it with a lightweight shim that only has the features we use.

  var AbortControllerLocal =  typeof AbortController !== 'undefined' ? AbortController : function AbortControllerShim() {
    var listeners = [];
    var signal = this.signal = {
      aborted: false,
      addEventListener: function (type, listener) {
        listeners.push(listener);
      }
    };

    this.abort = function () {
      signal.aborted = true;
      listeners.forEach(function (listener) {
        return listener();
      });
    };
  } ;
  // Intentionally not named imports because Rollup would
  // use dynamic dispatch for CommonJS interop named imports.
  var scheduleCallback$1 = unstable_scheduleCallback,
      NormalPriority$1 = unstable_NormalPriority;
  var CacheContext =  {
    $$typeof: REACT_CONTEXT_TYPE,
    // We don't use Consumer/Provider for Cache components. So we'll cheat.
    Consumer: null,
    Provider: null,
    // We'll initialize these at the root.
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0,
    _defaultValue: null,
    _globalName: null
  } ;

  {
    CacheContext._currentRenderer = null;
    CacheContext._currentRenderer2 = null;
  } // Creates a new empty Cache instance with a ref-count of 0. The caller is responsible
  // for retaining the cache once it is in use (retainCache), and releasing the cache
  // once it is no longer needed (releaseCache).


  function createCache() {

    var cache = {
      controller: new AbortControllerLocal(),
      data: new Map(),
      refCount: 0
    };
    return cache;
  }
  function retainCache(cache) {

    {
      if (cache.controller.signal.aborted) {
        warn('A cache instance was retained after it was already freed. ' + 'This likely indicates a bug in React.');
      }
    }

    cache.refCount++;
  } // Cleanup a cache instance, potentially freeing it if there are no more references

  function releaseCache(cache) {

    cache.refCount--;

    {
      if (cache.refCount < 0) {
        warn('A cache instance was released after it was already freed. ' + 'This likely indicates a bug in React.');
      }
    }

    if (cache.refCount === 0) {
      scheduleCallback$1(NormalPriority$1, function () {
        cache.controller.abort();
      });
    }
  }
  function pushCacheProvider(workInProgress, cache) {

    pushProvider(workInProgress, CacheContext, cache);
  }
  function popCacheProvider(workInProgress, cache) {

    popProvider(CacheContext, workInProgress);
  }