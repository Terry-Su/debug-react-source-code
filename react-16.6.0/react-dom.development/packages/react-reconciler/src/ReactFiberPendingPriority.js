

// TODO: Offscreen updates should never suspend. However, a promise that
// suspended inside an offscreen subtree should be able to ping at the priority
// of the outer render.

function markPendingPriorityLevel(root, expirationTime) {
  // If there's a gap between completing a failed root and retrying it,
  // additional updates may be scheduled. Clear `didError`, in case the update
  // is sufficient to fix the error.
  root.didError = false;

  // Update the latest and earliest pending times
  var earliestPendingTime = root.earliestPendingTime;
  if (earliestPendingTime === NoWork) {
    // No other pending updates.
    root.earliestPendingTime = root.latestPendingTime = expirationTime;
  } else {
    if (earliestPendingTime > expirationTime) {
      // This is the earliest pending update.
      root.earliestPendingTime = expirationTime;
    } else {
      var latestPendingTime = root.latestPendingTime;
      if (latestPendingTime < expirationTime) {
        // This is the latest pending update
        root.latestPendingTime = expirationTime;
      }
    }
  }
  findNextExpirationTimeToWorkOn(expirationTime, root);
}

function markCommittedPriorityLevels(root, earliestRemainingTime) {
  root.didError = false;

  if (earliestRemainingTime === NoWork) {
    // Fast path. There's no remaining work. Clear everything.
    root.earliestPendingTime = NoWork;
    root.latestPendingTime = NoWork;
    root.earliestSuspendedTime = NoWork;
    root.latestSuspendedTime = NoWork;
    root.latestPingedTime = NoWork;
    findNextExpirationTimeToWorkOn(NoWork, root);
    return;
  }

  // Let's see if the previous latest known pending level was just flushed.
  var latestPendingTime = root.latestPendingTime;
  if (latestPendingTime !== NoWork) {
    if (latestPendingTime < earliestRemainingTime) {
      // We've flushed all the known pending levels.
      root.earliestPendingTime = root.latestPendingTime = NoWork;
    } else {
      var earliestPendingTime = root.earliestPendingTime;
      if (earliestPendingTime < earliestRemainingTime) {
        // We've flushed the earliest known pending level. Set this to the
        // latest pending time.
        root.earliestPendingTime = root.latestPendingTime;
      }
    }
  }

  // Now let's handle the earliest remaining level in the whole tree. We need to
  // decide whether to treat it as a pending level or as suspended. Check
  // it falls within the range of known suspended levels.

  var earliestSuspendedTime = root.earliestSuspendedTime;
  if (earliestSuspendedTime === NoWork) {
    // There's no suspended work. Treat the earliest remaining level as a
    // pending level.
    markPendingPriorityLevel(root, earliestRemainingTime);
    findNextExpirationTimeToWorkOn(NoWork, root);
    return;
  }

  var latestSuspendedTime = root.latestSuspendedTime;
  if (earliestRemainingTime > latestSuspendedTime) {
    // The earliest remaining level is later than all the suspended work. That
    // means we've flushed all the suspended work.
    root.earliestSuspendedTime = NoWork;
    root.latestSuspendedTime = NoWork;
    root.latestPingedTime = NoWork;

    // There's no suspended work. Treat the earliest remaining level as a
    // pending level.
    markPendingPriorityLevel(root, earliestRemainingTime);
    findNextExpirationTimeToWorkOn(NoWork, root);
    return;
  }

  if (earliestRemainingTime < earliestSuspendedTime) {
    // The earliest remaining time is earlier than all the suspended work.
    // Treat it as a pending update.
    markPendingPriorityLevel(root, earliestRemainingTime);
    findNextExpirationTimeToWorkOn(NoWork, root);
    return;
  }

  // The earliest remaining time falls within the range of known suspended
  // levels. We should treat this as suspended work.
  findNextExpirationTimeToWorkOn(NoWork, root);
}

function hasLowerPriorityWork(root, erroredExpirationTime) {
  var latestPendingTime = root.latestPendingTime;
  var latestSuspendedTime = root.latestSuspendedTime;
  var latestPingedTime = root.latestPingedTime;
  return latestPendingTime !== NoWork && latestPendingTime > erroredExpirationTime || latestSuspendedTime !== NoWork && latestSuspendedTime > erroredExpirationTime || latestPingedTime !== NoWork && latestPingedTime > erroredExpirationTime;
}

function isPriorityLevelSuspended(root, expirationTime) {
  var earliestSuspendedTime = root.earliestSuspendedTime;
  var latestSuspendedTime = root.latestSuspendedTime;
  return earliestSuspendedTime !== NoWork && expirationTime >= earliestSuspendedTime && expirationTime <= latestSuspendedTime;
}

