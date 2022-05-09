  var syncQueue = null;
  var includesLegacySyncCallbacks = false;
  var isFlushingSyncQueue = false;
  function scheduleSyncCallback(callback) {
    // Push this callback into an internal queue. We'll flush these either in
    // the next tick, or earlier if something calls `flushSyncCallbackQueue`.
    if (syncQueue === null) {
      syncQueue = [callback];
    } else {
      // Push onto existing queue. Don't need to schedule a callback because
      // we already scheduled one when we created the queue.
      syncQueue.push(callback);
    }
  }
  function scheduleLegacySyncCallback(callback) {
    includesLegacySyncCallbacks = true;
    scheduleSyncCallback(callback);
  }
  function flushSyncCallbacksOnlyInLegacyMode() {
    // Only flushes the queue if there's a legacy sync callback scheduled.
    // TODO: There's only a single type of callback: performSyncOnWorkOnRoot. So
    // it might make more sense for the queue to be a list of roots instead of a
    // list of generic callbacks. Then we can have two: one for legacy roots, one
    // for concurrent roots. And this method would only flush the legacy ones.
    if (includesLegacySyncCallbacks) {
      flushSyncCallbacks();
    }
  }
  function flushSyncCallbacks() {
    if (!isFlushingSyncQueue && syncQueue !== null) {
      // Prevent re-entrance.
      isFlushingSyncQueue = true;
      var i = 0;
      var previousUpdatePriority = getCurrentUpdatePriority();

      try {
        var isSync = true;
        var queue = syncQueue; // TODO: Is this necessary anymore? The only user code that runs in this
        // queue is in the render or commit phases.

        setCurrentUpdatePriority(DiscreteEventPriority);

        for (; i < queue.length; i++) {
          var callback = queue[i];

          do {
            callback = callback(isSync);
          } while (callback !== null);
        }

        syncQueue = null;
        includesLegacySyncCallbacks = false;
      } catch (error) {
        // If something throws, leave the remaining callbacks on the queue.
        if (syncQueue !== null) {
          syncQueue = syncQueue.slice(i + 1);
        } // Resume flushing in the next tick


        scheduleCallback(ImmediatePriority, flushSyncCallbacks);
        throw error;
      } finally {
        setCurrentUpdatePriority(previousUpdatePriority);
        isFlushingSyncQueue = false;
      }
    }

    return null;
  }