  // Prefix measurements so that it's possible to filter them.
  // Longer prefixes are hard to read in DevTools.
  var reactEmoji = "\u269B";
  var warningEmoji = "\u26D4";
  var supportsUserTiming = typeof performance !== 'undefined' && typeof performance.mark === 'function' && typeof performance.clearMarks === 'function' && typeof performance.measure === 'function' && typeof performance.clearMeasures === 'function'; // Keep track of current fiber so that we know the path to unwind on pause.
  // TODO: this looks the same as nextUnitOfWork in scheduler. Can we unify them?

  var currentFiber = null; // If we're in the middle of user code, which fiber and method is it?
  // Reusing `currentFiber` would be confusing for this because user code fiber
  // can change during commit phase too, but we don't need to unwind it (since
  // lifecycles in the commit phase don't resemble a tree).

  var currentPhase = null;
  var currentPhaseFiber = null; // Did lifecycle hook schedule an update? This is often a performance problem,
  // so we will keep track of it, and include it in the report.
  // Track commits caused by cascading updates.

  var isCommitting = false;
  var hasScheduledUpdateInCurrentCommit = false;
  var hasScheduledUpdateInCurrentPhase = false;
  var commitCountInCurrentWorkLoop = 0;
  var effectCountInCurrentCommit = 0;
  // to avoid stretch the commit phase with measurement overhead.

  var labelsInCurrentCommit = new Set();

  var formatMarkName = function (markName) {
    return reactEmoji + " " + markName;
  };

  var formatLabel = function (label, warning) {
    var prefix = warning ? warningEmoji + " " : reactEmoji + " ";
    var suffix = warning ? " Warning: " + warning : '';
    return "" + prefix + label + suffix;
  };

  var beginMark = function (markName) {
    performance.mark(formatMarkName(markName));
  };

  var clearMark = function (markName) {
    performance.clearMarks(formatMarkName(markName));
  };

  var endMark = function (label, markName, warning) {
    var formattedMarkName = formatMarkName(markName);
    var formattedLabel = formatLabel(label, warning);

    try {
      performance.measure(formattedLabel, formattedMarkName);
    } catch (err) {} // If previous mark was missing for some reason, this will throw.
    // This could only happen if React crashed in an unexpected place earlier.
    // Don't pile on with more errors.
    // Clear marks immediately to avoid growing buffer.


    performance.clearMarks(formattedMarkName);
    performance.clearMeasures(formattedLabel);
  };

  var getFiberMarkName = function (label, debugID) {
    return label + " (#" + debugID + ")";
  };

  var getFiberLabel = function (componentName, isMounted, phase) {
    if (phase === null) {
      // These are composite component total time measurements.
      return componentName + " [" + (isMounted ? 'update' : 'mount') + "]";
    } else {
      // Composite component methods.
      return componentName + "." + phase;
    }
  };

  var beginFiberMark = function (fiber, phase) {
    var componentName = getComponentName(fiber.type) || 'Unknown';
    var debugID = fiber._debugID;
    var isMounted = fiber.alternate !== null;
    var label = getFiberLabel(componentName, isMounted, phase);

    if (isCommitting && labelsInCurrentCommit.has(label)) {
      // During the commit phase, we don't show duplicate labels because
      // there is a fixed overhead for every measurement, and we don't
      // want to stretch the commit phase beyond necessary.
      return false;
    }

    labelsInCurrentCommit.add(label);
    var markName = getFiberMarkName(label, debugID);
    beginMark(markName);
    return true;
  };

  var clearFiberMark = function (fiber, phase) {
    var componentName = getComponentName(fiber.type) || 'Unknown';
    var debugID = fiber._debugID;
    var isMounted = fiber.alternate !== null;
    var label = getFiberLabel(componentName, isMounted, phase);
    var markName = getFiberMarkName(label, debugID);
    clearMark(markName);
  };

  var endFiberMark = function (fiber, phase, warning) {
    var componentName = getComponentName(fiber.type) || 'Unknown';
    var debugID = fiber._debugID;
    var isMounted = fiber.alternate !== null;
    var label = getFiberLabel(componentName, isMounted, phase);
    var markName = getFiberMarkName(label, debugID);
    endMark(label, markName, warning);
  };

  var shouldIgnoreFiber = function (fiber) {
    // Host components should be skipped in the timeline.
    // We could check typeof fiber.type, but does this work with RN?
    switch (fiber.tag) {
      case HostRoot:
      case HostComponent:
      case HostText:
      case HostPortal:
      case Fragment:
      case ContextProvider:
      case ContextConsumer:
      case Mode:
        return true;

      default:
        return false;
    }
  };

  var clearPendingPhaseMeasurement = function () {
    if (currentPhase !== null && currentPhaseFiber !== null) {
      clearFiberMark(currentPhaseFiber, currentPhase);
    }

    currentPhaseFiber = null;
    currentPhase = null;
    hasScheduledUpdateInCurrentPhase = false;
  };

  var pauseTimers = function () {
    // Stops all currently active measurements so that they can be resumed
    // if we continue in a later deferred loop from the same unit of work.
    var fiber = currentFiber;

    while (fiber) {
      if (fiber._debugIsCurrentlyTiming) {
        endFiberMark(fiber, null, null);
      }

      fiber = fiber.return;
    }
  };

  var resumeTimersRecursively = function (fiber) {
    if (fiber.return !== null) {
      resumeTimersRecursively(fiber.return);
    }

    if (fiber._debugIsCurrentlyTiming) {
      beginFiberMark(fiber, null);
    }
  };

  var resumeTimers = function () {
    // Resumes all measurements that were active during the last deferred loop.
    if (currentFiber !== null) {
      resumeTimersRecursively(currentFiber);
    }
  };

  function recordEffect() {
    {
      effectCountInCurrentCommit++;
    }
  }
  function recordScheduleUpdate() {
    {
      if (isCommitting) {
        hasScheduledUpdateInCurrentCommit = true;
      }

      if (currentPhase !== null && currentPhase !== 'componentWillMount' && currentPhase !== 'componentWillReceiveProps') {
        hasScheduledUpdateInCurrentPhase = true;
      }
    }
  }
  function startWorkTimer(fiber) {
    {
      if (!supportsUserTiming || shouldIgnoreFiber(fiber)) {
        return;
      } // If we pause, this is the fiber to unwind from.


      currentFiber = fiber;

      if (!beginFiberMark(fiber, null)) {
        return;
      }

      fiber._debugIsCurrentlyTiming = true;
    }
  }
  function cancelWorkTimer(fiber) {
    {
      if (!supportsUserTiming || shouldIgnoreFiber(fiber)) {
        return;
      } // Remember we shouldn't complete measurement for this fiber.
      // Otherwise flamechart will be deep even for small updates.


      fiber._debugIsCurrentlyTiming = false;
      clearFiberMark(fiber, null);
    }
  }
  function stopWorkTimer(fiber) {
    {
      if (!supportsUserTiming || shouldIgnoreFiber(fiber)) {
        return;
      } // If we pause, its parent is the fiber to unwind from.


      currentFiber = fiber.return;

      if (!fiber._debugIsCurrentlyTiming) {
        return;
      }

      fiber._debugIsCurrentlyTiming = false;
      endFiberMark(fiber, null, null);
    }
  }
  function stopFailedWorkTimer(fiber) {
    {
      if (!supportsUserTiming || shouldIgnoreFiber(fiber)) {
        return;
      } // If we pause, its parent is the fiber to unwind from.


      currentFiber = fiber.return;

      if (!fiber._debugIsCurrentlyTiming) {
        return;
      }

      fiber._debugIsCurrentlyTiming = false;
      var warning = fiber.tag === SuspenseComponent ? 'Rendering was suspended' : 'An error was thrown inside this error boundary';
      endFiberMark(fiber, null, warning);
    }
  }
  function startPhaseTimer(fiber, phase) {
    {
      if (!supportsUserTiming) {
        return;
      }

      clearPendingPhaseMeasurement();

      if (!beginFiberMark(fiber, phase)) {
        return;
      }

      currentPhaseFiber = fiber;
      currentPhase = phase;
    }
  }
  function stopPhaseTimer() {
    {
      if (!supportsUserTiming) {
        return;
      }

      if (currentPhase !== null && currentPhaseFiber !== null) {
        var warning = hasScheduledUpdateInCurrentPhase ? 'Scheduled a cascading update' : null;
        endFiberMark(currentPhaseFiber, currentPhase, warning);
      }

      currentPhase = null;
      currentPhaseFiber = null;
    }
  }
  function startWorkLoopTimer(nextUnitOfWork) {
    {
      currentFiber = nextUnitOfWork;

      if (!supportsUserTiming) {
        return;
      }

      commitCountInCurrentWorkLoop = 0; // This is top level call.
      // Any other measurements are performed within.

      beginMark('(React Tree Reconciliation)'); // Resume any measurements that were in progress during the last loop.

      resumeTimers();
    }
  }
  function stopWorkLoopTimer(interruptedBy, didCompleteRoot) {
    {
      if (!supportsUserTiming) {
        return;
      }

      var warning = null;

      if (interruptedBy !== null) {
        if (interruptedBy.tag === HostRoot) {
          warning = 'A top-level update interrupted the previous render';
        } else {
          var componentName = getComponentName(interruptedBy.type) || 'Unknown';
          warning = "An update to " + componentName + " interrupted the previous render";
        }
      } else if (commitCountInCurrentWorkLoop > 1) {
        warning = 'There were cascading updates';
      }

      commitCountInCurrentWorkLoop = 0;
      var label = didCompleteRoot ? '(React Tree Reconciliation: Completed Root)' : '(React Tree Reconciliation: Yielded)'; // Pause any measurements until the next loop.

      pauseTimers();
      endMark(label, '(React Tree Reconciliation)', warning);
    }
  }
  function startCommitTimer() {
    {
      if (!supportsUserTiming) {
        return;
      }

      isCommitting = true;
      hasScheduledUpdateInCurrentCommit = false;
      labelsInCurrentCommit.clear();
      beginMark('(Committing Changes)');
    }
  }
  function stopCommitTimer() {
    {
      if (!supportsUserTiming) {
        return;
      }

      var warning = null;

      if (hasScheduledUpdateInCurrentCommit) {
        warning = 'Lifecycle hook scheduled a cascading update';
      } else if (commitCountInCurrentWorkLoop > 0) {
        warning = 'Caused by a cascading update in earlier commit';
      }

      hasScheduledUpdateInCurrentCommit = false;
      commitCountInCurrentWorkLoop++;
      isCommitting = false;
      labelsInCurrentCommit.clear();
      endMark('(Committing Changes)', '(Committing Changes)', warning);
    }
  }
  function startCommitSnapshotEffectsTimer() {
    {
      if (!supportsUserTiming) {
        return;
      }

      effectCountInCurrentCommit = 0;
      beginMark('(Committing Snapshot Effects)');
    }
  }
  function stopCommitSnapshotEffectsTimer() {
    {
      if (!supportsUserTiming) {
        return;
      }

      var count = effectCountInCurrentCommit;
      effectCountInCurrentCommit = 0;
      endMark("(Committing Snapshot Effects: " + count + " Total)", '(Committing Snapshot Effects)', null);
    }
  }
  function startCommitHostEffectsTimer() {
    {
      if (!supportsUserTiming) {
        return;
      }

      effectCountInCurrentCommit = 0;
      beginMark('(Committing Host Effects)');
    }
  }
  function stopCommitHostEffectsTimer() {
    {
      if (!supportsUserTiming) {
        return;
      }

      var count = effectCountInCurrentCommit;
      effectCountInCurrentCommit = 0;
      endMark("(Committing Host Effects: " + count + " Total)", '(Committing Host Effects)', null);
    }
  }
  function startCommitLifeCyclesTimer() {
    {
      if (!supportsUserTiming) {
        return;
      }

      effectCountInCurrentCommit = 0;
      beginMark('(Calling Lifecycle Methods)');
    }
  }
  function stopCommitLifeCyclesTimer() {
    {
      if (!supportsUserTiming) {
        return;
      }

      var count = effectCountInCurrentCommit;
      effectCountInCurrentCommit = 0;
      endMark("(Calling Lifecycle Methods: " + count + " Total)", '(Calling Lifecycle Methods)', null);
    }
  }