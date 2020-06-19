
  function FiberRootNode(containerInfo, tag, hydrate) {
    this.tag = tag;
    this.current = null;
    this.containerInfo = containerInfo;
    this.pendingChildren = null;
    this.pingCache = null;
    this.finishedExpirationTime = NoWork;
    this.finishedWork = null;
    this.timeoutHandle = noTimeout;
    this.context = null;
    this.pendingContext = null;
    this.hydrate = hydrate;
    this.callbackNode = null;
    this.callbackPriority = NoPriority;
    this.firstPendingTime = NoWork;
    this.firstSuspendedTime = NoWork;
    this.lastSuspendedTime = NoWork;
    this.nextKnownPendingLevel = NoWork;
    this.lastPingedTime = NoWork;
    this.lastExpiredTime = NoWork;

    {
      this.interactionThreadID = unstable_getThreadID();
      this.memoizedInteractions = new Set();
      this.pendingInteractionMap = new Map();
    }
  }

  function createFiberRoot(containerInfo, tag, hydrate, hydrationCallbacks) {
    var root = new FiberRootNode(containerInfo, tag, hydrate);
    // stateNode is any.


    var uninitializedFiber = createHostRootFiber(tag);
    root.current = uninitializedFiber;
    uninitializedFiber.stateNode = root;
    initializeUpdateQueue(uninitializedFiber);
    return root;
  }
  function isRootSuspendedAtTime(root, expirationTime) {
    var firstSuspendedTime = root.firstSuspendedTime;
    var lastSuspendedTime = root.lastSuspendedTime;
    return firstSuspendedTime !== NoWork && firstSuspendedTime >= expirationTime && lastSuspendedTime <= expirationTime;
  }
  function markRootSuspendedAtTime(root, expirationTime) {
    var firstSuspendedTime = root.firstSuspendedTime;
    var lastSuspendedTime = root.lastSuspendedTime;

    if (firstSuspendedTime < expirationTime) {
      root.firstSuspendedTime = expirationTime;
    }

    if (lastSuspendedTime > expirationTime || firstSuspendedTime === NoWork) {
      root.lastSuspendedTime = expirationTime;
    }

    if (expirationTime <= root.lastPingedTime) {
      root.lastPingedTime = NoWork;
    }

    if (expirationTime <= root.lastExpiredTime) {
      root.lastExpiredTime = NoWork;
    }
  }
  function markRootUpdatedAtTime(root, expirationTime) {
    // Update the range of pending times
    var firstPendingTime = root.firstPendingTime;

    if (expirationTime > firstPendingTime) {
      root.firstPendingTime = expirationTime;
    } // Update the range of suspended times. Treat everything lower priority or
    // equal to this update as unsuspended.


    var firstSuspendedTime = root.firstSuspendedTime;

    if (firstSuspendedTime !== NoWork) {
      if (expirationTime >= firstSuspendedTime) {
        // The entire suspended range is now unsuspended.
        root.firstSuspendedTime = root.lastSuspendedTime = root.nextKnownPendingLevel = NoWork;
      } else if (expirationTime >= root.lastSuspendedTime) {
        root.lastSuspendedTime = expirationTime + 1;
      } // This is a pending level. Check if it's higher priority than the next
      // known pending level.


      if (expirationTime > root.nextKnownPendingLevel) {
        root.nextKnownPendingLevel = expirationTime;
      }
    }
  }
  function markRootFinishedAtTime(root, finishedExpirationTime, remainingExpirationTime) {
    // Update the range of pending times
    root.firstPendingTime = remainingExpirationTime; // Update the range of suspended times. Treat everything higher priority or
    // equal to this update as unsuspended.

    if (finishedExpirationTime <= root.lastSuspendedTime) {
      // The entire suspended range is now unsuspended.
      root.firstSuspendedTime = root.lastSuspendedTime = root.nextKnownPendingLevel = NoWork;
    } else if (finishedExpirationTime <= root.firstSuspendedTime) {
      // Part of the suspended range is now unsuspended. Narrow the range to
      // include everything between the unsuspended time (non-inclusive) and the
      // last suspended time.
      root.firstSuspendedTime = finishedExpirationTime - 1;
    }

    if (finishedExpirationTime <= root.lastPingedTime) {
      // Clear the pinged time
      root.lastPingedTime = NoWork;
    }

    if (finishedExpirationTime <= root.lastExpiredTime) {
      // Clear the expired time
      root.lastExpiredTime = NoWork;
    }
  }
  function markRootExpiredAtTime(root, expirationTime) {
    var lastExpiredTime = root.lastExpiredTime;

    if (lastExpiredTime === NoWork || lastExpiredTime > expirationTime) {
      root.lastExpiredTime = expirationTime;
    }
  }