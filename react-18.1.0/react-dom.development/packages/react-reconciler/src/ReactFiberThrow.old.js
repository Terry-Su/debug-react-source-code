  var PossiblyWeakMap$1 = typeof WeakMap === 'function' ? WeakMap : Map;

  function createRootErrorUpdate(fiber, errorInfo, lane) {
    var update = createUpdate(NoTimestamp, lane); // Unmount the root by rendering null.

    update.tag = CaptureUpdate; // Caution: React DevTools currently depends on this property
    // being called "element".

    update.payload = {
      element: null
    };
    var error = errorInfo.value;

    update.callback = function () {
      onUncaughtError(error);
      logCapturedError(fiber, errorInfo);
    };

    return update;
  }

  function createClassErrorUpdate(fiber, errorInfo, lane) {
    var update = createUpdate(NoTimestamp, lane);
    update.tag = CaptureUpdate;
    var getDerivedStateFromError = fiber.type.getDerivedStateFromError;

    if (typeof getDerivedStateFromError === 'function') {
      var error$1 = errorInfo.value;

      update.payload = function () {
        return getDerivedStateFromError(error$1);
      };

      update.callback = function () {
        {
          markFailedErrorBoundaryForHotReloading(fiber);
        }

        logCapturedError(fiber, errorInfo);
      };
    }

    var inst = fiber.stateNode;

    if (inst !== null && typeof inst.componentDidCatch === 'function') {
      update.callback = function callback() {
        {
          markFailedErrorBoundaryForHotReloading(fiber);
        }

        logCapturedError(fiber, errorInfo);

        if (typeof getDerivedStateFromError !== 'function') {
          // To preserve the preexisting retry behavior of error boundaries,
          // we keep track of which ones already failed during this batch.
          // This gets reset before we yield back to the browser.
          // TODO: Warn in strict mode if getDerivedStateFromError is
          // not defined.
          markLegacyErrorBoundaryAsFailed(this);
        }

        var error$1 = errorInfo.value;
        var stack = errorInfo.stack;
        this.componentDidCatch(error$1, {
          componentStack: stack !== null ? stack : ''
        });

        {
          if (typeof getDerivedStateFromError !== 'function') {
            // If componentDidCatch is the only error boundary method defined,
            // then it needs to call setState to recover from errors.
            // If no state update is scheduled then the boundary will swallow the error.
            if (!includesSomeLane(fiber.lanes, SyncLane)) {
              error('%s: Error boundaries should implement getDerivedStateFromError(). ' + 'In that method, return a state update to display an error message or fallback UI.', getComponentNameFromFiber(fiber) || 'Unknown');
            }
          }
        }
      };
    }

    return update;
  }

  function attachPingListener(root, wakeable, lanes) {
    // Attach a ping listener
    //
    // The data might resolve before we have a chance to commit the fallback. Or,
    // in the case of a refresh, we'll never commit a fallback. So we need to
    // attach a listener now. When it resolves ("pings"), we can decide whether to
    // try rendering the tree again.
    //
    // Only attach a listener if one does not already exist for the lanes
    // we're currently rendering (which acts like a "thread ID" here).
    //
    // We only need to do this in concurrent mode. Legacy Suspense always
    // commits fallbacks synchronously, so there are no pings.
    var pingCache = root.pingCache;
    var threadIDs;

    if (pingCache === null) {
      pingCache = root.pingCache = new PossiblyWeakMap$1();
      threadIDs = new Set();
      pingCache.set(wakeable, threadIDs);
    } else {
      threadIDs = pingCache.get(wakeable);

      if (threadIDs === undefined) {
        threadIDs = new Set();
        pingCache.set(wakeable, threadIDs);
      }
    }

    if (!threadIDs.has(lanes)) {
      // Memoize using the thread ID to prevent redundant listeners.
      threadIDs.add(lanes);
      var ping = pingSuspendedRoot.bind(null, root, wakeable, lanes);

      {
        if (isDevToolsPresent) {
          // If we have pending work still, restore the original updaters
          restorePendingUpdaters(root, lanes);
        }
      }

      wakeable.then(ping, ping);
    }
  }

  function attachRetryListener(suspenseBoundary, root, wakeable, lanes) {
    // Retry listener
    //
    // If the fallback does commit, we need to attach a different type of
    // listener. This one schedules an update on the Suspense boundary to turn
    // the fallback state off.
    //
    // Stash the wakeable on the boundary fiber so we can access it in the
    // commit phase.
    //
    // When the wakeable resolves, we'll attempt to render the boundary
    // again ("retry").
    var wakeables = suspenseBoundary.updateQueue;

    if (wakeables === null) {
      var updateQueue = new Set();
      updateQueue.add(wakeable);
      suspenseBoundary.updateQueue = updateQueue;
    } else {
      wakeables.add(wakeable);
    }
  }

  function resetSuspendedComponent(sourceFiber, rootRenderLanes) {
    // A legacy mode Suspense quirk, only relevant to hook components.


    var tag = sourceFiber.tag;

    if ((sourceFiber.mode & ConcurrentMode) === NoMode && (tag === FunctionComponent || tag === ForwardRef || tag === SimpleMemoComponent)) {
      var currentSource = sourceFiber.alternate;

      if (currentSource) {
        sourceFiber.updateQueue = currentSource.updateQueue;
        sourceFiber.memoizedState = currentSource.memoizedState;
        sourceFiber.lanes = currentSource.lanes;
      } else {
        sourceFiber.updateQueue = null;
        sourceFiber.memoizedState = null;
      }
    }
  }

  function getNearestSuspenseBoundaryToCapture(returnFiber) {
    var node = returnFiber;

    do {
      if (node.tag === SuspenseComponent && shouldCaptureSuspense(node)) {
        return node;
      } // This boundary already captured during this render. Continue to the next
      // boundary.


      node = node.return;
    } while (node !== null);

    return null;
  }

  function markSuspenseBoundaryShouldCapture(suspenseBoundary, returnFiber, sourceFiber, root, rootRenderLanes) {
    // This marks a Suspense boundary so that when we're unwinding the stack,
    // it captures the suspended "exception" and does a second (fallback) pass.
    if ((suspenseBoundary.mode & ConcurrentMode) === NoMode) {
      // Legacy Mode Suspense
      //
      // If the boundary is in legacy mode, we should *not*
      // suspend the commit. Pretend as if the suspended component rendered
      // null and keep rendering. When the Suspense boundary completes,
      // we'll do a second pass to render the fallback.
      if (suspenseBoundary === returnFiber) {
        // Special case where we suspended while reconciling the children of
        // a Suspense boundary's inner Offscreen wrapper fiber. This happens
        // when a React.lazy component is a direct child of a
        // Suspense boundary.
        //
        // Suspense boundaries are implemented as multiple fibers, but they
        // are a single conceptual unit. The legacy mode behavior where we
        // pretend the suspended fiber committed as `null` won't work,
        // because in this case the "suspended" fiber is the inner
        // Offscreen wrapper.
        //
        // Because the contents of the boundary haven't started rendering
        // yet (i.e. nothing in the tree has partially rendered) we can
        // switch to the regular, concurrent mode behavior: mark the
        // boundary with ShouldCapture and enter the unwind phase.
        suspenseBoundary.flags |= ShouldCapture;
      } else {
        suspenseBoundary.flags |= DidCapture;
        sourceFiber.flags |= ForceUpdateForLegacySuspense; // We're going to commit this fiber even though it didn't complete.
        // But we shouldn't call any lifecycle methods or callbacks. Remove
        // all lifecycle effect tags.

        sourceFiber.flags &= ~(LifecycleEffectMask | Incomplete);

        if (sourceFiber.tag === ClassComponent) {
          var currentSourceFiber = sourceFiber.alternate;

          if (currentSourceFiber === null) {
            // This is a new mount. Change the tag so it's not mistaken for a
            // completed class component. For example, we should not call
            // componentWillUnmount if it is deleted.
            sourceFiber.tag = IncompleteClassComponent;
          } else {
            // When we try rendering again, we should not reuse the current fiber,
            // since it's known to be in an inconsistent state. Use a force update to
            // prevent a bail out.
            var update = createUpdate(NoTimestamp, SyncLane);
            update.tag = ForceUpdate;
            enqueueUpdate(sourceFiber, update);
          }
        } // The source fiber did not complete. Mark it with Sync priority to
        // indicate that it still has pending work.


        sourceFiber.lanes = mergeLanes(sourceFiber.lanes, SyncLane);
      }

      return suspenseBoundary;
    } // Confirmed that the boundary is in a concurrent mode tree. Continue
    // with the normal suspend path.
    //
    // After this we'll use a set of heuristics to determine whether this
    // render pass will run to completion or restart or "suspend" the commit.
    // The actual logic for this is spread out in different places.
    //
    // This first principle is that if we're going to suspend when we complete
    // a root, then we should also restart if we get an update or ping that
    // might unsuspend it, and vice versa. The only reason to suspend is
    // because you think you might want to restart before committing. However,
    // it doesn't make sense to restart only while in the period we're suspended.
    //
    // Restarting too aggressively is also not good because it starves out any
    // intermediate loading state. So we use heuristics to determine when.
    // Suspense Heuristics
    //
    // If nothing threw a Promise or all the same fallbacks are already showing,
    // then don't suspend/restart.
    //
    // If this is an initial render of a new tree of Suspense boundaries and
    // those trigger a fallback, then don't suspend/restart. We want to ensure
    // that we can show the initial loading state as quickly as possible.
    //
    // If we hit a "Delayed" case, such as when we'd switch from content back into
    // a fallback, then we should always suspend/restart. Transitions apply
    // to this case. If none is defined, JND is used instead.
    //
    // If we're already showing a fallback and it gets "retried", allowing us to show
    // another level, but there's still an inner boundary that would show a fallback,
    // then we suspend/restart for 500ms since the last time we showed a fallback
    // anywhere in the tree. This effectively throttles progressive loading into a
    // consistent train of commits. This also gives us an opportunity to restart to
    // get to the completed state slightly earlier.
    //
    // If there's ambiguity due to batching it's resolved in preference of:
    // 1) "delayed", 2) "initial render", 3) "retry".
    //
    // We want to ensure that a "busy" state doesn't get force committed. We want to
    // ensure that new initial loading states can commit as soon as possible.


    suspenseBoundary.flags |= ShouldCapture; // TODO: I think we can remove this, since we now use `DidCapture` in
    // the begin phase to prevent an early bailout.

    suspenseBoundary.lanes = rootRenderLanes;
    return suspenseBoundary;
  }

  function throwException(root, returnFiber, sourceFiber, value, rootRenderLanes) {
    // The source fiber did not complete.
    sourceFiber.flags |= Incomplete;

    {
      if (isDevToolsPresent) {
        // If we have pending work still, restore the original updaters
        restorePendingUpdaters(root, rootRenderLanes);
      }
    }

    if (value !== null && typeof value === 'object' && typeof value.then === 'function') {
      // This is a wakeable. The component suspended.
      var wakeable = value;
      resetSuspendedComponent(sourceFiber);

      {
        if (getIsHydrating() && sourceFiber.mode & ConcurrentMode) {
          markDidThrowWhileHydratingDEV();
        }
      }


      var suspenseBoundary = getNearestSuspenseBoundaryToCapture(returnFiber);

      if (suspenseBoundary !== null) {
        suspenseBoundary.flags &= ~ForceClientRender;
        markSuspenseBoundaryShouldCapture(suspenseBoundary, returnFiber, sourceFiber, root, rootRenderLanes); // We only attach ping listeners in concurrent mode. Legacy Suspense always
        // commits fallbacks synchronously, so there are no pings.

        if (suspenseBoundary.mode & ConcurrentMode) {
          attachPingListener(root, wakeable, rootRenderLanes);
        }

        attachRetryListener(suspenseBoundary, root, wakeable);
        return;
      } else {
        // No boundary was found. Unless this is a sync update, this is OK.
        // We can suspend and wait for more data to arrive.
        if (!includesSyncLane(rootRenderLanes)) {
          // This is not a sync update. Suspend. Since we're not activating a
          // Suspense boundary, this will unwind all the way to the root without
          // performing a second pass to render a fallback. (This is arguably how
          // refresh transitions should work, too, since we're not going to commit
          // the fallbacks anyway.)
          //
          // This case also applies to initial hydration.
          attachPingListener(root, wakeable, rootRenderLanes);
          renderDidSuspendDelayIfPossible();
          return;
        } // This is a sync/discrete update. We treat this case like an error
        // because discrete renders are expected to produce a complete tree
        // synchronously to maintain consistency with external state.


        var uncaughtSuspenseError = new Error('A component suspended while responding to synchronous input. This ' + 'will cause the UI to be replaced with a loading indicator. To ' + 'fix, updates that suspend should be wrapped ' + 'with startTransition.'); // If we're outside a transition, fall through to the regular error path.
        // The error will be caught by the nearest suspense boundary.

        value = uncaughtSuspenseError;
      }
    } else {
      // This is a regular error, not a Suspense wakeable.
      if (getIsHydrating() && sourceFiber.mode & ConcurrentMode) {
        markDidThrowWhileHydratingDEV();

        var _suspenseBoundary = getNearestSuspenseBoundaryToCapture(returnFiber); // If the error was thrown during hydration, we may be able to recover by
        // discarding the dehydrated content and switching to a client render.
        // Instead of surfacing the error, find the nearest Suspense boundary
        // and render it again without hydration.


        if (_suspenseBoundary !== null) {
          if ((_suspenseBoundary.flags & ShouldCapture) === NoFlags) {
            // Set a flag to indicate that we should try rendering the normal
            // children again, not the fallback.
            _suspenseBoundary.flags |= ForceClientRender;
          }

          markSuspenseBoundaryShouldCapture(_suspenseBoundary, returnFiber, sourceFiber, root, rootRenderLanes); // Even though the user may not be affected by this error, we should
          // still log it so it can be fixed.

          queueHydrationError(value);
          return;
        }
      }
    } // We didn't find a boundary that could handle this type of exception. Start
    // over and traverse parent path again, this time treating the exception
    // as an error.


    renderDidError(value);
    value = createCapturedValue(value, sourceFiber);
    var workInProgress = returnFiber;

    do {
      switch (workInProgress.tag) {
        case HostRoot:
          {
            var _errorInfo = value;
            workInProgress.flags |= ShouldCapture;
            var lane = pickArbitraryLane(rootRenderLanes);
            workInProgress.lanes = mergeLanes(workInProgress.lanes, lane);
            var update = createRootErrorUpdate(workInProgress, _errorInfo, lane);
            enqueueCapturedUpdate(workInProgress, update);
            return;
          }

        case ClassComponent:
          // Capture and retry
          var errorInfo = value;
          var ctor = workInProgress.type;
          var instance = workInProgress.stateNode;

          if ((workInProgress.flags & DidCapture) === NoFlags && (typeof ctor.getDerivedStateFromError === 'function' || instance !== null && typeof instance.componentDidCatch === 'function' && !isAlreadyFailedLegacyErrorBoundary(instance))) {
            workInProgress.flags |= ShouldCapture;

            var _lane = pickArbitraryLane(rootRenderLanes);

            workInProgress.lanes = mergeLanes(workInProgress.lanes, _lane); // Schedule the error boundary to re-render using updated state

            var _update = createClassErrorUpdate(workInProgress, errorInfo, _lane);

            enqueueCapturedUpdate(workInProgress, _update);
            return;
          }

          break;
      }

      workInProgress = workInProgress.return;
    } while (workInProgress !== null);
  }