  var now$1 = unstable_now;
  var commitTime = 0;
  var layoutEffectStartTime = -1;
  var profilerStartTime = -1;
  var passiveEffectStartTime = -1;
  /**
   * Tracks whether the current update was a nested/cascading update (scheduled from a layout effect).
   *
   * The overall sequence is:
   *   1. render
   *   2. commit (and call `onRender`, `onCommit`)
   *   3. check for nested updates
   *   4. flush passive effects (and call `onPostCommit`)
   *
   * Nested updates are identified in step 3 above,
   * but step 4 still applies to the work that was just committed.
   * We use two flags to track nested updates then:
   * one tracks whether the upcoming update is a nested update,
   * and the other tracks whether the current update was a nested update.
   * The first value gets synced to the second at the start of the render phase.
   */

  var currentUpdateIsNested = false;
  var nestedUpdateScheduled = false;

  function isCurrentUpdateNested() {
    return currentUpdateIsNested;
  }

  function markNestedUpdateScheduled() {
    {
      nestedUpdateScheduled = true;
    }
  }

  function resetNestedUpdateFlag() {
    {
      currentUpdateIsNested = false;
      nestedUpdateScheduled = false;
    }
  }

  function syncNestedUpdateFlag() {
    {
      currentUpdateIsNested = nestedUpdateScheduled;
      nestedUpdateScheduled = false;
    }
  }

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

  function recordLayoutEffectDuration(fiber) {

    if (layoutEffectStartTime >= 0) {
      var elapsedTime = now$1() - layoutEffectStartTime;
      layoutEffectStartTime = -1; // Store duration on the next nearest Profiler ancestor
      // Or the root (for the DevTools Profiler to read)

      var parentFiber = fiber.return;

      while (parentFiber !== null) {
        switch (parentFiber.tag) {
          case HostRoot:
            var root = parentFiber.stateNode;
            root.effectDuration += elapsedTime;
            return;

          case Profiler:
            var parentStateNode = parentFiber.stateNode;
            parentStateNode.effectDuration += elapsedTime;
            return;
        }

        parentFiber = parentFiber.return;
      }
    }
  }

  function recordPassiveEffectDuration(fiber) {

    if (passiveEffectStartTime >= 0) {
      var elapsedTime = now$1() - passiveEffectStartTime;
      passiveEffectStartTime = -1; // Store duration on the next nearest Profiler ancestor
      // Or the root (for the DevTools Profiler to read)

      var parentFiber = fiber.return;

      while (parentFiber !== null) {
        switch (parentFiber.tag) {
          case HostRoot:
            var root = parentFiber.stateNode;

            if (root !== null) {
              root.passiveEffectDuration += elapsedTime;
            }

            return;

          case Profiler:
            var parentStateNode = parentFiber.stateNode;

            if (parentStateNode !== null) {
              // Detached fibers have their state node cleared out.
              // In this case, the return pointer is also cleared out,
              // so we won't be able to report the time spent in this Profiler's subtree.
              parentStateNode.passiveEffectDuration += elapsedTime;
            }

            return;
        }

        parentFiber = parentFiber.return;
      }
    }
  }

  function startLayoutEffectTimer() {

    layoutEffectStartTime = now$1();
  }

  function startPassiveEffectTimer() {

    passiveEffectStartTime = now$1();
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