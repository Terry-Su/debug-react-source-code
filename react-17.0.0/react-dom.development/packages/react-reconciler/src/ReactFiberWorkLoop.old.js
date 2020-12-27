  var ceil = Math.ceil;
  var ReactCurrentDispatcher$2 = ReactSharedInternals.ReactCurrentDispatcher,
      ReactCurrentOwner$2 = ReactSharedInternals.ReactCurrentOwner,
      IsSomeRendererActing = ReactSharedInternals.IsSomeRendererActing;
  var NoContext =
  /*             */
  0;
  var BatchedContext =
  /*               */
  1;
  var EventContext =
  /*                 */
  2;
  var DiscreteEventContext =
  /*         */
  4;
  var LegacyUnbatchedContext =
  /*       */
  8;
  var RenderContext =
  /*                */
  16;
  var CommitContext =
  /*                */
  32;
  var RetryAfterError =
  /*       */
  64;
  var RootIncomplete = 0;
  var RootFatalErrored = 1;
  var RootErrored = 2;
  var RootSuspended = 3;
  var RootSuspendedWithDelay = 4;
  var RootCompleted = 5; // Describes where we are in the React execution stack

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

  var workInProgressRootExitStatus = RootIncomplete; // A fatal error, if one is thrown

  var workInProgressRootFatalError = null; // "Included" lanes refer to lanes that were worked on during this render. It's
  // slightly different than `renderLanes` because `renderLanes` can change as you
  // enter and exit an Offscreen tree. This value is the combination of all render
  // lanes for the entire render phase.

  var workInProgressRootIncludedLanes = NoLanes; // The work left over by components that were visited during this render. Only
  // includes unprocessed updates, not work in bailed out children.

  var workInProgressRootSkippedLanes = NoLanes; // Lanes that were updated (in an interleaved event) during this render.

  var workInProgressRootUpdatedLanes = NoLanes; // Lanes that were pinged (in an interleaved event) during this render.

  var workInProgressRootPingedLanes = NoLanes;
  var mostRecentlyUpdatedRoot = null; // The most recent time we committed a fallback. This lets us ensure a train
  // model where we don't commit new loading states in too quick succession.

  var globalMostRecentFallbackTime = 0;
  var FALLBACK_THROTTLE_MS = 500; // The absolute time for when we should start giving up on rendering
  // more and prefer CPU suspense heuristics instead.

  var workInProgressRootRenderTargetTime = Infinity; // How long a render is supposed to take before we start following CPU
  // suspense heuristics and opt out of rendering more content.

  var RENDER_TIMEOUT_MS = 500;

  function resetRenderTimer() {
    workInProgressRootRenderTargetTime = now() + RENDER_TIMEOUT_MS;
  }

  function getRenderTargetTime() {
    return workInProgressRootRenderTargetTime;
  }
  var nextEffect = null;
  var hasUncaughtError = false;
  var firstUncaughtError = null;
  var legacyErrorBoundariesThatAlreadyFailed = null;
  var rootDoesHavePassiveEffects = false;
  var rootWithPendingPassiveEffects = null;
  var pendingPassiveEffectsRenderPriority = NoPriority$1;
  var pendingPassiveEffectsLanes = NoLanes;
  var pendingPassiveHookEffectsMount = [];
  var pendingPassiveHookEffectsUnmount = [];
  var rootsWithPendingDiscreteUpdates = null; // Use these to prevent an infinite loop of nested updates

  var NESTED_UPDATE_LIMIT = 50;
  var nestedUpdateCount = 0;
  var rootWithNestedUpdates = null;
  var NESTED_PASSIVE_UPDATE_LIMIT = 50;
  var nestedPassiveUpdateCount = 0; // Marks the need to reschedule pending interactions at these lanes
  // during the commit phase. This enables them to be traced across components
  // that spawn new work during render. E.g. hidden boundaries, suspended SSR
  // hydration or SuspenseList.
  // TODO: Can use a bitmask instead of an array

  var spawnedWorkDuringRender = null; // If two updates are scheduled within the same event, we should treat their
  // event times as simultaneous, even if the actual clock time has advanced
  // between the first and second call.

  var currentEventTime = NoTimestamp;
  var currentEventWipLanes = NoLanes;
  var currentEventPendingLanes = NoLanes; // Dev only flag that tracks if passive effects are currently being flushed.
  // We warn about state updates for unmounted components differently in this case.

  var isFlushingPassiveEffects = false;
  var focusedInstanceHandle = null;
  var shouldFireAfterActiveInstanceBlur = false;
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

    if ((mode & BlockingMode) === NoMode) {
      return SyncLane;
    } else if ((mode & ConcurrentMode) === NoMode) {
      return getCurrentPriorityLevel() === ImmediatePriority$1 ? SyncLane : SyncBatchedLane;
    } // The algorithm for assigning an update to a lane should be stable for all
    // updates at the same priority within the same event. To do this, the inputs
    // to the algorithm must be the same. For example, we use the `renderLanes`
    // to avoid choosing a lane that is already in the middle of rendering.
    //
    // However, the "included" lanes could be mutated in between updates in the
    // same event, like if you perform an update inside `flushSync`. Or any other
    // code path that might call `prepareFreshStack`.
    //
    // The trick we use is to cache the first of each of these inputs within an
    // event. Then reset the cached values once we can be sure the event is over.
    // Our heuristic for that is whenever we enter a concurrent work loop.
    //
    // We'll do the same for `currentEventPendingLanes` below.


    if (currentEventWipLanes === NoLanes) {
      currentEventWipLanes = workInProgressRootIncludedLanes;
    }

    var isTransition = requestCurrentTransition() !== NoTransition;

    if (isTransition) {
      if (currentEventPendingLanes !== NoLanes) {
        currentEventPendingLanes = mostRecentlyUpdatedRoot !== null ? mostRecentlyUpdatedRoot.pendingLanes : NoLanes;
      }

      return findTransitionLane(currentEventWipLanes, currentEventPendingLanes);
    } // TODO: Remove this dependency on the Scheduler priority.
    // To do that, we're replacing it with an update lane priority.


    var schedulerPriority = getCurrentPriorityLevel(); // The old behavior was using the priority level of the Scheduler.
    // This couples React to the Scheduler internals, so we're replacing it
    // with the currentUpdateLanePriority above. As an example of how this
    // could be problematic, if we're not inside `Scheduler.runWithPriority`,
    // then we'll get the priority of the current running Scheduler task,
    // which is probably not what we want.

    var lane;

    if ( // TODO: Temporary. We're removing the concept of discrete updates.
    (executionContext & DiscreteEventContext) !== NoContext && schedulerPriority === UserBlockingPriority$2) {
      lane = findUpdateLane(InputDiscreteLanePriority, currentEventWipLanes);
    } else {
      var schedulerLanePriority = schedulerPriorityToLanePriority(schedulerPriority);

      lane = findUpdateLane(schedulerLanePriority, currentEventWipLanes);
    }

    return lane;
  }

  function requestRetryLane(fiber) {
    // This is a fork of `requestUpdateLane` designed specifically for Suspense
    // "retries" — a special update that attempts to flip a Suspense boundary
    // from its placeholder state to its primary/resolved state.
    // Special cases
    var mode = fiber.mode;

    if ((mode & BlockingMode) === NoMode) {
      return SyncLane;
    } else if ((mode & ConcurrentMode) === NoMode) {
      return getCurrentPriorityLevel() === ImmediatePriority$1 ? SyncLane : SyncBatchedLane;
    } // See `requestUpdateLane` for explanation of `currentEventWipLanes`


    if (currentEventWipLanes === NoLanes) {
      currentEventWipLanes = workInProgressRootIncludedLanes;
    }

    return findRetryLane(currentEventWipLanes);
  }

  function scheduleUpdateOnFiber(fiber, lane, eventTime) {
    checkForNestedUpdates();
    warnAboutRenderPhaseUpdatesInDEV(fiber);
    var root = markUpdateLaneFromFiberToRoot(fiber, lane);

    if (root === null) {
      warnAboutUpdateOnUnmountedFiberInDEV(fiber);
      return null;
    } // Mark that the root has a pending update.


    markRootUpdated(root, lane, eventTime);

    if (root === workInProgressRoot) {
      // Received an update to a tree that's in the middle of rendering. Mark
      // that there was an interleaved update work on this root. Unless the
      // `deferRenderPhaseUpdateToNextBatch` flag is off and this is a render
      // phase update. In that case, we don't treat render phase updates as if
      // they were interleaved, for backwards compat reasons.
      {
        workInProgressRootUpdatedLanes = mergeLanes(workInProgressRootUpdatedLanes, lane);
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
    } // TODO: requestUpdateLanePriority also reads the priority. Pass the
    // priority as an argument to that function and this one.


    var priorityLevel = getCurrentPriorityLevel();

    if (lane === SyncLane) {
      if ( // Check if we're inside unbatchedUpdates
      (executionContext & LegacyUnbatchedContext) !== NoContext && // Check if we're not already rendering
      (executionContext & (RenderContext | CommitContext)) === NoContext) {
        // Register pending interactions on the root to avoid losing traced interaction data.
        schedulePendingInteractions(root, lane); // This is a legacy edge case. The initial mount of a ReactDOM.render-ed
        // root inside of batchedUpdates should be synchronous, but layout updates
        // should be deferred until the end of the batch.

        performSyncWorkOnRoot(root);
      } else {
        ensureRootIsScheduled(root, eventTime);
        schedulePendingInteractions(root, lane);

        if (executionContext === NoContext) {
          // Flush the synchronous work now, unless we're already working or inside
          // a batch. This is intentionally inside scheduleUpdateOnFiber instead of
          // scheduleCallbackForFiber to preserve the ability to schedule a callback
          // without immediately flushing it. We only do this for user-initiated
          // updates, to preserve historical behavior of legacy mode.
          resetRenderTimer();
          flushSyncCallbackQueue();
        }
      }
    } else {
      // Schedule a discrete update but only if it's not Sync.
      if ((executionContext & DiscreteEventContext) !== NoContext && ( // Only updates at user-blocking priority or greater are considered
      // discrete, even inside a discrete event.
      priorityLevel === UserBlockingPriority$2 || priorityLevel === ImmediatePriority$1)) {
        // This is the result of a discrete event. Track the lowest priority
        // discrete update per root so we can flush them early, if needed.
        if (rootsWithPendingDiscreteUpdates === null) {
          rootsWithPendingDiscreteUpdates = new Set([root]);
        } else {
          rootsWithPendingDiscreteUpdates.add(root);
        }
      } // Schedule other updates after in case the callback is sync.


      ensureRootIsScheduled(root, eventTime);
      schedulePendingInteractions(root, lane);
    } // We use this when assigning a lane for a transition inside
    // `requestUpdateLane`. We assume it's the same as the root being updated,
    // since in the common case of a single root app it probably is. If it's not
    // the same root, then it's not a huge deal, we just might batch more stuff
    // together more than necessary.


    mostRecentlyUpdatedRoot = root;
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
    } // Walk the parent path to the root and update the child expiration time.


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
  } // Use this function to schedule a task for a root. There's only one task per
  // root; if a task was already scheduled, we'll check to make sure the priority
  // of the existing task is the same as the priority of the next level that the
  // root has work on. This function is called on every update, and right before
  // exiting a task.


  function ensureRootIsScheduled(root, currentTime) {
    var existingCallbackNode = root.callbackNode; // Check if any lanes are being starved by other work. If so, mark them as
    // expired so we know to work on those next.

    markStarvedLanesAsExpired(root, currentTime); // Determine the next lanes to work on, and their priority.

    var nextLanes = getNextLanes(root, root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes); // This returns the priority level computed during the `getNextLanes` call.

    var newCallbackPriority = returnNextLanesPriority();

    if (nextLanes === NoLanes) {
      // Special case: There's nothing to work on.
      if (existingCallbackNode !== null) {
        cancelCallback(existingCallbackNode);
        root.callbackNode = null;
        root.callbackPriority = NoLanePriority;
      }

      return;
    } // Check if there's an existing task. We may be able to reuse it.


    if (existingCallbackNode !== null) {
      var existingCallbackPriority = root.callbackPriority;

      if (existingCallbackPriority === newCallbackPriority) {
        // The priority hasn't changed. We can reuse the existing task. Exit.
        return;
      } // The priority changed. Cancel the existing callback. We'll schedule a new
      // one below.


      cancelCallback(existingCallbackNode);
    } // Schedule a new callback.


    var newCallbackNode;

    if (newCallbackPriority === SyncLanePriority) {
      // Special case: Sync React callbacks are scheduled on a special
      // internal queue
      newCallbackNode = scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
    } else if (newCallbackPriority === SyncBatchedLanePriority) {
      newCallbackNode = scheduleCallback(ImmediatePriority$1, performSyncWorkOnRoot.bind(null, root));
    } else {
      var schedulerPriorityLevel = lanePriorityToSchedulerPriority(newCallbackPriority);
      newCallbackNode = scheduleCallback(schedulerPriorityLevel, performConcurrentWorkOnRoot.bind(null, root));
    }

    root.callbackPriority = newCallbackPriority;
    root.callbackNode = newCallbackNode;
  } // This is the entry point for every concurrent task, i.e. anything that
  // goes through Scheduler.


  function performConcurrentWorkOnRoot(root) {
    // Since we know we're in a React event, we can clear the current
    // event time. The next update will compute a new event time.
    currentEventTime = NoTimestamp;
    currentEventWipLanes = NoLanes;
    currentEventPendingLanes = NoLanes;

    if (!((executionContext & (RenderContext | CommitContext)) === NoContext)) {
      {
        throw Error( "Should not already be working." );
      }
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
    } // Determine the next expiration time to work on, using the fields stored
    // on the root.


    var lanes = getNextLanes(root, root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes);

    if (lanes === NoLanes) {
      // Defensive coding. This is never expected to happen.
      return null;
    }

    var exitStatus = renderRootConcurrent(root, lanes);

    if (includesSomeLane(workInProgressRootIncludedLanes, workInProgressRootUpdatedLanes)) {
      // The render included lanes that were updated during the render phase.
      // For example, when unhiding a hidden tree, we include all the lanes
      // that were previously skipped when the tree was hidden. That set of
      // lanes is a superset of the lanes we started rendering with.
      //
      // So we'll throw out the current work and restart.
      prepareFreshStack(root, NoLanes);
    } else if (exitStatus !== RootIncomplete) {
      if (exitStatus === RootErrored) {
        executionContext |= RetryAfterError; // If an error occurred during hydration,
        // discard server response and fall back to client side render.

        if (root.hydrate) {
          root.hydrate = false;
          clearContainer(root.containerInfo);
        } // If something threw an error, try rendering one more time. We'll render
        // synchronously to block concurrent data mutations, and we'll includes
        // all pending updates are included. If it still fails after the second
        // attempt, we'll give up and commit the resulting tree.


        lanes = getLanesToRetrySynchronouslyOnError(root);

        if (lanes !== NoLanes) {
          exitStatus = renderRootSync(root, lanes);
        }
      }

      if (exitStatus === RootFatalErrored) {
        var fatalError = workInProgressRootFatalError;
        prepareFreshStack(root, NoLanes);
        markRootSuspended$1(root, lanes);
        ensureRootIsScheduled(root, now());
        throw fatalError;
      } // We now have a consistent tree. The next step is either to commit it,
      // or, if something suspended, wait to commit it after a timeout.


      var finishedWork = root.current.alternate;
      root.finishedWork = finishedWork;
      root.finishedLanes = lanes;
      finishConcurrentRender(root, exitStatus, lanes);
    }

    ensureRootIsScheduled(root, now());

    if (root.callbackNode === originalCallbackNode) {
      // The task node scheduled for this root is the same one that's
      // currently executed. Need to return a continuation.
      return performConcurrentWorkOnRoot.bind(null, root);
    }

    return null;
  }

  function finishConcurrentRender(root, exitStatus, lanes) {
    switch (exitStatus) {
      case RootIncomplete:
      case RootFatalErrored:
        {
          {
            {
              throw Error( "Root did not complete. This is a bug in React." );
            }
          }
        }
      // Flow knows about invariant, so it complains if I add a break
      // statement, but eslint doesn't know about invariant, so it complains
      // if I do. eslint-disable-next-line no-fallthrough

      case RootErrored:
        {
          // We should have already attempted to retry this tree. If we reached
          // this point, it errored again. Commit it.
          commitRoot(root);
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


              root.timeoutHandle = scheduleTimeout(commitRoot.bind(null, root), msUntilTimeout);
              break;
            }
          } // The work expired. Commit immediately.


          commitRoot(root);
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
              root.timeoutHandle = scheduleTimeout(commitRoot.bind(null, root), _msUntilTimeout);
              break;
            }
          } // Commit the placeholder.


          commitRoot(root);
          break;
        }

      case RootCompleted:
        {
          // The work completed. Ready to commit.
          commitRoot(root);
          break;
        }

      default:
        {
          {
            {
              throw Error( "Unknown root exit status." );
            }
          }
        }
    }
  }

  function markRootSuspended$1(root, suspendedLanes) {
    // When suspending, we should always exclude lanes that were pinged or (more
    // rarely, since we try to avoid it) updated during the render phase.
    // TODO: Lol maybe there's a better way to factor this besides this
    // obnoxiously named function :)
    suspendedLanes = removeLanes(suspendedLanes, workInProgressRootPingedLanes);
    suspendedLanes = removeLanes(suspendedLanes, workInProgressRootUpdatedLanes);
    markRootSuspended(root, suspendedLanes);
  } // This is the entry point for synchronous tasks that don't go
  // through Scheduler


  function performSyncWorkOnRoot(root) {
    if (!((executionContext & (RenderContext | CommitContext)) === NoContext)) {
      {
        throw Error( "Should not already be working." );
      }
    }

    flushPassiveEffects();
    var lanes;
    var exitStatus;

    if (root === workInProgressRoot && includesSomeLane(root.expiredLanes, workInProgressRootRenderLanes)) {
      // There's a partial tree, and at least one of its lanes has expired. Finish
      // rendering it before rendering the rest of the expired work.
      lanes = workInProgressRootRenderLanes;
      exitStatus = renderRootSync(root, lanes);

      if (includesSomeLane(workInProgressRootIncludedLanes, workInProgressRootUpdatedLanes)) {
        // The render included lanes that were updated during the render phase.
        // For example, when unhiding a hidden tree, we include all the lanes
        // that were previously skipped when the tree was hidden. That set of
        // lanes is a superset of the lanes we started rendering with.
        //
        // Note that this only happens when part of the tree is rendered
        // concurrently. If the whole tree is rendered synchronously, then there
        // are no interleaved events.
        lanes = getNextLanes(root, lanes);
        exitStatus = renderRootSync(root, lanes);
      }
    } else {
      lanes = getNextLanes(root, NoLanes);
      exitStatus = renderRootSync(root, lanes);
    }

    if (root.tag !== LegacyRoot && exitStatus === RootErrored) {
      executionContext |= RetryAfterError; // If an error occurred during hydration,
      // discard server response and fall back to client side render.

      if (root.hydrate) {
        root.hydrate = false;
        clearContainer(root.containerInfo);
      } // If something threw an error, try rendering one more time. We'll render
      // synchronously to block concurrent data mutations, and we'll includes
      // all pending updates are included. If it still fails after the second
      // attempt, we'll give up and commit the resulting tree.


      lanes = getLanesToRetrySynchronouslyOnError(root);

      if (lanes !== NoLanes) {
        exitStatus = renderRootSync(root, lanes);
      }
    }

    if (exitStatus === RootFatalErrored) {
      var fatalError = workInProgressRootFatalError;
      prepareFreshStack(root, NoLanes);
      markRootSuspended$1(root, lanes);
      ensureRootIsScheduled(root, now());
      throw fatalError;
    } // We now have a consistent tree. Because this is a sync render, we
    // will commit it even if something suspended.


    var finishedWork = root.current.alternate;
    root.finishedWork = finishedWork;
    root.finishedLanes = lanes;
    commitRoot(root); // Before exiting, make sure there's a callback scheduled for the next
    // pending level.

    ensureRootIsScheduled(root, now());
    return null;
  }

  function flushRoot(root, lanes) {
    markRootExpired(root, lanes);
    ensureRootIsScheduled(root, now());

    if ((executionContext & (RenderContext | CommitContext)) === NoContext) {
      resetRenderTimer();
      flushSyncCallbackQueue();
    }
  }
  function getExecutionContext() {
    return executionContext;
  }
  function flushDiscreteUpdates() {
    // TODO: Should be able to flush inside batchedUpdates, but not inside `act`.
    // However, `act` uses `batchedUpdates`, so there's no way to distinguish
    // those two cases. Need to fix this before exposing flushDiscreteUpdates
    // as a public API.
    if ((executionContext & (BatchedContext | RenderContext | CommitContext)) !== NoContext) {
      {
        if ((executionContext & RenderContext) !== NoContext) {
          error('unstable_flushDiscreteUpdates: Cannot flush updates when React is ' + 'already rendering.');
        }
      } // We're already rendering, so we can't synchronously flush pending work.
      // This is probably a nested event dispatch triggered by a lifecycle/effect,
      // like `el.focus()`. Exit.


      return;
    }

    flushPendingDiscreteUpdates(); // If the discrete updates scheduled passive effects, flush them now so that
    // they fire before the next serial event.

    flushPassiveEffects();
  }

  function flushPendingDiscreteUpdates() {
    if (rootsWithPendingDiscreteUpdates !== null) {
      // For each root with pending discrete updates, schedule a callback to
      // immediately flush them.
      var roots = rootsWithPendingDiscreteUpdates;
      rootsWithPendingDiscreteUpdates = null;
      roots.forEach(function (root) {
        markDiscreteUpdatesExpired(root);
        ensureRootIsScheduled(root, now());
      });
    } // Now flush the immediate queue.


    flushSyncCallbackQueue();
  }

  function batchedUpdates$1(fn, a) {
    var prevExecutionContext = executionContext;
    executionContext |= BatchedContext;

    try {
      return fn(a);
    } finally {
      executionContext = prevExecutionContext;

      if (executionContext === NoContext) {
        // Flush the immediate callbacks that were scheduled during this batch
        resetRenderTimer();
        flushSyncCallbackQueue();
      }
    }
  }
  function batchedEventUpdates$1(fn, a) {
    var prevExecutionContext = executionContext;
    executionContext |= EventContext;

    try {
      return fn(a);
    } finally {
      executionContext = prevExecutionContext;

      if (executionContext === NoContext) {
        // Flush the immediate callbacks that were scheduled during this batch
        resetRenderTimer();
        flushSyncCallbackQueue();
      }
    }
  }
  function discreteUpdates$1(fn, a, b, c, d) {
    var prevExecutionContext = executionContext;
    executionContext |= DiscreteEventContext;

    {
      try {
        return runWithPriority$1(UserBlockingPriority$2, fn.bind(null, a, b, c, d));
      } finally {
        executionContext = prevExecutionContext;

        if (executionContext === NoContext) {
          // Flush the immediate callbacks that were scheduled during this batch
          resetRenderTimer();
          flushSyncCallbackQueue();
        }
      }
    }
  }
  function unbatchedUpdates(fn, a) {
    var prevExecutionContext = executionContext;
    executionContext &= ~BatchedContext;
    executionContext |= LegacyUnbatchedContext;

    try {
      return fn(a);
    } finally {
      executionContext = prevExecutionContext;

      if (executionContext === NoContext) {
        // Flush the immediate callbacks that were scheduled during this batch
        resetRenderTimer();
        flushSyncCallbackQueue();
      }
    }
  }
  function flushSync(fn, a) {
    var prevExecutionContext = executionContext;

    if ((prevExecutionContext & (RenderContext | CommitContext)) !== NoContext) {
      {
        error('flushSync was called from inside a lifecycle method. React cannot ' + 'flush when React is already rendering. Consider moving this call to ' + 'a scheduler task or micro task.');
      }

      return fn(a);
    }

    executionContext |= BatchedContext;

    {
      try {
        if (fn) {
          return runWithPriority$1(ImmediatePriority$1, fn.bind(null, a));
        } else {
          return undefined;
        }
      } finally {
        executionContext = prevExecutionContext; // Flush the immediate callbacks that were scheduled during this batch.
        // Note that this will happen even if batchedUpdates is higher up
        // the stack.

        flushSyncCallbackQueue();
      }
    }
  }
  function flushControlled(fn) {
    var prevExecutionContext = executionContext;
    executionContext |= BatchedContext;

    {
      try {
        runWithPriority$1(ImmediatePriority$1, fn);
      } finally {
        executionContext = prevExecutionContext;

        if (executionContext === NoContext) {
          // Flush the immediate callbacks that were scheduled during this batch
          resetRenderTimer();
          flushSyncCallbackQueue();
        }
      }
    }
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
        unwindInterruptedWork(interruptedWork);
        interruptedWork = interruptedWork.return;
      }
    }

    workInProgressRoot = root;
    workInProgress = createWorkInProgress(root.current, null);
    workInProgressRootRenderLanes = subtreeRenderLanes = workInProgressRootIncludedLanes = lanes;
    workInProgressRootExitStatus = RootIncomplete;
    workInProgressRootFatalError = null;
    workInProgressRootSkippedLanes = NoLanes;
    workInProgressRootUpdatedLanes = NoLanes;
    workInProgressRootPingedLanes = NoLanes;

    {
      spawnedWorkDuringRender = null;
    }

    {
      ReactStrictModeWarnings.discardPendingWarnings();
    }
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

  function pushInteractions(root) {
    {
      var prevInteractions = __interactionsRef.current;
      __interactionsRef.current = root.memoizedInteractions;
      return prevInteractions;
    }
  }

  function popInteractions(prevInteractions) {
    {
      __interactionsRef.current = prevInteractions;
    }
  }

  function markCommitTimeOfFallback() {
    globalMostRecentFallbackTime = now();
  }
  function markSkippedUpdateLanes(lane) {
    workInProgressRootSkippedLanes = mergeLanes(lane, workInProgressRootSkippedLanes);
  }
  function renderDidSuspend() {
    if (workInProgressRootExitStatus === RootIncomplete) {
      workInProgressRootExitStatus = RootSuspended;
    }
  }
  function renderDidSuspendDelayIfPossible() {
    if (workInProgressRootExitStatus === RootIncomplete || workInProgressRootExitStatus === RootSuspended) {
      workInProgressRootExitStatus = RootSuspendedWithDelay;
    } // Check if there are updates that we skipped tree that might have unblocked
    // this render.


    if (workInProgressRoot !== null && (includesNonIdleWork(workInProgressRootSkippedLanes) || includesNonIdleWork(workInProgressRootUpdatedLanes))) {
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
  function renderDidError() {
    if (workInProgressRootExitStatus !== RootCompleted) {
      workInProgressRootExitStatus = RootErrored;
    }
  } // Called during render to determine if anything has suspended.
  // Returns false if we're not sure.

  function renderHasNotSuspendedYet() {
    // If something errored or completed, we can't really be sure,
    // so those are false.
    return workInProgressRootExitStatus === RootIncomplete;
  }

  function renderRootSync(root, lanes) {
    var prevExecutionContext = executionContext;
    executionContext |= RenderContext;
    var prevDispatcher = pushDispatcher(); // If the root or lanes have changed, throw out the existing stack
    // and prepare a fresh one. Otherwise we'll continue where we left off.

    if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
      prepareFreshStack(root, lanes);
      startWorkOnPendingInteractions(root, lanes);
    }

    var prevInteractions = pushInteractions(root);

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

    {
      popInteractions(prevInteractions);
    }

    executionContext = prevExecutionContext;
    popDispatcher(prevDispatcher);

    if (workInProgress !== null) {
      // This is a sync render, so we should have finished the whole tree.
      {
        {
          throw Error( "Cannot commit an incomplete root. This error is likely caused by a bug in React. Please file an issue." );
        }
      }
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
      resetRenderTimer();
      prepareFreshStack(root, lanes);
      startWorkOnPendingInteractions(root, lanes);
    }

    var prevInteractions = pushInteractions(root);

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

    {
      popInteractions(prevInteractions);
    }

    popDispatcher(prevDispatcher);
    executionContext = prevExecutionContext;


    if (workInProgress !== null) {
      // Still work remaining.
      {
        markRenderYielded();
      }

      return RootIncomplete;
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

        resetChildLanes(completedWork);

        if (returnFiber !== null && // Do not append effects to parents if a sibling failed to complete
        (returnFiber.flags & Incomplete) === NoFlags) {
          // Append all the effects of the subtree and this fiber onto the effect
          // list of the parent. The completion order of the children affects the
          // side-effect order.
          if (returnFiber.firstEffect === null) {
            returnFiber.firstEffect = completedWork.firstEffect;
          }

          if (completedWork.lastEffect !== null) {
            if (returnFiber.lastEffect !== null) {
              returnFiber.lastEffect.nextEffect = completedWork.firstEffect;
            }

            returnFiber.lastEffect = completedWork.lastEffect;
          } // If this fiber had side-effects, we append it AFTER the children's
          // side-effects. We can perform certain side-effects earlier if needed,
          // by doing multiple passes over the effect list. We don't want to
          // schedule our own side-effect on our own list because if end up
          // reusing children we'll schedule this effect onto itself since we're
          // at the end.


          var flags = completedWork.flags; // Skip both NoWork and PerformedWork tags when creating the effect
          // list. PerformedWork effect is read by React DevTools but shouldn't be
          // committed.

          if (flags > PerformedWork) {
            if (returnFiber.lastEffect !== null) {
              returnFiber.lastEffect.nextEffect = completedWork;
            } else {
              returnFiber.firstEffect = completedWork;
            }

            returnFiber.lastEffect = completedWork;
          }
        }
      } else {
        // This fiber did not complete because something threw. Pop values off
        // the stack without entering the complete phase. If this is a boundary,
        // capture values if possible.
        var _next = unwindWork(completedWork); // Because this fiber did not complete, don't reset its expiration time.


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
          // Mark the parent fiber as incomplete and clear its effect list.
          returnFiber.firstEffect = returnFiber.lastEffect = null;
          returnFiber.flags |= Incomplete;
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


    if (workInProgressRootExitStatus === RootIncomplete) {
      workInProgressRootExitStatus = RootCompleted;
    }
  }

  function resetChildLanes(completedWork) {
    if ( // TODO: Move this check out of the hot path by moving `resetChildLanes`
    // to switch statement in `completeWork`.
    (completedWork.tag === LegacyHiddenComponent || completedWork.tag === OffscreenComponent) && completedWork.memoizedState !== null && !includesSomeLane(subtreeRenderLanes, OffscreenLane) && (completedWork.mode & ConcurrentMode) !== NoLanes) {
      // The children of this component are hidden. Don't bubble their
      // expiration times.
      return;
    }

    var newChildLanes = NoLanes; // Bubble up the earliest expiration time.

    if ( (completedWork.mode & ProfileMode) !== NoMode) {
      // In profiling mode, resetChildExpirationTime is also used to reset
      // profiler durations.
      var actualDuration = completedWork.actualDuration;
      var treeBaseDuration = completedWork.selfBaseDuration; // When a fiber is cloned, its actualDuration is reset to 0. This value will
      // only be updated if work is done on the fiber (i.e. it doesn't bailout).
      // When work is done, it should bubble to the parent's actualDuration. If
      // the fiber has not been cloned though, (meaning no work was done), then
      // this value will reflect the amount of time spent working on a previous
      // render. In that case it should not bubble. We determine whether it was
      // cloned by comparing the child pointer.

      var shouldBubbleActualDurations = completedWork.alternate === null || completedWork.child !== completedWork.alternate.child;
      var child = completedWork.child;

      while (child !== null) {
        newChildLanes = mergeLanes(newChildLanes, mergeLanes(child.lanes, child.childLanes));

        if (shouldBubbleActualDurations) {
          actualDuration += child.actualDuration;
        }

        treeBaseDuration += child.treeBaseDuration;
        child = child.sibling;
      }

      var isTimedOutSuspense = completedWork.tag === SuspenseComponent && completedWork.memoizedState !== null;

      if (isTimedOutSuspense) {
        // Don't count time spent in a timed out Suspense subtree as part of the base duration.
        var primaryChildFragment = completedWork.child;

        if (primaryChildFragment !== null) {
          treeBaseDuration -= primaryChildFragment.treeBaseDuration;
        }
      }

      completedWork.actualDuration = actualDuration;
      completedWork.treeBaseDuration = treeBaseDuration;
    } else {
      var _child = completedWork.child;

      while (_child !== null) {
        newChildLanes = mergeLanes(newChildLanes, mergeLanes(_child.lanes, _child.childLanes));
        _child = _child.sibling;
      }
    }

    completedWork.childLanes = newChildLanes;
  }

  function commitRoot(root) {
    var renderPriorityLevel = getCurrentPriorityLevel();
    runWithPriority$1(ImmediatePriority$1, commitRootImpl.bind(null, root, renderPriorityLevel));
    return null;
  }

  function commitRootImpl(root, renderPriorityLevel) {
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

    if (!((executionContext & (RenderContext | CommitContext)) === NoContext)) {
      {
        throw Error( "Should not already be working." );
      }
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
    }

    root.finishedWork = null;
    root.finishedLanes = NoLanes;

    if (!(finishedWork !== root.current)) {
      {
        throw Error( "Cannot commit the same tree as before. This error is likely caused by a bug in React. Please file an issue." );
      }
    } // commitRoot never returns a continuation; it always finishes synchronously.
    // So we can clear these now to allow a new callback to be scheduled.


    root.callbackNode = null; // Update the first and last pending times on this root. The new first
    // pending time is whatever is left on the root fiber.

    var remainingLanes = mergeLanes(finishedWork.lanes, finishedWork.childLanes);
    markRootFinished(root, remainingLanes); // Clear already finished discrete updates in case that a later call of
    // `flushDiscreteUpdates` starts a useless render pass which may cancels
    // a scheduled timeout.

    if (rootsWithPendingDiscreteUpdates !== null) {
      if (!hasDiscreteLanes(remainingLanes) && rootsWithPendingDiscreteUpdates.has(root)) {
        rootsWithPendingDiscreteUpdates.delete(root);
      }
    }

    if (root === workInProgressRoot) {
      // We can reset these now that they are finished.
      workInProgressRoot = null;
      workInProgress = null;
      workInProgressRootRenderLanes = NoLanes;
    } // Get the list of effects.


    var firstEffect;

    if (finishedWork.flags > PerformedWork) {
      // A fiber's effect list consists only of its children, not itself. So if
      // the root has an effect, we need to add it to the end of the list. The
      // resulting list is the set that would belong to the root's parent, if it
      // had one; that is, all the effects in the tree including the root.
      if (finishedWork.lastEffect !== null) {
        finishedWork.lastEffect.nextEffect = finishedWork;
        firstEffect = finishedWork.firstEffect;
      } else {
        firstEffect = finishedWork;
      }
    } else {
      // There is no effect on the root.
      firstEffect = finishedWork.firstEffect;
    }

    if (firstEffect !== null) {

      var prevExecutionContext = executionContext;
      executionContext |= CommitContext;
      var prevInteractions = pushInteractions(root); // Reset this to null before calling lifecycles

      ReactCurrentOwner$2.current = null; // The commit phase is broken into several sub-phases. We do a separate pass
      // of the effect list for each phase: all mutation effects come before all
      // layout effects, and so on.
      // The first phase a "before mutation" phase. We use this phase to read the
      // state of the host tree right before we mutate it. This is where
      // getSnapshotBeforeUpdate is called.

      focusedInstanceHandle = prepareForCommit(root.containerInfo);
      shouldFireAfterActiveInstanceBlur = false;
      nextEffect = firstEffect;

      do {
        {
          invokeGuardedCallback(null, commitBeforeMutationEffects, null);

          if (hasCaughtError()) {
            if (!(nextEffect !== null)) {
              {
                throw Error( "Should be working on an effect." );
              }
            }

            var error = clearCaughtError();
            captureCommitPhaseError(nextEffect, error);
            nextEffect = nextEffect.nextEffect;
          }
        }
      } while (nextEffect !== null); // We no longer need to track the active instance fiber


      focusedInstanceHandle = null;

      {
        // Mark the current commit time to be shared by all Profilers in this
        // batch. This enables them to be grouped later.
        recordCommitTime();
      } // The next phase is the mutation phase, where we mutate the host tree.


      nextEffect = firstEffect;

      do {
        {
          invokeGuardedCallback(null, commitMutationEffects, null, root, renderPriorityLevel);

          if (hasCaughtError()) {
            if (!(nextEffect !== null)) {
              {
                throw Error( "Should be working on an effect." );
              }
            }

            var _error = clearCaughtError();

            captureCommitPhaseError(nextEffect, _error);
            nextEffect = nextEffect.nextEffect;
          }
        }
      } while (nextEffect !== null);

      resetAfterCommit(root.containerInfo); // The work-in-progress tree is now the current tree. This must come after
      // the mutation phase, so that the previous tree is still current during
      // componentWillUnmount, but before the layout phase, so that the finished
      // work is current during componentDidMount/Update.

      root.current = finishedWork; // The next phase is the layout phase, where we call effects that read
      // the host tree after it's been mutated. The idiomatic use case for this is
      // layout, but class component lifecycles also fire here for legacy reasons.

      nextEffect = firstEffect;

      do {
        {
          invokeGuardedCallback(null, commitLayoutEffects, null, root, lanes);

          if (hasCaughtError()) {
            if (!(nextEffect !== null)) {
              {
                throw Error( "Should be working on an effect." );
              }
            }

            var _error2 = clearCaughtError();

            captureCommitPhaseError(nextEffect, _error2);
            nextEffect = nextEffect.nextEffect;
          }
        }
      } while (nextEffect !== null);

      nextEffect = null; // Tell Scheduler to yield at the end of the frame, so the browser has an
      // opportunity to paint.

      requestPaint();

      {
        popInteractions(prevInteractions);
      }

      executionContext = prevExecutionContext;
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
      pendingPassiveEffectsRenderPriority = renderPriorityLevel;
    } else {
      // We are done with the effect chain at this point so let's clear the
      // nextEffect pointers to assist with GC. If we have passive effects, we'll
      // clear this in flushPassiveEffects.
      nextEffect = firstEffect;

      while (nextEffect !== null) {
        var nextNextEffect = nextEffect.nextEffect;
        nextEffect.nextEffect = null;

        if (nextEffect.flags & Deletion) {
          detachFiberAfterEffects(nextEffect);
        }

        nextEffect = nextNextEffect;
      }
    } // Read this again, since an effect might have updated it


    remainingLanes = root.pendingLanes; // Check if there's remaining work on this root

    if (remainingLanes !== NoLanes) {
      {
        if (spawnedWorkDuringRender !== null) {
          var expirationTimes = spawnedWorkDuringRender;
          spawnedWorkDuringRender = null;

          for (var i = 0; i < expirationTimes.length; i++) {
            scheduleInteractions(root, expirationTimes[i], root.memoizedInteractions);
          }
        }

        schedulePendingInteractions(root, remainingLanes);
      }
    } else {
      // If there's no remaining work, we can clear the set of already failed
      // error boundaries.
      legacyErrorBoundariesThatAlreadyFailed = null;
    }

    {
      if (!rootDidHavePassiveEffects) {
        // If there are no passive effects, then we can complete the pending interactions.
        // Otherwise, we'll wait until after the passive effects are flushed.
        // Wait to do this until after remaining work has been scheduled,
        // so that we don't prematurely signal complete for interactions when there's e.g. hidden work.
        finishPendingInteractions(root, lanes);
      }
    }

    if (remainingLanes === SyncLane) {
      // Count the number of times the root synchronously re-renders without
      // finishing. If there are too many, it indicates an infinite update loop.
      if (root === rootWithNestedUpdates) {
        nestedUpdateCount++;
      } else {
        nestedUpdateCount = 0;
        rootWithNestedUpdates = root;
      }
    } else {
      nestedUpdateCount = 0;
    }

    onCommitRoot(finishedWork.stateNode, renderPriorityLevel);

    {
      onCommitRoot$1();
    } // Always call this before exiting `commitRoot`, to ensure that any
    // additional work on this root is scheduled.


    ensureRootIsScheduled(root, now());

    if (hasUncaughtError) {
      hasUncaughtError = false;
      var _error3 = firstUncaughtError;
      firstUncaughtError = null;
      throw _error3;
    }

    if ((executionContext & LegacyUnbatchedContext) !== NoContext) {

      {
        markCommitStopped();
      } // This is a legacy edge case. We just committed the initial mount of
      // a ReactDOM.render-ed root inside of batchedUpdates. The commit fired
      // synchronously, but layout updates should be deferred until the end
      // of the batch.


      return null;
    } // If layout work was scheduled, flush it now.


    flushSyncCallbackQueue();

    {
      markCommitStopped();
    }

    return null;
  }

  function commitBeforeMutationEffects() {
    while (nextEffect !== null) {
      var current = nextEffect.alternate;

      if (!shouldFireAfterActiveInstanceBlur && focusedInstanceHandle !== null) {
        if ((nextEffect.flags & Deletion) !== NoFlags) {
          if (doesFiberContain(nextEffect, focusedInstanceHandle)) {
            shouldFireAfterActiveInstanceBlur = true;
          }
        } else {
          // TODO: Move this out of the hot path using a dedicated effect tag.
          if (nextEffect.tag === SuspenseComponent && isSuspenseBoundaryBeingHidden(current, nextEffect) && doesFiberContain(nextEffect, focusedInstanceHandle)) {
            shouldFireAfterActiveInstanceBlur = true;
          }
        }
      }

      var flags = nextEffect.flags;

      if ((flags & Snapshot) !== NoFlags) {
        setCurrentFiber(nextEffect);
        commitBeforeMutationLifeCycles(current, nextEffect);
        resetCurrentFiber();
      }

      if ((flags & Passive) !== NoFlags) {
        // If there are passive effects, schedule a callback to flush at
        // the earliest opportunity.
        if (!rootDoesHavePassiveEffects) {
          rootDoesHavePassiveEffects = true;
          scheduleCallback(NormalPriority$1, function () {
            flushPassiveEffects();
            return null;
          });
        }
      }

      nextEffect = nextEffect.nextEffect;
    }
  }

  function commitMutationEffects(root, renderPriorityLevel) {
    // TODO: Should probably move the bulk of this function to commitWork.
    while (nextEffect !== null) {
      setCurrentFiber(nextEffect);
      var flags = nextEffect.flags;

      if (flags & ContentReset) {
        commitResetTextContent(nextEffect);
      }

      if (flags & Ref) {
        var current = nextEffect.alternate;

        if (current !== null) {
          commitDetachRef(current);
        }
      } // The following switch statement is only concerned about placement,
      // updates, and deletions. To avoid needing to add a case for every possible
      // bitmap value, we remove the secondary effects from the effect tag and
      // switch on that value.


      var primaryFlags = flags & (Placement | Update | Deletion | Hydrating);

      switch (primaryFlags) {
        case Placement:
          {
            commitPlacement(nextEffect); // Clear the "placement" from effect tag so that we know that this is
            // inserted, before any life-cycles like componentDidMount gets called.
            // TODO: findDOMNode doesn't rely on this any more but isMounted does
            // and isMounted is deprecated anyway so we should be able to kill this.

            nextEffect.flags &= ~Placement;
            break;
          }

        case PlacementAndUpdate:
          {
            // Placement
            commitPlacement(nextEffect); // Clear the "placement" from effect tag so that we know that this is
            // inserted, before any life-cycles like componentDidMount gets called.

            nextEffect.flags &= ~Placement; // Update

            var _current = nextEffect.alternate;
            commitWork(_current, nextEffect);
            break;
          }

        case Hydrating:
          {
            nextEffect.flags &= ~Hydrating;
            break;
          }

        case HydratingAndUpdate:
          {
            nextEffect.flags &= ~Hydrating; // Update

            var _current2 = nextEffect.alternate;
            commitWork(_current2, nextEffect);
            break;
          }

        case Update:
          {
            var _current3 = nextEffect.alternate;
            commitWork(_current3, nextEffect);
            break;
          }

        case Deletion:
          {
            commitDeletion(root, nextEffect);
            break;
          }
      }

      resetCurrentFiber();
      nextEffect = nextEffect.nextEffect;
    }
  }

  function commitLayoutEffects(root, committedLanes) {

    {
      markLayoutEffectsStarted(committedLanes);
    } // TODO: Should probably move the bulk of this function to commitWork.


    while (nextEffect !== null) {
      setCurrentFiber(nextEffect);
      var flags = nextEffect.flags;

      if (flags & (Update | Callback)) {
        var current = nextEffect.alternate;
        commitLifeCycles(root, current, nextEffect);
      }

      {
        if (flags & Ref) {
          commitAttachRef(nextEffect);
        }
      }

      resetCurrentFiber();
      nextEffect = nextEffect.nextEffect;
    }

    {
      markLayoutEffectsStopped();
    }
  }

  function flushPassiveEffects() {
    // Returns whether passive effects were flushed.
    if (pendingPassiveEffectsRenderPriority !== NoPriority$1) {
      var priorityLevel = pendingPassiveEffectsRenderPriority > NormalPriority$1 ? NormalPriority$1 : pendingPassiveEffectsRenderPriority;
      pendingPassiveEffectsRenderPriority = NoPriority$1;

      {
        return runWithPriority$1(priorityLevel, flushPassiveEffectsImpl);
      }
    }

    return false;
  }
  function enqueuePendingPassiveHookEffectMount(fiber, effect) {
    pendingPassiveHookEffectsMount.push(effect, fiber);

    if (!rootDoesHavePassiveEffects) {
      rootDoesHavePassiveEffects = true;
      scheduleCallback(NormalPriority$1, function () {
        flushPassiveEffects();
        return null;
      });
    }
  }
  function enqueuePendingPassiveHookEffectUnmount(fiber, effect) {
    pendingPassiveHookEffectsUnmount.push(effect, fiber);

    {
      fiber.flags |= PassiveUnmountPendingDev;
      var alternate = fiber.alternate;

      if (alternate !== null) {
        alternate.flags |= PassiveUnmountPendingDev;
      }
    }

    if (!rootDoesHavePassiveEffects) {
      rootDoesHavePassiveEffects = true;
      scheduleCallback(NormalPriority$1, function () {
        flushPassiveEffects();
        return null;
      });
    }
  }

  function invokePassiveEffectCreate(effect) {
    var create = effect.create;
    effect.destroy = create();
  }

  function flushPassiveEffectsImpl() {
    if (rootWithPendingPassiveEffects === null) {
      return false;
    }

    var root = rootWithPendingPassiveEffects;
    var lanes = pendingPassiveEffectsLanes;
    rootWithPendingPassiveEffects = null;
    pendingPassiveEffectsLanes = NoLanes;

    if (!((executionContext & (RenderContext | CommitContext)) === NoContext)) {
      {
        throw Error( "Cannot flush passive effects while already rendering." );
      }
    }

    {
      markPassiveEffectsStarted(lanes);
    }

    {
      isFlushingPassiveEffects = true;
    }

    var prevExecutionContext = executionContext;
    executionContext |= CommitContext;
    var prevInteractions = pushInteractions(root); // It's important that ALL pending passive effect destroy functions are called
    // before ANY passive effect create functions are called.
    // Otherwise effects in sibling components might interfere with each other.
    // e.g. a destroy function in one component may unintentionally override a ref
    // value set by a create function in another component.
    // Layout effects have the same constraint.
    // First pass: Destroy stale passive effects.

    var unmountEffects = pendingPassiveHookEffectsUnmount;
    pendingPassiveHookEffectsUnmount = [];

    for (var i = 0; i < unmountEffects.length; i += 2) {
      var _effect = unmountEffects[i];
      var fiber = unmountEffects[i + 1];
      var destroy = _effect.destroy;
      _effect.destroy = undefined;

      {
        fiber.flags &= ~PassiveUnmountPendingDev;
        var alternate = fiber.alternate;

        if (alternate !== null) {
          alternate.flags &= ~PassiveUnmountPendingDev;
        }
      }

      if (typeof destroy === 'function') {
        {
          setCurrentFiber(fiber);

          {
            invokeGuardedCallback(null, destroy, null);
          }

          if (hasCaughtError()) {
            if (!(fiber !== null)) {
              {
                throw Error( "Should be working on an effect." );
              }
            }

            var error = clearCaughtError();
            captureCommitPhaseError(fiber, error);
          }

          resetCurrentFiber();
        }
      }
    } // Second pass: Create new passive effects.


    var mountEffects = pendingPassiveHookEffectsMount;
    pendingPassiveHookEffectsMount = [];

    for (var _i = 0; _i < mountEffects.length; _i += 2) {
      var _effect2 = mountEffects[_i];
      var _fiber = mountEffects[_i + 1];

      {
        setCurrentFiber(_fiber);

        {
          invokeGuardedCallback(null, invokePassiveEffectCreate, null, _effect2);
        }

        if (hasCaughtError()) {
          if (!(_fiber !== null)) {
            {
              throw Error( "Should be working on an effect." );
            }
          }

          var _error4 = clearCaughtError();

          captureCommitPhaseError(_fiber, _error4);
        }

        resetCurrentFiber();
      }
    } // Note: This currently assumes there are no passive effects on the root fiber
    // because the root is not part of its own effect list.
    // This could change in the future.


    var effect = root.current.firstEffect;

    while (effect !== null) {
      var nextNextEffect = effect.nextEffect; // Remove nextEffect pointer to assist GC

      effect.nextEffect = null;

      if (effect.flags & Deletion) {
        detachFiberAfterEffects(effect);
      }

      effect = nextNextEffect;
    }

    {
      popInteractions(prevInteractions);
      finishPendingInteractions(root, lanes);
    }

    {
      isFlushingPassiveEffects = false;
    }

    {
      markPassiveEffectsStopped();
    }

    executionContext = prevExecutionContext;
    flushSyncCallbackQueue(); // If additional passive effects were scheduled, increment a counter. If this
    // exceeds the limit, we'll fire a warning.

    nestedPassiveUpdateCount = rootWithPendingPassiveEffects === null ? 0 : nestedPassiveUpdateCount + 1;
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
      schedulePendingInteractions(root, SyncLane);
    }
  }

  function captureCommitPhaseError(sourceFiber, error) {
    if (sourceFiber.tag === HostRoot) {
      // Error was thrown at the root. There is no parent, so the root
      // itself should capture it.
      captureCommitPhaseErrorOnRoot(sourceFiber, sourceFiber, error);
      return;
    }

    var fiber = sourceFiber.return;

    while (fiber !== null) {
      if (fiber.tag === HostRoot) {
        captureCommitPhaseErrorOnRoot(fiber, sourceFiber, error);
        return;
      } else if (fiber.tag === ClassComponent) {
        var ctor = fiber.type;
        var instance = fiber.stateNode;

        if (typeof ctor.getDerivedStateFromError === 'function' || typeof instance.componentDidCatch === 'function' && !isAlreadyFailedLegacyErrorBoundary(instance)) {
          var errorInfo = createCapturedValue(error, sourceFiber);
          var update = createClassErrorUpdate(fiber, errorInfo, SyncLane);
          enqueueUpdate(fiber, update);
          var eventTime = requestEventTime();
          var root = markUpdateLaneFromFiberToRoot(fiber, SyncLane);

          if (root !== null) {
            markRootUpdated(root, SyncLane, eventTime);
            ensureRootIsScheduled(root, eventTime);
            schedulePendingInteractions(root, SyncLane);
          } else {
            // This component has already been unmounted.
            // We can't schedule any follow up work for the root because the fiber is already unmounted,
            // but we can still call the log-only boundary so the error isn't swallowed.
            //
            // TODO This is only a temporary bandaid for the old reconciler fork.
            // We can delete this special case once the new fork is merged.
            if (typeof instance.componentDidCatch === 'function' && !isAlreadyFailedLegacyErrorBoundary(instance)) {
              try {
                instance.componentDidCatch(error, errorInfo);
              } catch (errorToIgnore) {// TODO Ignore this error? Rethrow it?
                // This is kind of an edge case.
              }
            }
          }

          return;
        }
      }

      fiber = fiber.return;
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
    schedulePendingInteractions(root, pingedLanes);
  }

  function retryTimedOutBoundary(boundaryFiber, retryLane) {
    // The boundary fiber (a Suspense component or SuspenseList component)
    // previously was rendered in its fallback state. One of the promises that
    // suspended it has resolved, which means at least part of the tree was
    // likely unblocked. Try rendering again, at a new expiration time.
    if (retryLane === NoLane) {
      retryLane = requestRetryLane(boundaryFiber);
    } // TODO: Special case idle priority?


    var eventTime = requestEventTime();
    var root = markUpdateLaneFromFiberToRoot(boundaryFiber, retryLane);

    if (root !== null) {
      markRootUpdated(root, retryLane, eventTime);
      ensureRootIsScheduled(root, eventTime);
      schedulePendingInteractions(root, retryLane);
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

    {
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
          {
            {
              throw Error( "Pinged unknown suspense boundary type. This is probably a bug in React." );
            }
          }

      }
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

      {
        {
          throw Error( "Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops." );
        }
      }
    }

    {
      if (nestedPassiveUpdateCount > NESTED_PASSIVE_UPDATE_LIMIT) {
        nestedPassiveUpdateCount = 0;

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

  var didWarnStateUpdateForNotYetMountedComponent = null;

  function warnAboutUpdateOnNotYetMountedFiberInDEV(fiber) {
    {
      if ((executionContext & RenderContext) !== NoContext) {
        // We let the other warning about render phase updates deal with this one.
        return;
      }

      if (!(fiber.mode & (BlockingMode | ConcurrentMode))) {
        return;
      }

      var tag = fiber.tag;

      if (tag !== IndeterminateComponent && tag !== HostRoot && tag !== ClassComponent && tag !== FunctionComponent && tag !== ForwardRef && tag !== MemoComponent && tag !== SimpleMemoComponent && tag !== Block) {
        // Only warn for user-defined components, not internal ones like Suspense.
        return;
      } // We show the whole stack but dedupe on the top component's name because
      // the problematic code almost always lies inside that component.


      var componentName = getComponentName(fiber.type) || 'ReactComponent';

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

  var didWarnStateUpdateForUnmountedComponent = null;

  function warnAboutUpdateOnUnmountedFiberInDEV(fiber) {
    {
      var tag = fiber.tag;

      if (tag !== HostRoot && tag !== ClassComponent && tag !== FunctionComponent && tag !== ForwardRef && tag !== MemoComponent && tag !== SimpleMemoComponent && tag !== Block) {
        // Only warn for user-defined components, not internal ones like Suspense.
        return;
      } // If there are pending passive effects unmounts for this Fiber,
      // we can assume that they would have prevented this update.


      if ((fiber.flags & PassiveUnmountPendingDev) !== NoFlags) {
        return;
      } // We show the whole stack but dedupe on the top component's name because
      // the problematic code almost always lies inside that component.


      var componentName = getComponentName(fiber.type) || 'ReactComponent';

      if (didWarnStateUpdateForUnmountedComponent !== null) {
        if (didWarnStateUpdateForUnmountedComponent.has(componentName)) {
          return;
        }

        didWarnStateUpdateForUnmountedComponent.add(componentName);
      } else {
        didWarnStateUpdateForUnmountedComponent = new Set([componentName]);
      }

      if (isFlushingPassiveEffects) ; else {
        var previousFiber = current;

        try {
          setCurrentFiber(fiber);

          error("Can't perform a React state update on an unmounted component. This " + 'is a no-op, but it indicates a memory leak in your application. To ' + 'fix, cancel all subscriptions and asynchronous tasks in %s.', tag === ClassComponent ? 'the componentWillUnmount method' : 'a useEffect cleanup function');
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

        unwindInterruptedWork(unitOfWork); // Restore the original properties of the fiber.

        assignFiberPropertiesInDEV(unitOfWork, originalWorkInProgressCopy);

        if ( unitOfWork.mode & ProfileMode) {
          // Reset the profiler timer.
          startProfilerTimer(unitOfWork);
        } // Run beginWork again.


        invokeGuardedCallback(null, beginWork, null, current, unitOfWork, lanes);

        if (hasCaughtError()) {
          var replayError = clearCaughtError(); // `invokeGuardedCallback` sometimes sets an expando `_suppressLogging`.
          // Rethrow this error instead of the original one.

          throw replayError;
        } else {
          // This branch is reachable if the render phase is impure.
          throw originalError;
        }
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
      if (isRendering && (executionContext & RenderContext) !== NoContext && !getIsUpdatingOpaqueValueInRenderPhaseInDEV()) {
        switch (fiber.tag) {
          case FunctionComponent:
          case ForwardRef:
          case SimpleMemoComponent:
            {
              var renderingComponentName = workInProgress && getComponentName(workInProgress.type) || 'Unknown'; // Dedupe by the rendering component because it's the one that needs to be fixed.

              var dedupeKey = renderingComponentName;

              if (!didWarnAboutUpdateInRenderForAnotherComponent.has(dedupeKey)) {
                didWarnAboutUpdateInRenderForAnotherComponent.add(dedupeKey);
                var setStateComponentName = getComponentName(fiber.type) || 'Unknown';

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
  } // a 'shared' variable that changes when act() opens/closes in tests.


  var IsThisRendererActing = {
    current: false
  };
  function warnIfNotScopedWithMatchingAct(fiber) {
    {
      if ( IsSomeRendererActing.current === true && IsThisRendererActing.current !== true) {
        var previousFiber = current;

        try {
          setCurrentFiber(fiber);

          error("It looks like you're using the wrong act() around your test interactions.\n" + 'Be sure to use the matching version of act() corresponding to your renderer:\n\n' + '// for react-dom:\n' + // Break up imports to avoid accidentally parsing them as dependencies.
          'import {act} fr' + "om 'react-dom/test-utils';\n" + '// ...\n' + 'act(() => ...);\n\n' + '// for react-test-renderer:\n' + // Break up imports to avoid accidentally parsing them as dependencies.
          'import TestRenderer fr' + "om react-test-renderer';\n" + 'const {act} = TestRenderer;\n' + '// ...\n' + 'act(() => ...);');
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
  function warnIfNotCurrentlyActingEffectsInDEV(fiber) {
    {
      if ( (fiber.mode & StrictMode) !== NoMode && IsSomeRendererActing.current === false && IsThisRendererActing.current === false) {
        error('An update to %s ran an effect, but was not wrapped in act(...).\n\n' + 'When testing, code that causes React state updates should be ' + 'wrapped into act(...):\n\n' + 'act(() => {\n' + '  /* fire events that update state */\n' + '});\n' + '/* assert on the output */\n\n' + "This ensures that you're testing the behavior the user would see " + 'in the browser.' + ' Learn more at https://reactjs.org/link/wrap-tests-with-act', getComponentName(fiber.type));
      }
    }
  }

  function warnIfNotCurrentlyActingUpdatesInDEV(fiber) {
    {
      if ( executionContext === NoContext && IsSomeRendererActing.current === false && IsThisRendererActing.current === false) {
        var previousFiber = current;

        try {
          setCurrentFiber(fiber);

          error('An update to %s inside a test was not wrapped in act(...).\n\n' + 'When testing, code that causes React state updates should be ' + 'wrapped into act(...):\n\n' + 'act(() => {\n' + '  /* fire events that update state */\n' + '});\n' + '/* assert on the output */\n\n' + "This ensures that you're testing the behavior the user would see " + 'in the browser.' + ' Learn more at https://reactjs.org/link/wrap-tests-with-act', getComponentName(fiber.type));
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

  var warnIfNotCurrentlyActingUpdatesInDev = warnIfNotCurrentlyActingUpdatesInDEV; // In tests, we want to enforce a mocked scheduler.

  var didWarnAboutUnmockedScheduler = false; // TODO Before we release concurrent mode, revisit this and decide whether a mocked
  // scheduler is the actual recommendation. The alternative could be a testing build,
  // a new lib, or whatever; we dunno just yet. This message is for early adopters
  // to get their tests right.

  function warnIfUnmockedScheduler(fiber) {
    {
      if (didWarnAboutUnmockedScheduler === false && unstable_flushAllWithoutAsserting === undefined) {
        if (fiber.mode & BlockingMode || fiber.mode & ConcurrentMode) {
          didWarnAboutUnmockedScheduler = true;

          error('In Concurrent or Sync modes, the "scheduler" module needs to be mocked ' + 'to guarantee consistent behaviour across tests and browsers. ' + 'For example, with jest: \n' + // Break up requires to avoid accidentally parsing them as dependencies.
          "jest.mock('scheduler', () => require" + "('scheduler/unstable_mock'));\n\n" + 'For more info, visit https://reactjs.org/link/mock-scheduler');
        }
      }
    }
  }

  function computeThreadID(root, lane) {
    // Interaction threads are unique per root and expiration time.
    // NOTE: Intentionally unsound cast. All that matters is that it's a number
    // and it represents a batch of work. Could make a helper function instead,
    // but meh this is fine for now.
    return lane * 1000 + root.interactionThreadID;
  }

  function markSpawnedWork(lane) {

    if (spawnedWorkDuringRender === null) {
      spawnedWorkDuringRender = [lane];
    } else {
      spawnedWorkDuringRender.push(lane);
    }
  }

  function scheduleInteractions(root, lane, interactions) {

    if (interactions.size > 0) {
      var pendingInteractionMap = root.pendingInteractionMap;
      var pendingInteractions = pendingInteractionMap.get(lane);

      if (pendingInteractions != null) {
        interactions.forEach(function (interaction) {
          if (!pendingInteractions.has(interaction)) {
            // Update the pending async work count for previously unscheduled interaction.
            interaction.__count++;
          }

          pendingInteractions.add(interaction);
        });
      } else {
        pendingInteractionMap.set(lane, new Set(interactions)); // Update the pending async work count for the current interactions.

        interactions.forEach(function (interaction) {
          interaction.__count++;
        });
      }

      var subscriber = __subscriberRef.current;

      if (subscriber !== null) {
        var threadID = computeThreadID(root, lane);
        subscriber.onWorkScheduled(interactions, threadID);
      }
    }
  }

  function schedulePendingInteractions(root, lane) {

    scheduleInteractions(root, lane, __interactionsRef.current);
  }

  function startWorkOnPendingInteractions(root, lanes) {
    // we can accurately attribute time spent working on it, And so that cascading
    // work triggered during the render phase will be associated with it.


    var interactions = new Set();
    root.pendingInteractionMap.forEach(function (scheduledInteractions, scheduledLane) {
      if (includesSomeLane(lanes, scheduledLane)) {
        scheduledInteractions.forEach(function (interaction) {
          return interactions.add(interaction);
        });
      }
    }); // Store the current set of interactions on the FiberRoot for a few reasons:
    // We can re-use it in hot functions like performConcurrentWorkOnRoot()
    // without having to recalculate it. We will also use it in commitWork() to
    // pass to any Profiler onRender() hooks. This also provides DevTools with a
    // way to access it when the onCommitRoot() hook is called.

    root.memoizedInteractions = interactions;

    if (interactions.size > 0) {
      var subscriber = __subscriberRef.current;

      if (subscriber !== null) {
        var threadID = computeThreadID(root, lanes);

        try {
          subscriber.onWorkStarted(interactions, threadID);
        } catch (error) {
          // If the subscriber throws, rethrow it in a separate task
          scheduleCallback(ImmediatePriority$1, function () {
            throw error;
          });
        }
      }
    }
  }

  function finishPendingInteractions(root, committedLanes) {

    var remainingLanesAfterCommit = root.pendingLanes;
    var subscriber;

    try {
      subscriber = __subscriberRef.current;

      if (subscriber !== null && root.memoizedInteractions.size > 0) {
        // FIXME: More than one lane can finish in a single commit.
        var threadID = computeThreadID(root, committedLanes);
        subscriber.onWorkStopped(root.memoizedInteractions, threadID);
      }
    } catch (error) {
      // If the subscriber throws, rethrow it in a separate task
      scheduleCallback(ImmediatePriority$1, function () {
        throw error;
      });
    } finally {
      // Clear completed interactions from the pending Map.
      // Unless the render was suspended or cascading work was scheduled,
      // In which case– leave pending interactions until the subsequent render.
      var pendingInteractionMap = root.pendingInteractionMap;
      pendingInteractionMap.forEach(function (scheduledInteractions, lane) {
        // Only decrement the pending interaction count if we're done.
        // If there's still work at the current priority,
        // That indicates that we are waiting for suspense data.
        if (!includesSomeLane(remainingLanesAfterCommit, lane)) {
          pendingInteractionMap.delete(lane);
          scheduledInteractions.forEach(function (interaction) {
            interaction.__count--;

            if (subscriber !== null && interaction.__count === 0) {
              try {
                subscriber.onInteractionScheduledWorkCompleted(interaction);
              } catch (error) {
                // If the subscriber throws, rethrow it in a separate task
                scheduleCallback(ImmediatePriority$1, function () {
                  throw error;
                });
              }
            }
          });
        }
      });
    }
  } // `act` testing API

  function shouldForceFlushFallbacksInDEV() {
    // Never force flush in production. This function should get stripped out.
    return  actingUpdatesScopeDepth > 0;
  }
  // so we can tell if any async act() calls try to run in parallel.


  var actingUpdatesScopeDepth = 0;

  function detachFiberAfterEffects(fiber) {
    fiber.sibling = null;
    fiber.stateNode = null;
  }