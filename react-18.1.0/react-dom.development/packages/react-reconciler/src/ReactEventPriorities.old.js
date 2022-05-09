  var DiscreteEventPriority = SyncLane;
  var ContinuousEventPriority = InputContinuousLane;
  var DefaultEventPriority = DefaultLane;
  var IdleEventPriority = IdleLane;
  var currentUpdatePriority = NoLane;
  function getCurrentUpdatePriority() {
    return currentUpdatePriority;
  }
  function setCurrentUpdatePriority(newPriority) {
    currentUpdatePriority = newPriority;
  }
  function runWithPriority(priority, fn) {
    var previousPriority = currentUpdatePriority;

    try {
      currentUpdatePriority = priority;
      return fn();
    } finally {
      currentUpdatePriority = previousPriority;
    }
  }
  function higherEventPriority(a, b) {
    return a !== 0 && a < b ? a : b;
  }
  function lowerEventPriority(a, b) {
    return a === 0 || a > b ? a : b;
  }
  function isHigherEventPriority(a, b) {
    return a !== 0 && a < b;
  }
  function lanesToEventPriority(lanes) {
    var lane = getHighestPriorityLane(lanes);

    if (!isHigherEventPriority(DiscreteEventPriority, lane)) {
      return DiscreteEventPriority;
    }

    if (!isHigherEventPriority(ContinuousEventPriority, lane)) {
      return ContinuousEventPriority;
    }

    if (includesNonIdleWork(lane)) {
      return DefaultEventPriority;
    }

    return IdleEventPriority;
  }