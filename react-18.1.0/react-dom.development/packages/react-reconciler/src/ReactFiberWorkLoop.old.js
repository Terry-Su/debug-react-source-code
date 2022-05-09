  var ceil = Math.ceil;
  var ReactCurrentDispatcher$2 = ReactSharedInternals.ReactCurrentDispatcher,
      ReactCurrentOwner$2 = ReactSharedInternals.ReactCurrentOwner,
      ReactCurrentBatchConfig$3 = ReactSharedInternals.ReactCurrentBatchConfig,
      ReactCurrentActQueue$1 = ReactSharedInternals.ReactCurrentActQueue;
  var NoContext =
  /*             */
  0;
  var BatchedContext =
  /*               */
  1;
  var RenderContext =
  /*                */
  2;
  var CommitContext =
  /*                */
  4;
  var RootInProgress = 0;
  var RootFatalErrored = 1;
  var RootErrored = 2;
  var RootSuspended = 3;
  var RootSuspendedWithDelay = 4;
  var RootCompleted = 5;
  var RootDidNotComplete = 6; // Describes where we are in the React execution stack

  var executionContext = NoContext; // The root we're working on

  var workInProgressRoot = null; // The fiber we're working on

  var workInProgress = null; // The lanes we're rendering

  var workInProgressRootRenderLanes = NoLanes; // Stack that allows components to change the render lanes for its subtree
  // This is a superset of the lanes we started working on at the root. The only
  // case where it's different from `workInProgressRootRenderLanes` is when we
  // enter a subtree that is hidden and needs to be unhidden: Suspense and
  // Offscreen component.
  //
  // Most things in the work loop should deal with workInProgressRootRenderLanes.
  // Most things in begin/complete phases should deal with subtreeRenderLanes.

  var subtreeRenderLanes = NoLanes;
  var subtreeRenderLanesCursor = createCursor(NoLanes); // Whether to root completed, errored, suspended, etc.

  var workInProgressRootExitStatus = RootInProgress; // A fatal error, if one is thrown

  var workInProgressRootFatalError = null; // "Included" lanes refer to lanes that were worked on during this render. It's
  // slightly different than `renderLanes` because `renderLanes` can change as you
  // enter and exit an Offscreen tree. This value is the combination of all render
  // lanes for the entire render phase.

  var workInProgressRootIncludedLanes = NoLanes; // The work left over by components that were visited during this render. Only
  // includes unprocessed updates, not work in bailed out children.

  var workInProgressRootSkippedLanes = NoLanes; // Lanes that were updated (in an interleaved event) during this render.

  var workInProgressRootInterleavedUpdatedLanes = NoLanes; // Lanes that were updated during the render phase (*not* an interleaved event).

  var workInProgressRootPingedLanes = NoLanes; // Errors that are thrown during the render phase.

  var workInProgressRootConcurrentErrors = null; // These are errors that we recovered from without surfacing them to the UI.
  // We will log them once the tree commits.

  var workInProgressRootRecoverableErrors = null; // The most recent time we committed a fallback. This lets us ensure a train
  // model where we don't commit new loading states in too quick succession.

  var globalMostRecentFallbackTime = 0;
  var FALLBACK_THROTTLE_MS = 500; // The absolute time for when we should start giving up on rendering
  // more and prefer CPU suspense heuristics instead.

  var workInProgressRootRenderTargetTime = Infinity; // How long a render is supposed to take before we start following CPU
  // suspense heuristics and opt out of rendering more content.

  var RENDER_TIMEOUT_MS = 500;
  var workInProgressTransitions = null;

  function resetRenderTimer() {
    workInProgressRootRenderTargetTime = now() + RENDER_TIMEOUT_MS;
  }

  function getRenderTargetTime() {
    return workInProgressRootRenderTargetTime;
  }
  var hasUncaughtError = false;
  var firstUncaughtError = null;
  var legacyErrorBoundariesThatAlreadyFailed = null; // Only used when enableProfilerNestedUpdateScheduledHook is true;
  var rootDoesHavePassiveEffects = false;
  var rootWithPendingPassiveEffects = null;
  var pendingPassiveEffectsLanes = NoLanes;
  var pendingPassiveProfilerEffects = [];
  var pendingPassiveEffectsRemainingLanes = NoLanes;
  var pendingPassiveTransitions = null; // Use these to prevent an infinite loop of nested updates

  var NESTED_UPDATE_LIMIT = 50;
  var nestedUpdateCount = 0;
  var rootWithNestedUpdates = null;
  var isFlushingPassiveEffects = false;
  var didScheduleUpdateDuringPassiveEffects = false;
  var NESTED_PASSIVE_UPDATE_LIMIT = 50;
  var nestedPassiveUpdateCount = 0;
  var rootWithPassiveNestedUpdates = null; // If two updates are scheduled within the same event, we should treat their
  // event times as simultaneous, even if the actual clock time has advanced
  // between the first and second call.

  var currentEventTime = NoTimestamp;
  var currentEventTransitionLane = NoLanes;
  var isRunningInsertionEffect = false;
  function getWorkInProgressRoot() {
    return workInProgressRoot;
  }
  function requestEventTime() {
    if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
      // We're inside React, so it's fine to read the actual time.
      return now();
    } // We're not inside React, so we may be in the middle of a browser event.


    if (currentEventTime !== NoTimestamp) {
      // Use the same start time for all updates until we enter React again.
      return currentEventTime;
    } // This is the first update since React yielded. Compute a new start time.


    currentEventTime = now();
    return currentEventTime;
  }
  function requestUpdateLane(fiber) {
    // Special cases
    var mode = fiber.mode;

    if ((mode & ConcurrentMode) === NoMode) {
      return SyncLane;
    } else if ( (executionContext & RenderContext) !== NoContext && workInProgressRootRenderLanes !== NoLanes) {
      // This is a render phase update. These are not officially supported. The
      // old behavior is to give this the same "thread" (lanes) as
      // whatever is currently rendering. So if you call `setState` on a component
      // that happens later in the same render, it will flush. Ideally, we want to
      // remove the special case and treat them as if they came from an
      // interleaved event. Regardless, this pattern is not officially supported.
      // This behavior is only a fallback. The flag only exists until we can roll
      // out the setState warning, since existing code might accidentally rely on
      // the current behavior.
      return pickArbitraryLane(workInProgressRootRenderLanes);
    }

    var isTransition = requestCurrentTransition() !== NoTransition;

    if (isTransition) {
      if ( ReactCurrentBatchConfig$3.transition !== null) {
        var transition = ReactCurrentBatchConfig$3.transition;

        if (!transition._updatedFibers) {
          transition._updatedFibers = new Set();
        }

        transition._updatedFibers.add(fiber);
      } // The algorithm for assigning an update to a lane should be stable for all
      // updates at the same priority within the same event. To do this, the
      // inputs to the algorithm must be the same.
      //
      // The trick we use is to cache the first of each of these inputs within an
      // event. Then reset the cached values once we can be sure the event is
      // over. Our heuristic for that is whenever we enter a concurrent work loop.


      if (currentEventTransitionLane === NoLane) {
        // All transitions within the same event are assigned the same lane.
        currentEventTransitionLane = claimNextTransitionLane();
      }

      return currentEventTransitionLane;
    } // Updates originating inside certain React methods, like flushSync, have
    // their priority set by tracking it with a context variable.
    //
    // The opaque type returned by the host config is internally a lane, so we can
    // use that directly.
    // TODO: Move this type conversion to the event priority module.


    var updateLane = getCurrentUpdatePriority();

    if (updateLane !== NoLane) {
      return updateLane;
    } // This update originated outside React. Ask the host environment for an
    // appropriate priority, based on the type of event.
    //
    // The opaque type returned by the host config is internally a lane, so we can
    // use that directly.
    // TODO: Move this type conversion to the event priority module.


    var eventLane = getCurrentEventPriority();
    return eventLane;
  }

  function requestRetryLane(fiber) {
    // This is a fork of `requestUpdateLane` designed specifically for Suspense
    // "retries" — a special update that attempts to flip a Suspense boundary
    // from its placeholder state to its primary/resolved state.
    // Special cases
    var mode = fiber.mode;

    if ((mode & ConcurrentMode) === NoMode) {
      return SyncLane;
    }

    return claimNextRetryLane();
  }

  function scheduleUpdateOnFiber(fiber, lane, eventTime) {
    checkForNestedUpdates();

    {
      if (isRunningInsertionEffect) {
        error('useInsertionEffect must not schedule updates.');
      }
    }

    var root = markUpdateLaneFromFiberToRoot(fiber, lane);

    if (root === null) {
      return null;
    }

    {
      if (isFlushingPassiveEffects) {
        didScheduleUpdateDuringPassiveEffects = true;
      }
    } // Mark that the root has a pending update.


    markRootUpdated(root, lane, eventTime);

    if ((executionContext & RenderContext) !== NoLanes && root === workInProgressRoot) {
      // This update was dispatched during the render phase. This is a mistake
      // if the update originates from user space (with the exception of local
      // hook updates, which are handled differently and don't reach this
      // function), but there are some internal React features that use this as
      // an implementation detail, like selective hydration.
      warnAboutRenderPhaseUpdatesInDEV(fiber); // Track lanes that were updated during the render phase
    } else {
      // This is a normal update, scheduled from outside the render phase. For
      // example, during an input event.
      {
        if (isDevToolsPresent) {
          addFiberToLanesMap(root, fiber, lane);
        }
      }

      warnIfUpdatesNotWrappedWithActDEV(fiber);

      if (root === workInProgressRoot) {
        // TODO: Consolidate with `isInterleavedUpdate` check
        // Received an update to a tree that's in the middle of rendering. Mark
        // that there was an interleaved update work on this root. Unless the
        // `deferRenderPhaseUpdateToNextBatch` flag is off and this is a render
        // phase update. In that case, we don't treat render phase updates as if
        // they were interleaved, for backwards compat reasons.
        if ( (executionContext & RenderContext) === NoContext) {
          workInProgressRootInterleavedUpdatedLanes = mergeLanes(workInProgressRootInterleavedUpdatedLanes, lane);
        }

        if (workInProgressRootExitStatus === RootSuspendedWithDelay) {
          // The root already suspended with a delay, which means this render
          // definitely won't finish. Since we have a new update, let's mark it as
          // suspended now, right before marking the incoming update. This has the
          // effect of interrupting the current render and switching to the update.
          // TODO: Make sure this doesn't override pings that happen while we've
          // already started rendering.
          markRootSuspended$1(root, workInProgressRootRenderLanes);
        }
      }

      ensureRootIsScheduled(root, eventTime);

      if (lane === SyncLane && executionContext === NoContext && (fiber.mode & ConcurrentMode) === NoMode && // Treat `act` as if it's inside `batchedUpdates`, even in legacy mode.
      !( ReactCurrentActQueue$1.isBatchingLegacy)) {
        // Flush the synchronous work now, unless we're already working or inside
        // a batch. This is intentionally inside scheduleUpdateOnFiber instead of
        // scheduleCallbackForFiber to preserve the ability to schedule a callback
        // without immediately flushing it. We only do this for user-initiated
        // updates, to preserve historical behavior of legacy mode.
        resetRenderTimer();
        flushSyncCallbacksOnlyInLegacyMode();
      }
    }

    return root;
  }
  function scheduleInitialHydrationOnRoot(root, lane, eventTime) {
    // This is a special fork of scheduleUpdateOnFiber that is only used to
    // schedule the initial hydration of a root that has just been created. Most
    // of the stuff in scheduleUpdateOnFiber can be skipped.
    //
    // The main reason for this separate path, though, is to distinguish the
    // initial children from subsequent updates. In fully client-rendered roots
    // (createRoot instead of hydrateRoot), all top-level renders are modeled as
    // updates, but hydration roots are special because the initial render must
    // match what was rendered on the server.
    var current = root.current;
    current.lanes = lane;
    markRootUpdated(root, lane, eventTime);
    ensureRootIsScheduled(root, eventTime);
  } // This is split into a separate function so we can mark a fiber with pending
  // work without treating it as a typical update that originates from an event;
  // e.g. retrying a Suspense boundary isn't an update, but it does schedule work
  // on a fiber.

  function markUpdateLaneFromFiberToRoot(sourceFiber, lane) {
    // Update the source fiber's lanes
    sourceFiber.lanes = mergeLanes(sourceFiber.lanes, lane);
    var alternate = sourceFiber.alternate;

    if (alternate !== null) {
      alternate.lanes = mergeLanes(alternate.lanes, lane);
    }

    {
      if (alternate === null && (sourceFiber.flags & (Placement | Hydrating)) !== NoFlags) {
        warnAboutUpdateOnNotYetMountedFiberInDEV(sourceFiber);
      }
    } // Walk the parent path to the root and update the child lanes.


    var node = sourceFiber;
    var parent = sourceFiber.return;

    while (parent !== null) {
      parent.childLanes = mergeLanes(parent.childLanes, lane);
      alternate = parent.alternate;

      if (alternate !== null) {
        alternate.childLanes = mergeLanes(alternate.childLanes, lane);
      } else {
        {
          if ((parent.flags & (Placement | Hydrating)) !== NoFlags) {
            warnAboutUpdateOnNotYetMountedFiberInDEV(sourceFiber);
          }
        }
      }

      node = parent;
      parent = parent.return;
    }

    if (node.tag === HostRoot) {
      var root = node.stateNode;
      return root;
    } else {
      return null;
    }
  }

  function isInterleavedUpdate(fiber, lane) {
    return (// TODO: Optimize slightly by comparing to root that fiber belongs to.
      // Requires some refactoring. Not a big deal though since it's rare for
      // concurrent apps to have more than a single root.
      (workInProgressRoot !== null || // If the interleaved updates queue hasn't been cleared yet, then
      // we should treat this as an interleaved update, too. This is also a
      // defensive coding measure in case a new update comes in between when
      // rendering has finished and when the interleaved updates are transferred
      // to the main queue.
      hasInterleavedUpdates()) && (fiber.mode & ConcurrentMode) !== NoMode && ( // If this is a render phase update (i.e. UNSAFE_componentWillReceiveProps),
      // then don't treat this as an interleaved update. This pattern is
      // accompanied by a warning but we haven't fully deprecated it yet. We can
      // remove once the deferRenderPhaseUpdateToNextBatch flag is enabled.
       (executionContext & RenderContext) === NoContext)
    );
  } // Use this function to schedule a task for a root. There's only one task per
  // root; if a task was already scheduled, we'll check to make sure the priority
  // of the existing task is the same as the priority of the next level that the
  // root has work on. This function is called on every update, and right before
  // exiting a task.

  function ensureRootIsScheduled(root, currentTime) {
    var existingCallbackNode = root.callbackNode; // Check if any lanes are being starved by other work. If so, mark them as
    // expired so we know to work on those next.

    markStarvedLanesAsExpired(root, currentTime); // Determine the next lanes to work on, and their priority.

    var nextLanes = getNextLanes(root, root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes);

    if (nextLanes === NoLanes) {
      // Special case: There's nothing to work on.
      if (existingCallbackNode !== null) {
        cancelCallback$1(existingCallbackNode);
      }

      root.callbackNode = null;
      root.callbackPriority = NoLane;
      return;
    } // We use the highest priority lane to represent the priority of the callback.


    var newCallbackPriority = getHighestPriorityLane(nextLanes); // Check if there's an existing task. We may be able to reuse it.

    var existingCallbackPriority = root.callbackPriority;

    if (existingCallbackPriority === newCallbackPriority && // Special case related to `act`. If the currently scheduled task is a
    // Scheduler task, rather than an `act` task, cancel it and re-scheduled
    // on the `act` queue.
    !( ReactCurrentActQueue$1.current !== null && existingCallbackNode !== fakeActCallbackNode)) {
      {
        // If we're going to re-use an existing task, it needs to exist.
        // Assume that discrete update microtasks are non-cancellable and null.
        // TODO: Temporary until we confirm this warning is not fired.
        if (existingCallbackNode == null && existingCallbackPriority !== SyncLane) {
          error('Expected scheduled callback to exist. This error is likely caused by a bug in React. Please file an issue.');
        }
      } // The priority hasn't changed. We can reuse the existing task. Exit.


      return;
    }

    if (existingCallbackNode != null) {
      // Cancel the existing callback. We'll schedule a new one below.
      cancelCallback$1(existingCallbackNode);
    } // Schedule a new callback.


    var newCallbackNode;

    if (newCallbackPriority === SyncLane) {
      // Special case: Sync React callbacks are scheduled on a special
      // internal queue
      if (root.tag === LegacyRoot) {
        if ( ReactCurrentActQueue$1.isBatchingLegacy !== null) {
          ReactCurrentActQueue$1.didScheduleLegacyUpdate = true;
        }

        scheduleLegacySyncCallback(performSyncWorkOnRoot.bind(null, root));
      } else {
        scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
      }

      {
        // Flush the queue in a microtask.
        if ( ReactCurrentActQueue$1.current !== null) {
          // Inside `act`, use our internal `act` queue so that these get flushed
          // at the end of the current scope even when using the sync version
          // of `act`.
          ReactCurrentActQueue$1.current.push(flushSyncCallbacks);
        } else {
          scheduleMicrotask(function () {
            // In Safari, appending an iframe forces microtasks to run.
            // https://github.com/facebook/react/issues/22459
            // We don't support running callbacks in the middle of render
            // or commit so we need to check against that.
            if (executionContext === NoContext) {
              // It's only safe to do this conditionally because we always
              // check for pending work before we exit the task.
              flushSyncCallbacks();
            }
          });
        }
      }

      newCallbackNode = null;
    } else {
      var schedulerPriorityLevel;

      switch (lanesToEventPriority(nextLanes)) {
        case DiscreteEventPriority:
          schedulerPriorityLevel = ImmediatePriority;
          break;

        case ContinuousEventPriority:
          schedulerPriorityLevel = UserBlockingPriority;
          break;

        case DefaultEventPriority:
          schedulerPriorityLevel = NormalPriority;
          break;

        case IdleEventPriority:
          schedulerPriorityLevel = IdlePriority;
          break;

        default:
          schedulerPriorityLevel = NormalPriority;
          break;
      }

      newCallbackNode = scheduleCallback$2(schedulerPriorityLevel, performConcurrentWorkOnRoot.bind(null, root));
    }

    root.callbackPriority = newCallbackPriority;
    root.callbackNode = newCallbackNode;
  } // This is the entry point for every concurrent task, i.e. anything that
  // goes through Scheduler.


  function performConcurrentWorkOnRoot(root, didTimeout) {
    {
      resetNestedUpdateFlag();
    } // Since we know we're in a React event, we can clear the current
    // event time. The next update will compute a new event time.


    currentEventTime = NoTimestamp;
    currentEventTransitionLane = NoLanes;

    if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
      throw new Error('Should not already be working.');
    } // Flush any pending passive effects before deciding which lanes to work on,
    // in case they schedule additional work.


    var originalCallbackNode = root.callbackNode;
    var didFlushPassiveEffects = flushPassiveEffects();

    if (didFlushPassiveEffects) {
      // Something in the passive effect phase may have canceled the current task.
      // Check if the task node for this root was changed.
      if (root.callbackNode !== originalCallbackNode) {
        // The current task was canceled. Exit. We don't need to call
        // `ensureRootIsScheduled` because the check above implies either that
        // there's a new task, or that there's no remaining work on this root.
        return null;
      }
    } // Determine the next lanes to work on, using the fields stored
    // on the root.


    var lanes = getNextLanes(root, root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes);

    if (lanes === NoLanes) {
      // Defensive coding. This is never expected to happen.
      return null;
    } // We disable time-slicing in some cases: if the work has been CPU-bound
    // for too long ("expired" work, to prevent starvation), or we're in
    // sync-updates-by-default mode.
    // TODO: We only check `didTimeout` defensively, to account for a Scheduler
    // bug we're still investigating. Once the bug in Scheduler is fixed,
    // we can remove this, since we track expiration ourselves.


    var shouldTimeSlice = !includesBlockingLane(root, lanes) && !includesExpiredLane(root, lanes) && ( !didTimeout);
    var exitStatus = shouldTimeSlice ? renderRootConcurrent(root, lanes) : renderRootSync(root, lanes);

    if (exitStatus !== RootInProgress) {
      if (exitStatus === RootErrored) {
        // If something threw an error, try rendering one more time. We'll
        // render synchronously to block concurrent data mutations, and we'll
        // includes all pending updates are included. If it still fails after
        // the second attempt, we'll give up and commit the resulting tree.
        var errorRetryLanes = getLanesToRetrySynchronouslyOnError(root);

        if (errorRetryLanes !== NoLanes) {
          lanes = errorRetryLanes;
          exitStatus = recoverFromConcurrentError(root, errorRetryLanes);
        }
      }

      if (exitStatus === RootFatalErrored) {
        var fatalError = workInProgressRootFatalError;
        prepareFreshStack(root, NoLanes);
        markRootSuspended$1(root, lanes);
        ensureRootIsScheduled(root, now());
        throw fatalError;
      }

      if (exitStatus === RootDidNotComplete) {
        // The render unwound without completing the tree. This happens in special
        // cases where need to exit the current render without producing a
        // consistent tree or committing.
        //
        // This should only happen during a concurrent render, not a discrete or
        // synchronous update. We should have already checked for this when we
        // unwound the stack.
        markRootSuspended$1(root, lanes);
      } else {
        // The render completed.
        // Check if this render may have yielded to a concurrent event, and if so,
        // confirm that any newly rendered stores are consistent.
        // TODO: It's possible that even a concurrent render may never have yielded
        // to the main thread, if it was fast enough, or if it expired. We could
        // skip the consistency check in that case, too.
        var renderWasConcurrent = !includesBlockingLane(root, lanes);
        var finishedWork = root.current.alternate;

        if (renderWasConcurrent && !isRenderConsistentWithExternalStores(finishedWork)) {
          // A store was mutated in an interleaved event. Render again,
          // synchronously, to block further mutations.
          exitStatus = renderRootSync(root, lanes); // We need to check again if something threw

          if (exitStatus === RootErrored) {
            var _errorRetryLanes = getLanesToRetrySynchronouslyOnError(root);

            if (_errorRetryLanes !== NoLanes) {
              lanes = _errorRetryLanes;
              exitStatus = recoverFromConcurrentError(root, _errorRetryLanes); // We assume the tree is now consistent because we didn't yield to any
              // concurrent events.
            }
          }

          if (exitStatus === RootFatalErrored) {
            var _fatalError = workInProgressRootFatalError;
            prepareFreshStack(root, NoLanes);
            markRootSuspended$1(root, lanes);
            ensureRootIsScheduled(root, now());
            throw _fatalError;
          }
        } // We now have a consistent tree. The next step is either to commit it,
        // or, if something suspended, wait to commit it after a timeout.


        root.finishedWork = finishedWork;
        root.finishedLanes = lanes;
        finishConcurrentRender(root, exitStatus, lanes);
      }
    }

    ensureRootIsScheduled(root, now());

    if (root.callbackNode === originalCallbackNode) {
      // The task node scheduled for this root is the same one that's
      // currently executed. Need to return a continuation.
      return performConcurrentWorkOnRoot.bind(null, root);
    }

    return null;
  }

  function recoverFromConcurrentError(root, errorRetryLanes) {
    // If an error occurred during hydration, discard server response and fall
    // back to client side render.
    // Before rendering again, save the errors from the previous attempt.
    var errorsFromFirstAttempt = workInProgressRootConcurrentErrors;

    if (isRootDehydrated(root)) {
      // The shell failed to hydrate. Set a flag to force a client rendering
      // during the next attempt. To do this, we call prepareFreshStack now
      // to create the root work-in-progress fiber. This is a bit weird in terms
      // of factoring, because it relies on renderRootSync not calling
      // prepareFreshStack again in the call below, which happens because the
      // root and lanes haven't changed.
      //
      // TODO: I think what we should do is set ForceClientRender inside
      // throwException, like we do for nested Suspense boundaries. The reason
      // it's here instead is so we can switch to the synchronous work loop, too.
      // Something to consider for a future refactor.
      var rootWorkInProgress = prepareFreshStack(root, errorRetryLanes);
      rootWorkInProgress.flags |= ForceClientRender;

      {
        errorHydratingContainer(root.containerInfo);
      }
    }

    var exitStatus = renderRootSync(root, errorRetryLanes);

    if (exitStatus !== RootErrored) {
      // Successfully finished rendering on retry
      // The errors from the failed first attempt have been recovered. Add
      // them to the collection of recoverable errors. We'll log them in the
      // commit phase.
      var errorsFromSecondAttempt = workInProgressRootRecoverableErrors;
      workInProgressRootRecoverableErrors = errorsFromFirstAttempt; // The errors from the second attempt should be queued after the errors
      // from the first attempt, to preserve the causal sequence.

      if (errorsFromSecondAttempt !== null) {
        queueRecoverableErrors(errorsFromSecondAttempt);
      }
    }

    return exitStatus;
  }

  function queueRecoverableErrors(errors) {
    if (workInProgressRootRecoverableErrors === null) {
      workInProgressRootRecoverableErrors = errors;
    } else {
      workInProgressRootRecoverableErrors.push.apply(workInProgressRootRecoverableErrors, errors);
    }
  }

  function finishConcurrentRender(root, exitStatus, lanes) {
    switch (exitStatus) {
      case RootInProgress:
      case RootFatalErrored:
        {
          throw new Error('Root did not complete. This is a bug in React.');
        }
      // Flow knows about invariant, so it complains if I add a break
      // statement, but eslint doesn't know about invariant, so it complains
      // if I do. eslint-disable-next-line no-fallthrough

      case RootErrored:
        {
          // We should have already attempted to retry this tree. If we reached
          // this point, it errored again. Commit it.
          commitRoot(root, workInProgressRootRecoverableErrors, workInProgressTransitions);
          break;
        }

      case RootSuspended:
        {
          markRootSuspended$1(root, lanes); // We have an acceptable loading state. We need to figure out if we
          // should immediately commit it or wait a bit.

          if (includesOnlyRetries(lanes) && // do not delay if we're inside an act() scope
          !shouldForceFlushFallbacksInDEV()) {
            // This render only included retries, no updates. Throttle committing
            // retries so that we don't show too many loading states too quickly.
            var msUntilTimeout = globalMostRecentFallbackTime + FALLBACK_THROTTLE_MS - now(); // Don't bother with a very short suspense time.

            if (msUntilTimeout > 10) {
              var nextLanes = getNextLanes(root, NoLanes);

              if (nextLanes !== NoLanes) {
                // There's additional work on this root.
                break;
              }

              var suspendedLanes = root.suspendedLanes;

              if (!isSubsetOfLanes(suspendedLanes, lanes)) {
                // We should prefer to render the fallback of at the last
                // suspended level. Ping the last suspended level to try
                // rendering it again.
                // FIXME: What if the suspended lanes are Idle? Should not restart.
                var eventTime = requestEventTime();
                markRootPinged(root, suspendedLanes);
                break;
              } // The render is suspended, it hasn't timed out, and there's no
              // lower priority work to do. Instead of committing the fallback
              // immediately, wait for more data to arrive.


              root.timeoutHandle = scheduleTimeout(commitRoot.bind(null, root, workInProgressRootRecoverableErrors, workInProgressTransitions), msUntilTimeout);
              break;
            }
          } // The work expired. Commit immediately.


          commitRoot(root, workInProgressRootRecoverableErrors, workInProgressTransitions);
          break;
        }

      case RootSuspendedWithDelay:
        {
          markRootSuspended$1(root, lanes);

          if (includesOnlyTransitions(lanes)) {
            // This is a transition, so we should exit without committing a
            // placeholder and without scheduling a timeout. Delay indefinitely
            // until we receive more data.
            break;
          }

          if (!shouldForceFlushFallbacksInDEV()) {
            // This is not a transition, but we did trigger an avoided state.
            // Schedule a placeholder to display after a short delay, using the Just
            // Noticeable Difference.
            // TODO: Is the JND optimization worth the added complexity? If this is
            // the only reason we track the event time, then probably not.
            // Consider removing.
            var mostRecentEventTime = getMostRecentEventTime(root, lanes);
            var eventTimeMs = mostRecentEventTime;
            var timeElapsedMs = now() - eventTimeMs;

            var _msUntilTimeout = jnd(timeElapsedMs) - timeElapsedMs; // Don't bother with a very short suspense time.


            if (_msUntilTimeout > 10) {
              // Instead of committing the fallback immediately, wait for more data
              // to arrive.
              root.timeoutHandle = scheduleTimeout(commitRoot.bind(null, root, workInProgressRootRecoverableErrors, workInProgressTransitions), _msUntilTimeout);
              break;
            }
          } // Commit the placeholder.


          commitRoot(root, workInProgressRootRecoverableErrors, workInProgressTransitions);
          break;
        }

      case RootCompleted:
        {
          // The work completed. Ready to commit.
          commitRoot(root, workInProgressRootRecoverableErrors, workInProgressTransitions);
          break;
        }

      default:
        {
          throw new Error('Unknown root exit status.');
        }
    }
  }

  function isRenderConsistentWithExternalStores(finishedWork) {
    // Search the rendered tree for external store reads, and check whether the
    // stores were mutated in a concurrent event. Intentionally using an iterative
    // loop instead of recursion so we can exit early.
    var node = finishedWork;

    while (true) {
      if (node.flags & StoreConsistency) {
        var updateQueue = node.updateQueue;

        if (updateQueue !== null) {
          var checks = updateQueue.stores;

          if (checks !== null) {
            for (var i = 0; i < checks.length; i++) {
              var check = checks[i];
              var getSnapshot = check.getSnapshot;
              var renderedValue = check.value;

              try {
                if (!objectIs(getSnapshot(), renderedValue)) {
                  // Found an inconsistent store.
                  return false;
                }
              } catch (error) {
                // If `getSnapshot` throws, return `false`. This will schedule
                // a re-render, and the error will be rethrown during render.
                return false;
              }
            }
          }
        }
      }

      var child = node.child;

      if (node.subtreeFlags & StoreConsistency && child !== null) {
        child.return = node;
        node = child;
        continue;
      }

      if (node === finishedWork) {
        return true;
      }

      while (node.sibling === null) {
        if (node.return === null || node.return === finishedWork) {
          return true;
        }

        node = node.return;
      }

      node.sibling.return = node.return;
      node = node.sibling;
    } // Flow doesn't know this is unreachable, but eslint does
    // eslint-disable-next-line no-unreachable


    return true;
  }

  function markRootSuspended$1(root, suspendedLanes) {
    // When suspending, we should always exclude lanes that were pinged or (more
    // rarely, since we try to avoid it) updated during the render phase.
    // TODO: Lol maybe there's a better way to factor this besides this
    // obnoxiously named function :)
    suspendedLanes = removeLanes(suspendedLanes, workInProgressRootPingedLanes);
    suspendedLanes = removeLanes(suspendedLanes, workInProgressRootInterleavedUpdatedLanes);
    markRootSuspended(root, suspendedLanes);
  } // This is the entry point for synchronous tasks that don't go
  // through Scheduler


  function performSyncWorkOnRoot(root) {
    {
      syncNestedUpdateFlag();
    }

    if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
      throw new Error('Should not already be working.');
    }

    flushPassiveEffects();
    var lanes = getNextLanes(root, NoLanes);

    if (!includesSomeLane(lanes, SyncLane)) {
      // There's no remaining sync work left.
      ensureRootIsScheduled(root, now());
      return null;
    }

    var exitStatus = renderRootSync(root, lanes);

    if (root.tag !== LegacyRoot && exitStatus === RootErrored) {
      // If something threw an error, try rendering one more time. We'll render
      // synchronously to block concurrent data mutations, and we'll includes
      // all pending updates are included. If it still fails after the second
      // attempt, we'll give up and commit the resulting tree.
      var errorRetryLanes = getLanesToRetrySynchronouslyOnError(root);

      if (errorRetryLanes !== NoLanes) {
        lanes = errorRetryLanes;
        exitStatus = recoverFromConcurrentError(root, errorRetryLanes);
      }
    }

    if (exitStatus === RootFatalErrored) {
      var fatalError = workInProgressRootFatalError;
      prepareFreshStack(root, NoLanes);
      markRootSuspended$1(root, lanes);
      ensureRootIsScheduled(root, now());
      throw fatalError;
    }

    if (exitStatus === RootDidNotComplete) {
      throw new Error('Root did not complete. This is a bug in React.');
    } // We now have a consistent tree. Because this is a sync render, we
    // will commit it even if something suspended.


    var finishedWork = root.current.alternate;
    root.finishedWork = finishedWork;
    root.finishedLanes = lanes;
    commitRoot(root, workInProgressRootRecoverableErrors, workInProgressTransitions); // Before exiting, make sure there's a callback scheduled for the next
    // pending level.

    ensureRootIsScheduled(root, now());
    return null;
  }

  function flushRoot(root, lanes) {
    if (lanes !== NoLanes) {
      markRootEntangled(root, mergeLanes(lanes, SyncLane));
      ensureRootIsScheduled(root, now());

      if ((executionContext & (RenderContext | CommitContext)) === NoContext) {
        resetRenderTimer();
        flushSyncCallbacks();
      }
    }
  }
  function batchedUpdates$1(fn, a) {
    var prevExecutionContext = executionContext;
    executionContext |= BatchedContext;

    try {
      return fn(a);
    } finally {
      executionContext = prevExecutionContext; // If there were legacy sync updates, flush them at the end of the outer
      // most batchedUpdates-like method.

      if (executionContext === NoContext && // Treat `act` as if it's inside `batchedUpdates`, even in legacy mode.
      !( ReactCurrentActQueue$1.isBatchingLegacy)) {
        resetRenderTimer();
        flushSyncCallbacksOnlyInLegacyMode();
      }
    }
  }
  function discreteUpdates(fn, a, b, c, d) {
    var previousPriority = getCurrentUpdatePriority();
    var prevTransition = ReactCurrentBatchConfig$3.transition;

    try {
      ReactCurrentBatchConfig$3.transition = null;
      setCurrentUpdatePriority(DiscreteEventPriority);
      return fn(a, b, c, d);
    } finally {
      setCurrentUpdatePriority(previousPriority);
      ReactCurrentBatchConfig$3.transition = prevTransition;

      if (executionContext === NoContext) {
        resetRenderTimer();
      }
    }
  } // Overload the definition to the two valid signatures.
  // Warning, this opts-out of checking the function body.

  // eslint-disable-next-line no-redeclare
  function flushSync(fn) {
    // In legacy mode, we flush pending passive effects at the beginning of the
    // next event, not at the end of the previous one.
    if (rootWithPendingPassiveEffects !== null && rootWithPendingPassiveEffects.tag === LegacyRoot && (executionContext & (RenderContext | CommitContext)) === NoContext) {
      flushPassiveEffects();
    }

    var prevExecutionContext = executionContext;
    executionContext |= BatchedContext;
    var prevTransition = ReactCurrentBatchConfig$3.transition;
    var previousPriority = getCurrentUpdatePriority();

    try {
      ReactCurrentBatchConfig$3.transition = null;
      setCurrentUpdatePriority(DiscreteEventPriority);

      if (fn) {
        return fn();
      } else {
        return undefined;
      }
    } finally {
      setCurrentUpdatePriority(previousPriority);
      ReactCurrentBatchConfig$3.transition = prevTransition;
      executionContext = prevExecutionContext; // Flush the immediate callbacks that were scheduled during this batch.
      // Note that this will happen even if batchedUpdates is higher up
      // the stack.

      if ((executionContext & (RenderContext | CommitContext)) === NoContext) {
        flushSyncCallbacks();
      }
    }
  }
  function isAlreadyRendering() {
    // Used by the renderer to print a warning if certain APIs are called from
    // the wrong context.
    return  (executionContext & (RenderContext | CommitContext)) !== NoContext;
  }
  function pushRenderLanes(fiber, lanes) {
    push(subtreeRenderLanesCursor, subtreeRenderLanes, fiber);
    subtreeRenderLanes = mergeLanes(subtreeRenderLanes, lanes);
    workInProgressRootIncludedLanes = mergeLanes(workInProgressRootIncludedLanes, lanes);
  }
  function popRenderLanes(fiber) {
    subtreeRenderLanes = subtreeRenderLanesCursor.current;
    pop(subtreeRenderLanesCursor, fiber);
  }

  function prepareFreshStack(root, lanes) {
    root.finishedWork = null;
    root.finishedLanes = NoLanes;
    var timeoutHandle = root.timeoutHandle;

    if (timeoutHandle !== noTimeout) {
      // The root previous suspended and scheduled a timeout to commit a fallback
      // state. Now that we have additional work, cancel the timeout.
      root.timeoutHandle = noTimeout; // $FlowFixMe Complains noTimeout is not a TimeoutID, despite the check above

      cancelTimeout(timeoutHandle);
    }

    if (workInProgress !== null) {
      var interruptedWork = workInProgress.return;

      while (interruptedWork !== null) {
        var current = interruptedWork.alternate;
        unwindInterruptedWork(current, interruptedWork);
        interruptedWork = interruptedWork.return;
      }
    }

    workInProgressRoot = root;
    var rootWorkInProgress = createWorkInProgress(root.current, null);
    workInProgress = rootWorkInProgress;
    workInProgressRootRenderLanes = subtreeRenderLanes = workInProgressRootIncludedLanes = lanes;
    workInProgressRootExitStatus = RootInProgress;
    workInProgressRootFatalError = null;
    workInProgressRootSkippedLanes = NoLanes;
    workInProgressRootInterleavedUpdatedLanes = NoLanes;
    workInProgressRootPingedLanes = NoLanes;
    workInProgressRootConcurrentErrors = null;
    workInProgressRootRecoverableErrors = null;
    enqueueInterleavedUpdates();

    {
      ReactStrictModeWarnings.discardPendingWarnings();
    }

    return rootWorkInProgress;
  }

  function handleError(root, thrownValue) {
    do {
      var erroredWork = workInProgress;

      try {
        // Reset module-level state that was set during the render phase.
        resetContextDependencies();
        resetHooksAfterThrow();
        resetCurrentFiber(); // TODO: I found and added this missing line while investigating a
        // separate issue. Write a regression test using string refs.

        ReactCurrentOwner$2.current = null;

        if (erroredWork === null || erroredWork.return === null) {
          // Expected to be working on a non-root fiber. This is a fatal error
          // because there's no ancestor that can handle it; the root is
          // supposed to capture all errors that weren't caught by an error
          // boundary.
          workInProgressRootExitStatus = RootFatalErrored;
          workInProgressRootFatalError = thrownValue; // Set `workInProgress` to null. This represents advancing to the next
          // sibling, or the parent if there are no siblings. But since the root
          // has no siblings nor a parent, we set it to null. Usually this is
          // handled by `completeUnitOfWork` or `unwindWork`, but since we're
          // intentionally not calling those, we need set it here.
          // TODO: Consider calling `unwindWork` to pop the contexts.

          workInProgress = null;
          return;
        }

        if (enableProfilerTimer && erroredWork.mode & ProfileMode) {
          // Record the time spent rendering before an error was thrown. This
          // avoids inaccurate Profiler durations in the case of a
          // suspended render.
          stopProfilerTimerIfRunningAndRecordDelta(erroredWork, true);
        }

        if (enableSchedulingProfiler) {
          markComponentRenderStopped();

          if (thrownValue !== null && typeof thrownValue === 'object' && typeof thrownValue.then === 'function') {
            var wakeable = thrownValue;
            markComponentSuspended(erroredWork, wakeable, workInProgressRootRenderLanes);
          } else {
            markComponentErrored(erroredWork, thrownValue, workInProgressRootRenderLanes);
          }
        }

        throwException(root, erroredWork.return, erroredWork, thrownValue, workInProgressRootRenderLanes);
        completeUnitOfWork(erroredWork);
      } catch (yetAnotherThrownValue) {
        // Something in the return path also threw.
        thrownValue = yetAnotherThrownValue;

        if (workInProgress === erroredWork && erroredWork !== null) {
          // If this boundary has already errored, then we had trouble processing
          // the error. Bubble it to the next boundary.
          erroredWork = erroredWork.return;
          workInProgress = erroredWork;
        } else {
          erroredWork = workInProgress;
        }

        continue;
      } // Return to the normal work loop.


      return;
    } while (true);
  }

  function pushDispatcher() {
    var prevDispatcher = ReactCurrentDispatcher$2.current;
    ReactCurrentDispatcher$2.current = ContextOnlyDispatcher;

    if (prevDispatcher === null) {
      // The React isomorphic package does not include a default dispatcher.
      // Instead the first renderer will lazily attach one, in order to give
      // nicer error messages.
      return ContextOnlyDispatcher;
    } else {
      return prevDispatcher;
    }
  }

  function popDispatcher(prevDispatcher) {
    ReactCurrentDispatcher$2.current = prevDispatcher;
  }

  function markCommitTimeOfFallback() {
    globalMostRecentFallbackTime = now();
  }
  function markSkippedUpdateLanes(lane) {
    workInProgressRootSkippedLanes = mergeLanes(lane, workInProgressRootSkippedLanes);
  }
  function renderDidSuspend() {
    if (workInProgressRootExitStatus === RootInProgress) {
      workInProgressRootExitStatus = RootSuspended;
    }
  }
  function renderDidSuspendDelayIfPossible() {
    if (workInProgressRootExitStatus === RootInProgress || workInProgressRootExitStatus === RootSuspended || workInProgressRootExitStatus === RootErrored) {
      workInProgressRootExitStatus = RootSuspendedWithDelay;
    } // Check if there are updates that we skipped tree that might have unblocked
    // this render.


    if (workInProgressRoot !== null && (includesNonIdleWork(workInProgressRootSkippedLanes) || includesNonIdleWork(workInProgressRootInterleavedUpdatedLanes))) {
      // Mark the current render as suspended so that we switch to working on
      // the updates that were skipped. Usually we only suspend at the end of
      // the render phase.
      // TODO: We should probably always mark the root as suspended immediately
      // (inside this function), since by suspending at the end of the render
      // phase introduces a potential mistake where we suspend lanes that were
      // pinged or updated while we were rendering.
      markRootSuspended$1(workInProgressRoot, workInProgressRootRenderLanes);
    }
  }
  function renderDidError(error) {
    if (workInProgressRootExitStatus !== RootSuspendedWithDelay) {
      workInProgressRootExitStatus = RootErrored;
    }

    if (workInProgressRootConcurrentErrors === null) {
      workInProgressRootConcurrentErrors = [error];
    } else {
      workInProgressRootConcurrentErrors.push(error);
    }
  } // Called during render to determine if anything has suspended.
  // Returns false if we're not sure.

  function renderHasNotSuspendedYet() {
    // If something errored or completed, we can't really be sure,
    // so those are false.
    return workInProgressRootExitStatus === RootInProgress;
  }

  function renderRootSync(root, lanes) {
    var prevExecutionContext = executionContext;
    executionContext |= RenderContext;
    var prevDispatcher = pushDispatcher(); // If the root or lanes have changed, throw out the existing stack
    // and prepare a fresh one. Otherwise we'll continue where we left off.

    if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
      {
        if (isDevToolsPresent) {
          var memoizedUpdaters = root.memoizedUpdaters;

          if (memoizedUpdaters.size > 0) {
            restorePendingUpdaters(root, workInProgressRootRenderLanes);
            memoizedUpdaters.clear();
          } // At this point, move Fibers that scheduled the upcoming work from the Map to the Set.
          // If we bailout on this work, we'll move them back (like above).
          // It's important to move them now in case the work spawns more work at the same priority with different updaters.
          // That way we can keep the current update and future updates separate.


          movePendingFibersToMemoized(root, lanes);
        }
      }

      workInProgressTransitions = getTransitionsForLanes();
      prepareFreshStack(root, lanes);
    }

    {
      markRenderStarted(lanes);
    }

    do {
      try {
        workLoopSync();
        break;
      } catch (thrownValue) {
        handleError(root, thrownValue);
      }
    } while (true);

    resetContextDependencies();
    executionContext = prevExecutionContext;
    popDispatcher(prevDispatcher);

    if (workInProgress !== null) {
      // This is a sync render, so we should have finished the whole tree.
      throw new Error('Cannot commit an incomplete root. This error is likely caused by a ' + 'bug in React. Please file an issue.');
    }

    {
      markRenderStopped();
    } // Set this to null to indicate there's no in-progress render.


    workInProgressRoot = null;
    workInProgressRootRenderLanes = NoLanes;
    return workInProgressRootExitStatus;
  } // The work loop is an extremely hot path. Tell Closure not to inline it.

  /** @noinline */


  function workLoopSync() {
    // Already timed out, so perform work without checking if we need to yield.
    while (workInProgress !== null) {
      performUnitOfWork(workInProgress);
    }
  }

  function renderRootConcurrent(root, lanes) {
    var prevExecutionContext = executionContext;
    executionContext |= RenderContext;
    var prevDispatcher = pushDispatcher(); // If the root or lanes have changed, throw out the existing stack
    // and prepare a fresh one. Otherwise we'll continue where we left off.

    if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
      {
        if (isDevToolsPresent) {
          var memoizedUpdaters = root.memoizedUpdaters;

          if (memoizedUpdaters.size > 0) {
            restorePendingUpdaters(root, workInProgressRootRenderLanes);
            memoizedUpdaters.clear();
          } // At this point, move Fibers that scheduled the upcoming work from the Map to the Set.
          // If we bailout on this work, we'll move them back (like above).
          // It's important to move them now in case the work spawns more work at the same priority with different updaters.
          // That way we can keep the current update and future updates separate.


          movePendingFibersToMemoized(root, lanes);
        }
      }

      workInProgressTransitions = getTransitionsForLanes();
      resetRenderTimer();
      prepareFreshStack(root, lanes);
    }

    {
      markRenderStarted(lanes);
    }

    do {
      try {
        workLoopConcurrent();
        break;
      } catch (thrownValue) {
        handleError(root, thrownValue);
      }
    } while (true);

    resetContextDependencies();
    popDispatcher(prevDispatcher);
    executionContext = prevExecutionContext;


    if (workInProgress !== null) {
      // Still work remaining.
      {
        markRenderYielded();
      }

      return RootInProgress;
    } else {
      // Completed the tree.
      {
        markRenderStopped();
      } // Set this to null to indicate there's no in-progress render.


      workInProgressRoot = null;
      workInProgressRootRenderLanes = NoLanes; // Return the final exit status.

      return workInProgressRootExitStatus;
    }
  }
  /** @noinline */


  function workLoopConcurrent() {
    // Perform work until Scheduler asks us to yield
    while (workInProgress !== null && !shouldYield()) {
      performUnitOfWork(workInProgress);
    }
  }

  function performUnitOfWork(unitOfWork) {
    // The current, flushed, state of this fiber is the alternate. Ideally
    // nothing should rely on this, but relying on it here means that we don't
    // need an additional field on the work in progress.
    var current = unitOfWork.alternate;
    setCurrentFiber(unitOfWork);
    var next;

    if ( (unitOfWork.mode & ProfileMode) !== NoMode) {
      startProfilerTimer(unitOfWork);
      next = beginWork$1(current, unitOfWork, subtreeRenderLanes);
      stopProfilerTimerIfRunningAndRecordDelta(unitOfWork, true);
    } else {
      next = beginWork$1(current, unitOfWork, subtreeRenderLanes);
    }

    resetCurrentFiber();
    unitOfWork.memoizedProps = unitOfWork.pendingProps;

    if (next === null) {
      // If this doesn't spawn new work, complete the current work.
      completeUnitOfWork(unitOfWork);
    } else {
      workInProgress = next;
    }

    ReactCurrentOwner$2.current = null;
  }

  function completeUnitOfWork(unitOfWork) {
    // Attempt to complete the current unit of work, then move to the next
    // sibling. If there are no more siblings, return to the parent fiber.
    var completedWork = unitOfWork;

    do {
      // The current, flushed, state of this fiber is the alternate. Ideally
      // nothing should rely on this, but relying on it here means that we don't
      // need an additional field on the work in progress.
      var current = completedWork.alternate;
      var returnFiber = completedWork.return; // Check if the work completed or if something threw.

      if ((completedWork.flags & Incomplete) === NoFlags) {
        setCurrentFiber(completedWork);
        var next = void 0;

        if ( (completedWork.mode & ProfileMode) === NoMode) {
          next = completeWork(current, completedWork, subtreeRenderLanes);
        } else {
          startProfilerTimer(completedWork);
          next = completeWork(current, completedWork, subtreeRenderLanes); // Update render duration assuming we didn't error.

          stopProfilerTimerIfRunningAndRecordDelta(completedWork, false);
        }

        resetCurrentFiber();

        if (next !== null) {
          // Completing this fiber spawned new work. Work on that next.
          workInProgress = next;
          return;
        }
      } else {
        // This fiber did not complete because something threw. Pop values off
        // the stack without entering the complete phase. If this is a boundary,
        // capture values if possible.
        var _next = unwindWork(current, completedWork); // Because this fiber did not complete, don't reset its lanes.


        if (_next !== null) {
          // If completing this work spawned new work, do that next. We'll come
          // back here again.
          // Since we're restarting, remove anything that is not a host effect
          // from the effect tag.
          _next.flags &= HostEffectMask;
          workInProgress = _next;
          return;
        }

        if ( (completedWork.mode & ProfileMode) !== NoMode) {
          // Record the render duration for the fiber that errored.
          stopProfilerTimerIfRunningAndRecordDelta(completedWork, false); // Include the time spent working on failed children before continuing.

          var actualDuration = completedWork.actualDuration;
          var child = completedWork.child;

          while (child !== null) {
            actualDuration += child.actualDuration;
            child = child.sibling;
          }

          completedWork.actualDuration = actualDuration;
        }

        if (returnFiber !== null) {
          // Mark the parent fiber as incomplete and clear its subtree flags.
          returnFiber.flags |= Incomplete;
          returnFiber.subtreeFlags = NoFlags;
          returnFiber.deletions = null;
        } else {
          // We've unwound all the way to the root.
          workInProgressRootExitStatus = RootDidNotComplete;
          workInProgress = null;
          return;
        }
      }

      var siblingFiber = completedWork.sibling;

      if (siblingFiber !== null) {
        // If there is more work to do in this returnFiber, do that next.
        workInProgress = siblingFiber;
        return;
      } // Otherwise, return to the parent


      completedWork = returnFiber; // Update the next thing we're working on in case something throws.

      workInProgress = completedWork;
    } while (completedWork !== null); // We've reached the root.


    if (workInProgressRootExitStatus === RootInProgress) {
      workInProgressRootExitStatus = RootCompleted;
    }
  }

  function commitRoot(root, recoverableErrors, transitions) {
    // TODO: This no longer makes any sense. We already wrap the mutation and
    // layout phases. Should be able to remove.
    var previousUpdateLanePriority = getCurrentUpdatePriority();
    var prevTransition = ReactCurrentBatchConfig$3.transition;

    try {
      ReactCurrentBatchConfig$3.transition = null;
      setCurrentUpdatePriority(DiscreteEventPriority);
      commitRootImpl(root, recoverableErrors, transitions, previousUpdateLanePriority);
    } finally {
      ReactCurrentBatchConfig$3.transition = prevTransition;
      setCurrentUpdatePriority(previousUpdateLanePriority);
    }

    return null;
  }

  function commitRootImpl(root, recoverableErrors, transitions, renderPriorityLevel) {
    do {
      // `flushPassiveEffects` will call `flushSyncUpdateQueue` at the end, which
      // means `flushPassiveEffects` will sometimes result in additional
      // passive effects. So we need to keep flushing in a loop until there are
      // no more pending effects.
      // TODO: Might be better if `flushPassiveEffects` did not automatically
      // flush synchronous work at the end, to avoid factoring hazards like this.
      flushPassiveEffects();
    } while (rootWithPendingPassiveEffects !== null);

    flushRenderPhaseStrictModeWarningsInDEV();

    if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
      throw new Error('Should not already be working.');
    }

    var finishedWork = root.finishedWork;
    var lanes = root.finishedLanes;

    {
      markCommitStarted(lanes);
    }

    if (finishedWork === null) {

      {
        markCommitStopped();
      }

      return null;
    } else {
      {
        if (lanes === NoLanes) {
          error('root.finishedLanes should not be empty during a commit. This is a ' + 'bug in React.');
        }
      }
    }

    root.finishedWork = null;
    root.finishedLanes = NoLanes;

    if (finishedWork === root.current) {
      throw new Error('Cannot commit the same tree as before. This error is likely caused by ' + 'a bug in React. Please file an issue.');
    } // commitRoot never returns a continuation; it always finishes synchronously.
    // So we can clear these now to allow a new callback to be scheduled.


    root.callbackNode = null;
    root.callbackPriority = NoLane; // Update the first and last pending times on this root. The new first
    // pending time is whatever is left on the root fiber.

    var remainingLanes = mergeLanes(finishedWork.lanes, finishedWork.childLanes);
    markRootFinished(root, remainingLanes);

    if (root === workInProgressRoot) {
      // We can reset these now that they are finished.
      workInProgressRoot = null;
      workInProgress = null;
      workInProgressRootRenderLanes = NoLanes;
    } // If there are pending passive effects, schedule a callback to process them.
    // Do this as early as possible, so it is queued before anything else that
    // might get scheduled in the commit phase. (See #16714.)
    // TODO: Delete all other places that schedule the passive effect callback
    // They're redundant.


    if ((finishedWork.subtreeFlags & PassiveMask) !== NoFlags || (finishedWork.flags & PassiveMask) !== NoFlags) {
      if (!rootDoesHavePassiveEffects) {
        rootDoesHavePassiveEffects = true;
        pendingPassiveEffectsRemainingLanes = remainingLanes; // workInProgressTransitions might be overwritten, so we want
        // to store it in pendingPassiveTransitions until they get processed
        // We need to pass this through as an argument to commitRoot
        // because workInProgressTransitions might have changed between
        // the previous render and commit if we throttle the commit
        // with setTimeout

        pendingPassiveTransitions = transitions;
        scheduleCallback$2(NormalPriority, function () {
          flushPassiveEffects(); // This render triggered passive effects: release the root cache pool
          // *after* passive effects fire to avoid freeing a cache pool that may
          // be referenced by a node in the tree (HostRoot, Cache boundary etc)

          return null;
        });
      }
    } // Check if there are any effects in the whole tree.
    // TODO: This is left over from the effect list implementation, where we had
    // to check for the existence of `firstEffect` to satisfy Flow. I think the
    // only other reason this optimization exists is because it affects profiling.
    // Reconsider whether this is necessary.


    var subtreeHasEffects = (finishedWork.subtreeFlags & (BeforeMutationMask | MutationMask | LayoutMask | PassiveMask)) !== NoFlags;
    var rootHasEffect = (finishedWork.flags & (BeforeMutationMask | MutationMask | LayoutMask | PassiveMask)) !== NoFlags;

    if (subtreeHasEffects || rootHasEffect) {
      var prevTransition = ReactCurrentBatchConfig$3.transition;
      ReactCurrentBatchConfig$3.transition = null;
      var previousPriority = getCurrentUpdatePriority();
      setCurrentUpdatePriority(DiscreteEventPriority);
      var prevExecutionContext = executionContext;
      executionContext |= CommitContext; // Reset this to null before calling lifecycles

      ReactCurrentOwner$2.current = null; // The commit phase is broken into several sub-phases. We do a separate pass
      // of the effect list for each phase: all mutation effects come before all
      // layout effects, and so on.
      // The first phase a "before mutation" phase. We use this phase to read the
      // state of the host tree right before we mutate it. This is where
      // getSnapshotBeforeUpdate is called.

      var shouldFireAfterActiveInstanceBlur = commitBeforeMutationEffects(root, finishedWork);

      {
        // Mark the current commit time to be shared by all Profilers in this
        // batch. This enables them to be grouped later.
        recordCommitTime();
      }


      commitMutationEffects(root, finishedWork, lanes);

      resetAfterCommit(root.containerInfo); // The work-in-progress tree is now the current tree. This must come after
      // the mutation phase, so that the previous tree is still current during
      // componentWillUnmount, but before the layout phase, so that the finished
      // work is current during componentDidMount/Update.

      root.current = finishedWork; // The next phase is the layout phase, where we call effects that read

      {
        markLayoutEffectsStarted(lanes);
      }

      commitLayoutEffects(finishedWork, root, lanes);

      {
        markLayoutEffectsStopped();
      }
      // opportunity to paint.


      requestPaint();
      executionContext = prevExecutionContext; // Reset the priority to the previous non-sync value.

      setCurrentUpdatePriority(previousPriority);
      ReactCurrentBatchConfig$3.transition = prevTransition;
    } else {
      // No effects.
      root.current = finishedWork; // Measure these anyway so the flamegraph explicitly shows that there were
      // no effects.
      // TODO: Maybe there's a better way to report this.

      {
        recordCommitTime();
      }
    }

    var rootDidHavePassiveEffects = rootDoesHavePassiveEffects;

    if (rootDoesHavePassiveEffects) {
      // This commit has passive effects. Stash a reference to them. But don't
      // schedule a callback until after flushing layout work.
      rootDoesHavePassiveEffects = false;
      rootWithPendingPassiveEffects = root;
      pendingPassiveEffectsLanes = lanes;
    } else {
      // There were no passive effects, so we can immediately release the cache
      // pool for this render.
      releaseRootPooledCache(root, remainingLanes);

      {
        nestedPassiveUpdateCount = 0;
        rootWithPassiveNestedUpdates = null;
      }
    } // Read this again, since an effect might have updated it


    remainingLanes = root.pendingLanes; // Check if there's remaining work on this root
    // TODO: This is part of the `componentDidCatch` implementation. Its purpose
    // is to detect whether something might have called setState inside
    // `componentDidCatch`. The mechanism is known to be flawed because `setState`
    // inside `componentDidCatch` is itself flawed — that's why we recommend
    // `getDerivedStateFromError` instead. However, it could be improved by
    // checking if remainingLanes includes Sync work, instead of whether there's
    // any work remaining at all (which would also include stuff like Suspense
    // retries or transitions). It's been like this for a while, though, so fixing
    // it probably isn't that urgent.

    if (remainingLanes === NoLanes) {
      // If there's no remaining work, we can clear the set of already failed
      // error boundaries.
      legacyErrorBoundariesThatAlreadyFailed = null;
    }

    {
      if (!rootDidHavePassiveEffects) {
        commitDoubleInvokeEffectsInDEV(root.current, false);
      }
    }

    onCommitRoot(finishedWork.stateNode, renderPriorityLevel);

    {
      if (isDevToolsPresent) {
        root.memoizedUpdaters.clear();
      }
    }

    {
      onCommitRoot$1();
    } // Always call this before exiting `commitRoot`, to ensure that any
    // additional work on this root is scheduled.


    ensureRootIsScheduled(root, now());

    if (recoverableErrors !== null) {
      // There were errors during this render, but recovered from them without
      // needing to surface it to the UI. We log them here.
      var onRecoverableError = root.onRecoverableError;

      for (var i = 0; i < recoverableErrors.length; i++) {
        var recoverableError = recoverableErrors[i];
        onRecoverableError(recoverableError);
      }
    }

    if (hasUncaughtError) {
      hasUncaughtError = false;
      var error$1 = firstUncaughtError;
      firstUncaughtError = null;
      throw error$1;
    } // If the passive effects are the result of a discrete render, flush them
    // synchronously at the end of the current task so that the result is
    // immediately observable. Otherwise, we assume that they are not
    // order-dependent and do not need to be observed by external systems, so we
    // can wait until after paint.
    // TODO: We can optimize this by not scheduling the callback earlier. Since we
    // currently schedule the callback in multiple places, will wait until those
    // are consolidated.


    if (includesSomeLane(pendingPassiveEffectsLanes, SyncLane) && root.tag !== LegacyRoot) {
      flushPassiveEffects();
    } // Read this again, since a passive effect might have updated it


    remainingLanes = root.pendingLanes;

    if (includesSomeLane(remainingLanes, SyncLane)) {
      {
        markNestedUpdateScheduled();
      } // Count the number of times the root synchronously re-renders without
      // finishing. If there are too many, it indicates an infinite update loop.


      if (root === rootWithNestedUpdates) {
        nestedUpdateCount++;
      } else {
        nestedUpdateCount = 0;
        rootWithNestedUpdates = root;
      }
    } else {
      nestedUpdateCount = 0;
    } // If layout work was scheduled, flush it now.


    flushSyncCallbacks();

    {
      markCommitStopped();
    }

    return null;
  }

  function releaseRootPooledCache(root, remainingLanes) {
    {
      var pooledCacheLanes = root.pooledCacheLanes &= remainingLanes;

      if (pooledCacheLanes === NoLanes) {
        // None of the remaining work relies on the cache pool. Clear it so
        // subsequent requests get a new cache
        var pooledCache = root.pooledCache;

        if (pooledCache != null) {
          root.pooledCache = null;
          releaseCache(pooledCache);
        }
      }
    }
  }

  function flushPassiveEffects() {
    // Returns whether passive effects were flushed.
    // TODO: Combine this check with the one in flushPassiveEFfectsImpl. We should
    // probably just combine the two functions. I believe they were only separate
    // in the first place because we used to wrap it with
    // `Scheduler.runWithPriority`, which accepts a function. But now we track the
    // priority within React itself, so we can mutate the variable directly.
    if (rootWithPendingPassiveEffects !== null) {
      // Cache the root since rootWithPendingPassiveEffects is cleared in
      // flushPassiveEffectsImpl
      var root = rootWithPendingPassiveEffects; // Cache and clear the remaining lanes flag; it must be reset since this
      // method can be called from various places, not always from commitRoot
      // where the remaining lanes are known

      var remainingLanes = pendingPassiveEffectsRemainingLanes;
      pendingPassiveEffectsRemainingLanes = NoLanes;
      var renderPriority = lanesToEventPriority(pendingPassiveEffectsLanes);
      var priority = lowerEventPriority(DefaultEventPriority, renderPriority);
      var prevTransition = ReactCurrentBatchConfig$3.transition;
      var previousPriority = getCurrentUpdatePriority();

      try {
        ReactCurrentBatchConfig$3.transition = null;
        setCurrentUpdatePriority(priority);
        return flushPassiveEffectsImpl();
      } finally {
        setCurrentUpdatePriority(previousPriority);
        ReactCurrentBatchConfig$3.transition = prevTransition; // Once passive effects have run for the tree - giving components a
        // chance to retain cache instances they use - release the pooled
        // cache at the root (if there is one)

        releaseRootPooledCache(root, remainingLanes);
      }
    }

    return false;
  }
  function enqueuePendingPassiveProfilerEffect(fiber) {
    {
      pendingPassiveProfilerEffects.push(fiber);

      if (!rootDoesHavePassiveEffects) {
        rootDoesHavePassiveEffects = true;
        scheduleCallback$2(NormalPriority, function () {
          flushPassiveEffects();
          return null;
        });
      }
    }
  }

  function flushPassiveEffectsImpl() {
    if (rootWithPendingPassiveEffects === null) {
      return false;
    } // Cache and clear the transitions flag


    var transitions = pendingPassiveTransitions;
    pendingPassiveTransitions = null;
    var root = rootWithPendingPassiveEffects;
    var lanes = pendingPassiveEffectsLanes;
    rootWithPendingPassiveEffects = null; // TODO: This is sometimes out of sync with rootWithPendingPassiveEffects.
    // Figure out why and fix it. It's not causing any known issues (probably
    // because it's only used for profiling), but it's a refactor hazard.

    pendingPassiveEffectsLanes = NoLanes;

    if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
      throw new Error('Cannot flush passive effects while already rendering.');
    }

    {
      isFlushingPassiveEffects = true;
      didScheduleUpdateDuringPassiveEffects = false;
    }

    {
      markPassiveEffectsStarted(lanes);
    }

    var prevExecutionContext = executionContext;
    executionContext |= CommitContext;
    commitPassiveUnmountEffects(root.current);
    commitPassiveMountEffects(root, root.current, lanes, transitions); // TODO: Move to commitPassiveMountEffects

    {
      var profilerEffects = pendingPassiveProfilerEffects;
      pendingPassiveProfilerEffects = [];

      for (var i = 0; i < profilerEffects.length; i++) {
        var _fiber = profilerEffects[i];
        commitPassiveEffectDurations(root, _fiber);
      }
    }

    {
      markPassiveEffectsStopped();
    }

    {
      commitDoubleInvokeEffectsInDEV(root.current, true);
    }

    executionContext = prevExecutionContext;
    flushSyncCallbacks();

    {
      // If additional passive effects were scheduled, increment a counter. If this
      // exceeds the limit, we'll fire a warning.
      if (didScheduleUpdateDuringPassiveEffects) {
        if (root === rootWithPassiveNestedUpdates) {
          nestedPassiveUpdateCount++;
        } else {
          nestedPassiveUpdateCount = 0;
          rootWithPassiveNestedUpdates = root;
        }
      } else {
        nestedPassiveUpdateCount = 0;
      }

      isFlushingPassiveEffects = false;
      didScheduleUpdateDuringPassiveEffects = false;
    } // TODO: Move to commitPassiveMountEffects


    onPostCommitRoot(root);

    {
      var stateNode = root.current.stateNode;
      stateNode.effectDuration = 0;
      stateNode.passiveEffectDuration = 0;
    }

    return true;
  }

  function isAlreadyFailedLegacyErrorBoundary(instance) {
    return legacyErrorBoundariesThatAlreadyFailed !== null && legacyErrorBoundariesThatAlreadyFailed.has(instance);
  }
  function markLegacyErrorBoundaryAsFailed(instance) {
    if (legacyErrorBoundariesThatAlreadyFailed === null) {
      legacyErrorBoundariesThatAlreadyFailed = new Set([instance]);
    } else {
      legacyErrorBoundariesThatAlreadyFailed.add(instance);
    }
  }

  function prepareToThrowUncaughtError(error) {
    if (!hasUncaughtError) {
      hasUncaughtError = true;
      firstUncaughtError = error;
    }
  }

  var onUncaughtError = prepareToThrowUncaughtError;

  function captureCommitPhaseErrorOnRoot(rootFiber, sourceFiber, error) {
    var errorInfo = createCapturedValue(error, sourceFiber);
    var update = createRootErrorUpdate(rootFiber, errorInfo, SyncLane);
    enqueueUpdate(rootFiber, update);
    var eventTime = requestEventTime();
    var root = markUpdateLaneFromFiberToRoot(rootFiber, SyncLane);

    if (root !== null) {
      markRootUpdated(root, SyncLane, eventTime);
      ensureRootIsScheduled(root, eventTime);
    }
  }

  function captureCommitPhaseError(sourceFiber, nearestMountedAncestor, error$1) {
    {
      reportUncaughtErrorInDEV(error$1);
      setIsRunningInsertionEffect(false);
    }

    if (sourceFiber.tag === HostRoot) {
      // Error was thrown at the root. There is no parent, so the root
      // itself should capture it.
      captureCommitPhaseErrorOnRoot(sourceFiber, sourceFiber, error$1);
      return;
    }

    var fiber = null;

    {
      fiber = nearestMountedAncestor;
    }

    while (fiber !== null) {
      if (fiber.tag === HostRoot) {
        captureCommitPhaseErrorOnRoot(fiber, sourceFiber, error$1);
        return;
      } else if (fiber.tag === ClassComponent) {
        var ctor = fiber.type;
        var instance = fiber.stateNode;

        if (typeof ctor.getDerivedStateFromError === 'function' || typeof instance.componentDidCatch === 'function' && !isAlreadyFailedLegacyErrorBoundary(instance)) {
          var errorInfo = createCapturedValue(error$1, sourceFiber);
          var update = createClassErrorUpdate(fiber, errorInfo, SyncLane);
          enqueueUpdate(fiber, update);
          var eventTime = requestEventTime();
          var root = markUpdateLaneFromFiberToRoot(fiber, SyncLane);

          if (root !== null) {
            markRootUpdated(root, SyncLane, eventTime);
            ensureRootIsScheduled(root, eventTime);
          }

          return;
        }
      }

      fiber = fiber.return;
    }

    {
      // TODO: Until we re-land skipUnmountedBoundaries (see #20147), this warning
      // will fire for errors that are thrown by destroy functions inside deleted
      // trees. What it should instead do is propagate the error to the parent of
      // the deleted tree. In the meantime, do not add this warning to the
      // allowlist; this is only for our internal use.
      error('Internal React error: Attempted to capture a commit phase error ' + 'inside a detached tree. This indicates a bug in React. Likely ' + 'causes include deleting the same fiber more than once, committing an ' + 'already-finished tree, or an inconsistent return pointer.\n\n' + 'Error message:\n\n%s', error$1);
    }
  }
  function pingSuspendedRoot(root, wakeable, pingedLanes) {
    var pingCache = root.pingCache;

    if (pingCache !== null) {
      // The wakeable resolved, so we no longer need to memoize, because it will
      // never be thrown again.
      pingCache.delete(wakeable);
    }

    var eventTime = requestEventTime();
    markRootPinged(root, pingedLanes);
    warnIfSuspenseResolutionNotWrappedWithActDEV(root);

    if (workInProgressRoot === root && isSubsetOfLanes(workInProgressRootRenderLanes, pingedLanes)) {
      // Received a ping at the same priority level at which we're currently
      // rendering. We might want to restart this render. This should mirror
      // the logic of whether or not a root suspends once it completes.
      // TODO: If we're rendering sync either due to Sync, Batched or expired,
      // we should probably never restart.
      // If we're suspended with delay, or if it's a retry, we'll always suspend
      // so we can always restart.
      if (workInProgressRootExitStatus === RootSuspendedWithDelay || workInProgressRootExitStatus === RootSuspended && includesOnlyRetries(workInProgressRootRenderLanes) && now() - globalMostRecentFallbackTime < FALLBACK_THROTTLE_MS) {
        // Restart from the root.
        prepareFreshStack(root, NoLanes);
      } else {
        // Even though we can't restart right now, we might get an
        // opportunity later. So we mark this render as having a ping.
        workInProgressRootPingedLanes = mergeLanes(workInProgressRootPingedLanes, pingedLanes);
      }
    }

    ensureRootIsScheduled(root, eventTime);
  }

  function retryTimedOutBoundary(boundaryFiber, retryLane) {
    // The boundary fiber (a Suspense component or SuspenseList component)
    // previously was rendered in its fallback state. One of the promises that
    // suspended it has resolved, which means at least part of the tree was
    // likely unblocked. Try rendering again, at a new lanes.
    if (retryLane === NoLane) {
      // TODO: Assign this to `suspenseState.retryLane`? to avoid
      // unnecessary entanglement?
      retryLane = requestRetryLane(boundaryFiber);
    } // TODO: Special case idle priority?


    var eventTime = requestEventTime();
    var root = markUpdateLaneFromFiberToRoot(boundaryFiber, retryLane);

    if (root !== null) {
      markRootUpdated(root, retryLane, eventTime);
      ensureRootIsScheduled(root, eventTime);
    }
  }

  function retryDehydratedSuspenseBoundary(boundaryFiber) {
    var suspenseState = boundaryFiber.memoizedState;
    var retryLane = NoLane;

    if (suspenseState !== null) {
      retryLane = suspenseState.retryLane;
    }

    retryTimedOutBoundary(boundaryFiber, retryLane);
  }
  function resolveRetryWakeable(boundaryFiber, wakeable) {
    var retryLane = NoLane; // Default

    var retryCache;

    switch (boundaryFiber.tag) {
      case SuspenseComponent:
        retryCache = boundaryFiber.stateNode;
        var suspenseState = boundaryFiber.memoizedState;

        if (suspenseState !== null) {
          retryLane = suspenseState.retryLane;
        }

        break;

      case SuspenseListComponent:
        retryCache = boundaryFiber.stateNode;
        break;

      default:
        throw new Error('Pinged unknown suspense boundary type. ' + 'This is probably a bug in React.');
    }

    if (retryCache !== null) {
      // The wakeable resolved, so we no longer need to memoize, because it will
      // never be thrown again.
      retryCache.delete(wakeable);
    }

    retryTimedOutBoundary(boundaryFiber, retryLane);
  } // Computes the next Just Noticeable Difference (JND) boundary.
  // The theory is that a person can't tell the difference between small differences in time.
  // Therefore, if we wait a bit longer than necessary that won't translate to a noticeable
  // difference in the experience. However, waiting for longer might mean that we can avoid
  // showing an intermediate loading state. The longer we have already waited, the harder it
  // is to tell small differences in time. Therefore, the longer we've already waited,
  // the longer we can wait additionally. At some point we have to give up though.
  // We pick a train model where the next boundary commits at a consistent schedule.
  // These particular numbers are vague estimates. We expect to adjust them based on research.

  function jnd(timeElapsed) {
    return timeElapsed < 120 ? 120 : timeElapsed < 480 ? 480 : timeElapsed < 1080 ? 1080 : timeElapsed < 1920 ? 1920 : timeElapsed < 3000 ? 3000 : timeElapsed < 4320 ? 4320 : ceil(timeElapsed / 1960) * 1960;
  }

  function checkForNestedUpdates() {
    if (nestedUpdateCount > NESTED_UPDATE_LIMIT) {
      nestedUpdateCount = 0;
      rootWithNestedUpdates = null;
      throw new Error('Maximum update depth exceeded. This can happen when a component ' + 'repeatedly calls setState inside componentWillUpdate or ' + 'componentDidUpdate. React limits the number of nested updates to ' + 'prevent infinite loops.');
    }

    {
      if (nestedPassiveUpdateCount > NESTED_PASSIVE_UPDATE_LIMIT) {
        nestedPassiveUpdateCount = 0;
        rootWithPassiveNestedUpdates = null;

        error('Maximum update depth exceeded. This can happen when a component ' + "calls setState inside useEffect, but useEffect either doesn't " + 'have a dependency array, or one of the dependencies changes on ' + 'every render.');
      }
    }
  }

  function flushRenderPhaseStrictModeWarningsInDEV() {
    {
      ReactStrictModeWarnings.flushLegacyContextWarning();

      {
        ReactStrictModeWarnings.flushPendingUnsafeLifecycleWarnings();
      }
    }
  }

  function commitDoubleInvokeEffectsInDEV(fiber, hasPassiveEffects) {
    {
      // TODO (StrictEffects) Should we set a marker on the root if it contains strict effects
      // so we don't traverse unnecessarily? similar to subtreeFlags but just at the root level.
      // Maybe not a big deal since this is DEV only behavior.
      setCurrentFiber(fiber);
      invokeEffectsInDev(fiber, MountLayoutDev, invokeLayoutEffectUnmountInDEV);

      if (hasPassiveEffects) {
        invokeEffectsInDev(fiber, MountPassiveDev, invokePassiveEffectUnmountInDEV);
      }

      invokeEffectsInDev(fiber, MountLayoutDev, invokeLayoutEffectMountInDEV);

      if (hasPassiveEffects) {
        invokeEffectsInDev(fiber, MountPassiveDev, invokePassiveEffectMountInDEV);
      }

      resetCurrentFiber();
    }
  }

  function invokeEffectsInDev(firstChild, fiberFlags, invokeEffectFn) {
    {
      // We don't need to re-check StrictEffectsMode here.
      // This function is only called if that check has already passed.
      var current = firstChild;
      var subtreeRoot = null;

      while (current !== null) {
        var primarySubtreeFlag = current.subtreeFlags & fiberFlags;

        if (current !== subtreeRoot && current.child !== null && primarySubtreeFlag !== NoFlags) {
          current = current.child;
        } else {
          if ((current.flags & fiberFlags) !== NoFlags) {
            invokeEffectFn(current);
          }

          if (current.sibling !== null) {
            current = current.sibling;
          } else {
            current = subtreeRoot = current.return;
          }
        }
      }
    }
  }

  var didWarnStateUpdateForNotYetMountedComponent = null;

  function warnAboutUpdateOnNotYetMountedFiberInDEV(fiber) {
    {
      if ((executionContext & RenderContext) !== NoContext) {
        // We let the other warning about render phase updates deal with this one.
        return;
      }

      if (!(fiber.mode & ConcurrentMode)) {
        return;
      }

      var tag = fiber.tag;

      if (tag !== IndeterminateComponent && tag !== HostRoot && tag !== ClassComponent && tag !== FunctionComponent && tag !== ForwardRef && tag !== MemoComponent && tag !== SimpleMemoComponent) {
        // Only warn for user-defined components, not internal ones like Suspense.
        return;
      } // We show the whole stack but dedupe on the top component's name because
      // the problematic code almost always lies inside that component.


      var componentName = getComponentNameFromFiber(fiber) || 'ReactComponent';

      if (didWarnStateUpdateForNotYetMountedComponent !== null) {
        if (didWarnStateUpdateForNotYetMountedComponent.has(componentName)) {
          return;
        }

        didWarnStateUpdateForNotYetMountedComponent.add(componentName);
      } else {
        didWarnStateUpdateForNotYetMountedComponent = new Set([componentName]);
      }

      var previousFiber = current;

      try {
        setCurrentFiber(fiber);

        error("Can't perform a React state update on a component that hasn't mounted yet. " + 'This indicates that you have a side-effect in your render function that ' + 'asynchronously later calls tries to update the component. Move this work to ' + 'useEffect instead.');
      } finally {
        if (previousFiber) {
          setCurrentFiber(fiber);
        } else {
          resetCurrentFiber();
        }
      }
    }
  }

  var beginWork$1;

  {
    var dummyFiber = null;

    beginWork$1 = function (current, unitOfWork, lanes) {
      // If a component throws an error, we replay it again in a synchronously
      // dispatched event, so that the debugger will treat it as an uncaught
      // error See ReactErrorUtils for more information.
      // Before entering the begin phase, copy the work-in-progress onto a dummy
      // fiber. If beginWork throws, we'll use this to reset the state.
      var originalWorkInProgressCopy = assignFiberPropertiesInDEV(dummyFiber, unitOfWork);

      try {
        return beginWork(current, unitOfWork, lanes);
      } catch (originalError) {
        if (originalError !== null && typeof originalError === 'object' && typeof originalError.then === 'function') {
          // Don't replay promises. Treat everything else like an error.
          throw originalError;
        } // Keep this code in sync with handleError; any changes here must have
        // corresponding changes there.


        resetContextDependencies();
        resetHooksAfterThrow(); // Don't reset current debug fiber, since we're about to work on the
        // same fiber again.
        // Unwind the failed stack frame

        unwindInterruptedWork(current, unitOfWork); // Restore the original properties of the fiber.

        assignFiberPropertiesInDEV(unitOfWork, originalWorkInProgressCopy);

        if ( unitOfWork.mode & ProfileMode) {
          // Reset the profiler timer.
          startProfilerTimer(unitOfWork);
        } // Run beginWork again.


        invokeGuardedCallback(null, beginWork, null, current, unitOfWork, lanes);

        if (hasCaughtError()) {
          var replayError = clearCaughtError();

          if (typeof replayError === 'object' && replayError !== null && replayError._suppressLogging && typeof originalError === 'object' && originalError !== null && !originalError._suppressLogging) {
            // If suppressed, let the flag carry over to the original error which is the one we'll rethrow.
            originalError._suppressLogging = true;
          }
        } // We always throw the original error in case the second render pass is not idempotent.
        // This can happen if a memoized function or CommonJS module doesn't throw after first invocation.


        throw originalError;
      }
    };
  }

  var didWarnAboutUpdateInRender = false;
  var didWarnAboutUpdateInRenderForAnotherComponent;

  {
    didWarnAboutUpdateInRenderForAnotherComponent = new Set();
  }

  function warnAboutRenderPhaseUpdatesInDEV(fiber) {
    {
      if (isRendering && !getIsUpdatingOpaqueValueInRenderPhaseInDEV()) {
        switch (fiber.tag) {
          case FunctionComponent:
          case ForwardRef:
          case SimpleMemoComponent:
            {
              var renderingComponentName = workInProgress && getComponentNameFromFiber(workInProgress) || 'Unknown'; // Dedupe by the rendering component because it's the one that needs to be fixed.

              var dedupeKey = renderingComponentName;

              if (!didWarnAboutUpdateInRenderForAnotherComponent.has(dedupeKey)) {
                didWarnAboutUpdateInRenderForAnotherComponent.add(dedupeKey);
                var setStateComponentName = getComponentNameFromFiber(fiber) || 'Unknown';

                error('Cannot update a component (`%s`) while rendering a ' + 'different component (`%s`). To locate the bad setState() call inside `%s`, ' + 'follow the stack trace as described in https://reactjs.org/link/setstate-in-render', setStateComponentName, renderingComponentName, renderingComponentName);
              }

              break;
            }

          case ClassComponent:
            {
              if (!didWarnAboutUpdateInRender) {
                error('Cannot update during an existing state transition (such as ' + 'within `render`). Render methods should be a pure ' + 'function of props and state.');

                didWarnAboutUpdateInRender = true;
              }

              break;
            }
        }
      }
    }
  }

  function restorePendingUpdaters(root, lanes) {
    {
      if (isDevToolsPresent) {
        var memoizedUpdaters = root.memoizedUpdaters;
        memoizedUpdaters.forEach(function (schedulingFiber) {
          addFiberToLanesMap(root, schedulingFiber, lanes);
        }); // This function intentionally does not clear memoized updaters.
        // Those may still be relevant to the current commit
        // and a future one (e.g. Suspense).
      }
    }
  }
  var fakeActCallbackNode = {};

  function scheduleCallback$2(priorityLevel, callback) {
    {
      // If we're currently inside an `act` scope, bypass Scheduler and push to
      // the `act` queue instead.
      var actQueue = ReactCurrentActQueue$1.current;

      if (actQueue !== null) {
        actQueue.push(callback);
        return fakeActCallbackNode;
      } else {
        return scheduleCallback(priorityLevel, callback);
      }
    }
  }

  function cancelCallback$1(callbackNode) {
    if ( callbackNode === fakeActCallbackNode) {
      return;
    } // In production, always call Scheduler. This function will be stripped out.


    return cancelCallback(callbackNode);
  }

  function shouldForceFlushFallbacksInDEV() {
    // Never force flush in production. This function should get stripped out.
    return  ReactCurrentActQueue$1.current !== null;
  }

  function warnIfUpdatesNotWrappedWithActDEV(fiber) {
    {
      if (fiber.mode & ConcurrentMode) {
        if (!isConcurrentActEnvironment()) {
          // Not in an act environment. No need to warn.
          return;
        }
      } else {
        // Legacy mode has additional cases where we suppress a warning.
        if (!isLegacyActEnvironment()) {
          // Not in an act environment. No need to warn.
          return;
        }

        if (executionContext !== NoContext) {
          // Legacy mode doesn't warn if the update is batched, i.e.
          // batchedUpdates or flushSync.
          return;
        }

        if (fiber.tag !== FunctionComponent && fiber.tag !== ForwardRef && fiber.tag !== SimpleMemoComponent) {
          // For backwards compatibility with pre-hooks code, legacy mode only
          // warns for updates that originate from a hook.
          return;
        }
      }

      if (ReactCurrentActQueue$1.current === null) {
        var previousFiber = current;

        try {
          setCurrentFiber(fiber);

          error('An update to %s inside a test was not wrapped in act(...).\n\n' + 'When testing, code that causes React state updates should be ' + 'wrapped into act(...):\n\n' + 'act(() => {\n' + '  /* fire events that update state */\n' + '});\n' + '/* assert on the output */\n\n' + "This ensures that you're testing the behavior the user would see " + 'in the browser.' + ' Learn more at https://reactjs.org/link/wrap-tests-with-act', getComponentNameFromFiber(fiber));
        } finally {
          if (previousFiber) {
            setCurrentFiber(fiber);
          } else {
            resetCurrentFiber();
          }
        }
      }
    }
  }

  function warnIfSuspenseResolutionNotWrappedWithActDEV(root) {
    {
      if (root.tag !== LegacyRoot && isConcurrentActEnvironment() && ReactCurrentActQueue$1.current === null) {
        error('A suspended resource finished loading inside a test, but the event ' + 'was not wrapped in act(...).\n\n' + 'When testing, code that resolves suspended data should be wrapped ' + 'into act(...):\n\n' + 'act(() => {\n' + '  /* finish loading suspended data */\n' + '});\n' + '/* assert on the output */\n\n' + "This ensures that you're testing the behavior the user would see " + 'in the browser.' + ' Learn more at https://reactjs.org/link/wrap-tests-with-act');
      }
    }
  }

  function setIsRunningInsertionEffect(isRunning) {
    {
      isRunningInsertionEffect = isRunning;
    }
  }