function markSuspendedPriorityLevel(root, suspendedTime) {
  root.didError = false;
  clearPing(root, suspendedTime);

  // First, check the known pending levels and update them if needed.
  var earliestPendingTime = root.earliestPendingTime;
  var latestPendingTime = root.latestPendingTime;
  if (earliestPendingTime === suspendedTime) {
    if (latestPendingTime === suspendedTime) {
      // Both known pending levels were suspended. Clear them.
      root.earliestPendingTime = root.latestPendingTime = NoWork;
    } else {
      // The earliest pending level was suspended. Clear by setting it to the
      // latest pending level.
      root.earliestPendingTime = latestPendingTime;
    }
  } else if (latestPendingTime === suspendedTime) {
    // The latest pending level was suspended. Clear by setting it to the
    // latest pending level.
    root.latestPendingTime = earliestPendingTime;
  }

  // Finally, update the known suspended levels.
  var earliestSuspendedTime = root.earliestSuspendedTime;
  var latestSuspendedTime = root.latestSuspendedTime;
  if (earliestSuspendedTime === NoWork) {
    // No other suspended levels.
    root.earliestSuspendedTime = root.latestSuspendedTime = suspendedTime;
  } else {
    if (earliestSuspendedTime > suspendedTime) {
      // This is the earliest suspended level.
      root.earliestSuspendedTime = suspendedTime;
    } else if (latestSuspendedTime < suspendedTime) {
      // This is the latest suspended level
      root.latestSuspendedTime = suspendedTime;
    }
  }

  findNextExpirationTimeToWorkOn(suspendedTime, root);
}

function markPingedPriorityLevel(root, pingedTime) {
  root.didError = false;

  // TODO: When we add back resuming, we need to ensure the progressed work
  // is thrown out and not reused during the restarted render. One way to
  // invalidate the progressed work is to restart at expirationTime + 1.
  var latestPingedTime = root.latestPingedTime;
  if (latestPingedTime === NoWork || latestPingedTime < pingedTime) {
    root.latestPingedTime = pingedTime;
  }
  findNextExpirationTimeToWorkOn(pingedTime, root);
}

function clearPing(root, completedTime) {
  // TODO: Track whether the root was pinged during the render phase. If so,
  // we need to make sure we don't lose track of it.
  var latestPingedTime = root.latestPingedTime;
  if (latestPingedTime !== NoWork && latestPingedTime <= completedTime) {
    root.latestPingedTime = NoWork;
  }
}

function findEarliestOutstandingPriorityLevel(root, renderExpirationTime) {
  var earliestExpirationTime = renderExpirationTime;

  var earliestPendingTime = root.earliestPendingTime;
  var earliestSuspendedTime = root.earliestSuspendedTime;
  if (earliestExpirationTime === NoWork || earliestPendingTime !== NoWork && earliestPendingTime < earliestExpirationTime) {
    earliestExpirationTime = earliestPendingTime;
  }
  if (earliestExpirationTime === NoWork || earliestSuspendedTime !== NoWork && earliestSuspendedTime < earliestExpirationTime) {
    earliestExpirationTime = earliestSuspendedTime;
  }
  return earliestExpirationTime;
}

function didExpireAtExpirationTime(root, currentTime) {
  var expirationTime = root.expirationTime;
  if (expirationTime !== NoWork && currentTime >= expirationTime) {
    // The root has expired. Flush all work up to the current time.
    root.nextExpirationTimeToWorkOn = currentTime;
  }
}

function findNextExpirationTimeToWorkOn(completedExpirationTime, root) {
  var earliestSuspendedTime = root.earliestSuspendedTime;
  var latestSuspendedTime = root.latestSuspendedTime;
  var earliestPendingTime = root.earliestPendingTime;
  var latestPingedTime = root.latestPingedTime;

  // Work on the earliest pending time. Failing that, work on the latest
  // pinged time.
  var nextExpirationTimeToWorkOn = earliestPendingTime !== NoWork ? earliestPendingTime : latestPingedTime;

  // If there is no pending or pinged work, check if there's suspended work
  // that's lower priority than what we just completed.
  if (nextExpirationTimeToWorkOn === NoWork && (completedExpirationTime === NoWork || latestSuspendedTime > completedExpirationTime)) {
    // The lowest priority suspended work is the work most likely to be
    // committed next. Let's start rendering it again, so that if it times out,
    // it's ready to commit.
    nextExpirationTimeToWorkOn = latestSuspendedTime;
  }

  var expirationTime = nextExpirationTimeToWorkOn;
  if (expirationTime !== NoWork && earliestSuspendedTime !== NoWork && earliestSuspendedTime < expirationTime) {
    // Expire using the earliest known expiration time.
    expirationTime = earliestSuspendedTime;
  }

  root.nextExpirationTimeToWorkOn = nextExpirationTimeToWorkOn;
  root.expirationTime = expirationTime;
}