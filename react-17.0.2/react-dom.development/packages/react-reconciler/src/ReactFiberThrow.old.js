  var PossiblyWeakMap$2 = typeof WeakMap === 'function' ? WeakMap : Map;

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
        logCapturedError(fiber, errorInfo);
        return getDerivedStateFromError(error$1);
      };
    }

    var inst = fiber.stateNode;

    if (inst !== null && typeof inst.componentDidCatch === 'function') {
      update.callback = function callback() {
        {
          markFailedErrorBoundaryForHotReloading(fiber);
        }

        if (typeof getDerivedStateFromError !== 'function') {
          // To preserve the preexisting retry behavior of error boundaries,
          // we keep track of which ones already failed during this batch.
          // This gets reset before we yield back to the browser.
          // TODO: Warn in strict mode if getDerivedStateFromError is
          // not defined.
          markLegacyErrorBoundaryAsFailed(this); // Only log here if componentDidCatch is the only error boundary method defined

          logCapturedError(fiber, errorInfo);
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
              error('%s: Error boundaries should implement getDerivedStateFromError(). ' + 'In that method, return a state update to display an error message or fallback UI.', getComponentName(fiber.type) || 'Unknown');
            }
          }
        }
      };
    } else {
      update.callback = function () {
        markFailedErrorBoundaryForHotReloading(fiber);
      };
    }

    return update;
  }

  function attachPingListener(root, wakeable, lanes) {
    // Attach a listener to the promise to "ping" the root and retry. But only if
    // one does not already exist for the lanes we're currently rendering (which
    // acts like a "thread ID" here).
    var pingCache = root.pingCache;
    var threadIDs;

    if (pingCache === null) {
      pingCache = root.pingCache = new PossiblyWeakMap$2();
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
      wakeable.then(ping, ping);
    }
  }

  function throwException(root, returnFiber, sourceFiber, value, rootRenderLanes) {
    // The source fiber did not complete.
    sourceFiber.flags |= Incomplete; // Its effect list is no longer valid.

    sourceFiber.firstEffect = sourceFiber.lastEffect = null;

    if (value !== null && typeof value === 'object' && typeof value.then === 'function') {
      // This is a wakeable.
      var wakeable = value;

      {
        markComponentSuspended(sourceFiber, wakeable);
      }

      if ((sourceFiber.mode & BlockingMode) === NoMode) {
        // Reset the memoizedState to what it was before we attempted
        // to render it.
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

      var hasInvisibleParentBoundary = hasSuspenseContext(suspenseStackCursor.current, InvisibleParentSuspenseContext); // Schedule the nearest Suspense to re-render the timed out view.

      var _workInProgress = returnFiber;

      do {
        if (_workInProgress.tag === SuspenseComponent && shouldCaptureSuspense(_workInProgress, hasInvisibleParentBoundary)) {
          // Found the nearest boundary.
          // Stash the promise on the boundary fiber. If the boundary times out, we'll
          // attach another listener to flip the boundary back to its normal state.
          var wakeables = _workInProgress.updateQueue;

          if (wakeables === null) {
            var updateQueue = new Set();
            updateQueue.add(wakeable);
            _workInProgress.updateQueue = updateQueue;
          } else {
            wakeables.add(wakeable);
          } // If the boundary is outside of blocking mode, we should *not*
          // suspend the commit. Pretend as if the suspended component rendered
          // null and keep rendering. In the commit phase, we'll schedule a
          // subsequent synchronous update to re-render the Suspense.
          //
          // Note: It doesn't matter whether the component that suspended was
          // inside a blocking mode tree. If the Suspense is outside of it, we
          // should *not* suspend the commit.


          if ((_workInProgress.mode & BlockingMode) === NoMode) {
            _workInProgress.flags |= DidCapture;
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


            sourceFiber.lanes = mergeLanes(sourceFiber.lanes, SyncLane); // Exit without suspending.

            return;
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


          attachPingListener(root, wakeable, rootRenderLanes);
          _workInProgress.flags |= ShouldCapture;
          _workInProgress.lanes = rootRenderLanes;
          return;
        } // This boundary already captured during this render. Continue to the next
        // boundary.


        _workInProgress = _workInProgress.return;
      } while (_workInProgress !== null); // No boundary was found. Fallthrough to error mode.
      // TODO: Use invariant so the message is stripped in prod?


      value = new Error((getComponentName(sourceFiber.type) || 'A React component') + ' suspended while rendering, but no fallback UI was specified.\n' + '\n' + 'Add a <Suspense fallback=...> component higher in the tree to ' + 'provide a loading indicator or placeholder to display.');
    } // We didn't find a boundary that could handle this type of exception. Start
    // over and traverse parent path again, this time treating the exception
    // as an error.


    renderDidError();
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

            var _update = createRootErrorUpdate(workInProgress, _errorInfo, lane);

            enqueueCapturedUpdate(workInProgress, _update);
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

            var _update2 = createClassErrorUpdate(workInProgress, errorInfo, _lane);

            enqueueCapturedUpdate(workInProgress, _update2);
            return;
          }

          break;
      }

      workInProgress = workInProgress.return;
    } while (workInProgress !== null);
  }