  var Scheduler_runWithPriority = unstable_runWithPriority,
      Scheduler_scheduleCallback = unstable_scheduleCallback,
      Scheduler_cancelCallback = unstable_cancelCallback,
      Scheduler_shouldYield = unstable_shouldYield,
      Scheduler_requestPaint = unstable_requestPaint,
      Scheduler_now$1 = unstable_now,
      Scheduler_getCurrentPriorityLevel = unstable_getCurrentPriorityLevel,
      Scheduler_ImmediatePriority = unstable_ImmediatePriority,
      Scheduler_UserBlockingPriority = unstable_UserBlockingPriority,
      Scheduler_NormalPriority = unstable_NormalPriority,
      Scheduler_LowPriority = unstable_LowPriority,
      Scheduler_IdlePriority = unstable_IdlePriority;

  {
    // Provide explicit error message when production+profiling bundle of e.g.
    // react-dom is used with production (non-profiling) bundle of
    // scheduler/tracing
    if (!(__interactionsRef != null && __interactionsRef.current != null)) {
      {
        throw Error( "It is not supported to run the profiling version of a renderer (for example, `react-dom/profiling`) without also replacing the `scheduler/tracing` module with `scheduler/tracing-profiling`. Your bundler might have a setting for aliasing both modules. Learn more at https://reactjs.org/link/profiling" );
      }
    }
  }

  var fakeCallbackNode = {}; // Except for NoPriority, these correspond to Scheduler priorities. We use
  // ascending numbers so we can compare them like numbers. They start at 90 to
  // avoid clashing with Scheduler's priorities.

  var ImmediatePriority$1 = 99;
  var UserBlockingPriority$2 = 98;
  var NormalPriority$1 = 97;
  var LowPriority$1 = 96;
  var IdlePriority$1 = 95; // NoPriority is the absence of priority. Also React-only.

  var NoPriority$1 = 90;
  var shouldYield = Scheduler_shouldYield;
  var requestPaint = // Fall back gracefully if we're running an older version of Scheduler.
  Scheduler_requestPaint !== undefined ? Scheduler_requestPaint : function () {};
  var syncQueue = null;
  var immediateQueueCallbackNode = null;
  var isFlushingSyncQueue = false;
  var initialTimeMs$1 = Scheduler_now$1(); // If the initial timestamp is reasonably small, use Scheduler's `now` directly.
  // This will be the case for modern browsers that support `performance.now`. In
  // older browsers, Scheduler falls back to `Date.now`, which returns a Unix
  // timestamp. In that case, subtract the module initialization time to simulate
  // the behavior of performance.now and keep our times small enough to fit
  // within 32 bits.
  // TODO: Consider lifting this into Scheduler.

  var now = initialTimeMs$1 < 10000 ? Scheduler_now$1 : function () {
    return Scheduler_now$1() - initialTimeMs$1;
  };
  function getCurrentPriorityLevel() {
    switch (Scheduler_getCurrentPriorityLevel()) {
      case Scheduler_ImmediatePriority:
        return ImmediatePriority$1;

      case Scheduler_UserBlockingPriority:
        return UserBlockingPriority$2;

      case Scheduler_NormalPriority:
        return NormalPriority$1;

      case Scheduler_LowPriority:
        return LowPriority$1;

      case Scheduler_IdlePriority:
        return IdlePriority$1;

      default:
        {
          {
            throw Error( "Unknown priority level." );
          }
        }

    }
  }

  function reactPriorityToSchedulerPriority(reactPriorityLevel) {
    switch (reactPriorityLevel) {
      case ImmediatePriority$1:
        return Scheduler_ImmediatePriority;

      case UserBlockingPriority$2:
        return Scheduler_UserBlockingPriority;

      case NormalPriority$1:
        return Scheduler_NormalPriority;

      case LowPriority$1:
        return Scheduler_LowPriority;

      case IdlePriority$1:
        return Scheduler_IdlePriority;

      default:
        {
          {
            throw Error( "Unknown priority level." );
          }
        }

    }
  }

  function runWithPriority$1(reactPriorityLevel, fn) {
    var priorityLevel = reactPriorityToSchedulerPriority(reactPriorityLevel);
    return Scheduler_runWithPriority(priorityLevel, fn);
  }
  function scheduleCallback(reactPriorityLevel, callback, options) {
    var priorityLevel = reactPriorityToSchedulerPriority(reactPriorityLevel);
    return Scheduler_scheduleCallback(priorityLevel, callback, options);
  }
  function scheduleSyncCallback(callback) {
    // Push this callback into an internal queue. We'll flush these either in
    // the next tick, or earlier if something calls `flushSyncCallbackQueue`.
    if (syncQueue === null) {
      syncQueue = [callback]; // Flush the queue in the next tick, at the earliest.

      immediateQueueCallbackNode = Scheduler_scheduleCallback(Scheduler_ImmediatePriority, flushSyncCallbackQueueImpl);
    } else {
      // Push onto existing queue. Don't need to schedule a callback because
      // we already scheduled one when we created the queue.
      syncQueue.push(callback);
    }

    return fakeCallbackNode;
  }
  function cancelCallback(callbackNode) {
    if (callbackNode !== fakeCallbackNode) {
      Scheduler_cancelCallback(callbackNode);
    }
  }
  function flushSyncCallbackQueue() {
    if (immediateQueueCallbackNode !== null) {
      var node = immediateQueueCallbackNode;
      immediateQueueCallbackNode = null;
      Scheduler_cancelCallback(node);
    }

    flushSyncCallbackQueueImpl();
  }

  function flushSyncCallbackQueueImpl() {
    if (!isFlushingSyncQueue && syncQueue !== null) {
      // Prevent re-entrancy.
      isFlushingSyncQueue = true;
      var i = 0;

      {
        try {
          var _isSync2 = true;
          var _queue = syncQueue;
          runWithPriority$1(ImmediatePriority$1, function () {
            for (; i < _queue.length; i++) {
              var callback = _queue[i];

              do {
                callback = callback(_isSync2);
              } while (callback !== null);
            }
          });
          syncQueue = null;
        } catch (error) {
          // If something throws, leave the remaining callbacks on the queue.
          if (syncQueue !== null) {
            syncQueue = syncQueue.slice(i + 1);
          } // Resume flushing in the next tick


          Scheduler_scheduleCallback(Scheduler_ImmediatePriority, flushSyncCallbackQueue);
          throw error;
        } finally {
          isFlushingSyncQueue = false;
        }
      }
    }
  }