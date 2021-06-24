  var now$1 = unstable_now;
  var commitTime = 0;
  var profilerStartTime = -1;

  function getCommitTime() {
    return commitTime;
  }

  function recordCommitTime() {

    commitTime = now$1();
  }

  function startProfilerTimer(fiber) {

    profilerStartTime = now$1();

    if (fiber.actualStartTime < 0) {
      fiber.actualStartTime = now$1();
    }
  }

  function stopProfilerTimerIfRunning(fiber) {

    profilerStartTime = -1;
  }

  function stopProfilerTimerIfRunningAndRecordDelta(fiber, overrideBaseTime) {

    if (profilerStartTime >= 0) {
      var elapsedTime = now$1() - profilerStartTime;
      fiber.actualDuration += elapsedTime;

      if (overrideBaseTime) {
        fiber.selfBaseDuration = elapsedTime;
      }

      profilerStartTime = -1;
    }
  }

  function transferActualDuration(fiber) {
    // Transfer time spent rendering these children so we don't lose it
    // after we rerender. This is used as a helper in special cases
    // where we should count the work of multiple passes.
    var child = fiber.child;

    while (child) {
      fiber.actualDuration += child.actualDuration;
      child = child.sibling;
    }
  }