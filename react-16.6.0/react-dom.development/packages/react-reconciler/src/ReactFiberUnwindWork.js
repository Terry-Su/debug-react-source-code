function createRootErrorUpdate(fiber, errorInfo, expirationTime) {
  var update = createUpdate(expirationTime);
  // Unmount the root by rendering null.
  update.tag = CaptureUpdate;
  // Caution: React DevTools currently depends on this property
  // being called "element".
  update.payload = { element: null };
  var error = errorInfo.value;
  update.callback = function () {
    onUncaughtError(error);
    logError(fiber, errorInfo);
  };
  return update;
}

function createClassErrorUpdate(fiber, errorInfo, expirationTime) {
  var update = createUpdate(expirationTime);
  update.tag = CaptureUpdate;
  var getDerivedStateFromError = fiber.type.getDerivedStateFromError;
  if (typeof getDerivedStateFromError === 'function') {
    var error = errorInfo.value;
    update.payload = function () {
      return getDerivedStateFromError(error);
    };
  }

  var inst = fiber.stateNode;
  if (inst !== null && typeof inst.componentDidCatch === 'function') {
    update.callback = function callback() {
      if (typeof getDerivedStateFromError !== 'function') {
        // To preserve the preexisting retry behavior of error boundaries,
        // we keep track of which ones already failed during this batch.
        // This gets reset before we yield back to the browser.
        // TODO: Warn in strict mode if getDerivedStateFromError is
        // not defined.
        markLegacyErrorBoundaryAsFailed(this);
      }
      var error = errorInfo.value;
      var stack = errorInfo.stack;
      logError(fiber, errorInfo);
      this.componentDidCatch(error, {
        componentStack: stack !== null ? stack : ''
      });
      {
        if (typeof getDerivedStateFromError !== 'function') {
          // If componentDidCatch is the only error boundary method defined,
          // then it needs to call setState to recover from errors.
          // If no state update is scheduled then the boundary will swallow the error.
          !(fiber.expirationTime === Sync) ? warningWithoutStack$1(false, '%s: Error boundaries should implement getDerivedStateFromError(). ' + 'In that method, return a state update to display an error message or fallback UI.', getComponentName(fiber.type) || 'Unknown') : void 0;
        }
      }
    };
  }
  return update;
}

function throwException(root, returnFiber, sourceFiber, value, renderExpirationTime) {
  // The source fiber did not complete.
  sourceFiber.effectTag |= Incomplete;
  // Its effect list is no longer valid.
  sourceFiber.firstEffect = sourceFiber.lastEffect = null;

  if (value !== null && typeof value === 'object' && typeof value.then === 'function') {
    // This is a thenable.
    var thenable = value;

    // Find the earliest timeout threshold of all the placeholders in the
    // ancestor path. We could avoid this traversal by storing the thresholds on
    // the stack, but we choose not to because we only hit this path if we're
    // IO-bound (i.e. if something suspends). Whereas the stack is used even in
    // the non-IO- bound case.
    var _workInProgress = returnFiber;
    var earliestTimeoutMs = -1;
    var startTimeMs = -1;
    do {
      if (_workInProgress.tag === SuspenseComponent) {
        var current = _workInProgress.alternate;
        if (current !== null) {
          var currentState = current.memoizedState;
          if (currentState !== null && currentState.didTimeout) {
            // Reached a boundary that already timed out. Do not search
            // any further.
            var timedOutAt = currentState.timedOutAt;
            startTimeMs = expirationTimeToMs(timedOutAt);
            // Do not search any further.
            break;
          }
        }
        var timeoutPropMs = _workInProgress.pendingProps.maxDuration;
        if (typeof timeoutPropMs === 'number') {
          if (timeoutPropMs <= 0) {
            earliestTimeoutMs = 0;
          } else if (earliestTimeoutMs === -1 || timeoutPropMs < earliestTimeoutMs) {
            earliestTimeoutMs = timeoutPropMs;
          }
        }
      }
      _workInProgress = _workInProgress.return;
    } while (_workInProgress !== null);

    // Schedule the nearest Suspense to re-render the timed out view.
    _workInProgress = returnFiber;
    do {
      if (_workInProgress.tag === SuspenseComponent && shouldCaptureSuspense(_workInProgress.alternate, _workInProgress)) {
        // Found the nearest boundary.

        // If the boundary is not in concurrent mode, we should not suspend, and
        // likewise, when the promise resolves, we should ping synchronously.
        var pingTime = (_workInProgress.mode & ConcurrentMode) === NoEffect ? Sync : renderExpirationTime;

        // Attach a listener to the promise to "ping" the root and retry.
        var onResolveOrReject = retrySuspendedRoot.bind(null, root, _workInProgress, sourceFiber, pingTime);
        if (enableSchedulerTracing) {
          onResolveOrReject = unstable_wrap(onResolveOrReject);
        }
        thenable.then(onResolveOrReject, onResolveOrReject);

        // If the boundary is outside of concurrent mode, we should *not*
        // suspend the commit. Pretend as if the suspended component rendered
        // null and keep rendering. In the commit phase, we'll schedule a
        // subsequent synchronous update to re-render the Suspense.
        //
        // Note: It doesn't matter whether the component that suspended was
        // inside a concurrent mode tree. If the Suspense is outside of it, we
        // should *not* suspend the commit.
        if ((_workInProgress.mode & ConcurrentMode) === NoEffect) {
          _workInProgress.effectTag |= Callback;

          // Unmount the source fiber's children
          var nextChildren = null;
          reconcileChildren(sourceFiber.alternate, sourceFiber, nextChildren, renderExpirationTime);
          sourceFiber.effectTag &= ~Incomplete;

          if (sourceFiber.tag === ClassComponent) {
            // We're going to commit this fiber even though it didn't complete.
            // But we shouldn't call any lifecycle methods or callbacks. Remove
            // all lifecycle effect tags.
            sourceFiber.effectTag &= ~LifecycleEffectMask;
            var _current = sourceFiber.alternate;
            if (_current === null) {
              // This is a new mount. Change the tag so it's not mistaken for a
              // completed component. For example, we should not call
              // componentWillUnmount if it is deleted.
              sourceFiber.tag = IncompleteClassComponent;
            }
          }

          // Exit without suspending.
          return;
        }

        // Confirmed that the boundary is in a concurrent mode tree. Continue
        // with the normal suspend path.

        var absoluteTimeoutMs = void 0;
        if (earliestTimeoutMs === -1) {
          // If no explicit threshold is given, default to an abitrarily large
          // value. The actual size doesn't matter because the threshold for the
          // whole tree will be clamped to the expiration time.
          absoluteTimeoutMs = maxSigned31BitInt;
        } else {
          if (startTimeMs === -1) {
            // This suspend happened outside of any already timed-out
            // placeholders. We don't know exactly when the update was
            // scheduled, but we can infer an approximate start time from the
            // expiration time. First, find the earliest uncommitted expiration
            // time in the tree, including work that is suspended. Then subtract
            // the offset used to compute an async update's expiration time.
            // This will cause high priority (interactive) work to expire
            // earlier than necessary, but we can account for this by adjusting
            // for the Just Noticeable Difference.
            var earliestExpirationTime = findEarliestOutstandingPriorityLevel(root, renderExpirationTime);
            var earliestExpirationTimeMs = expirationTimeToMs(earliestExpirationTime);
            startTimeMs = earliestExpirationTimeMs - LOW_PRIORITY_EXPIRATION;
          }
          absoluteTimeoutMs = startTimeMs + earliestTimeoutMs;
        }

        // Mark the earliest timeout in the suspended fiber's ancestor path.
        // After completing the root, we'll take the largest of all the
        // suspended fiber's timeouts and use it to compute a timeout for the
        // whole tree.
        renderDidSuspend(root, absoluteTimeoutMs, renderExpirationTime);

        _workInProgress.effectTag |= ShouldCapture;
        _workInProgress.expirationTime = renderExpirationTime;
        return;
      }
      // This boundary already captured during this render. Continue to the next
      // boundary.
      _workInProgress = _workInProgress.return;
    } while (_workInProgress !== null);
    // No boundary was found. Fallthrough to error mode.
    value = new Error('An update was suspended, but no placeholder UI was provided.');
  }

  // We didn't find a boundary that could handle this type of exception. Start
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
          workInProgress.effectTag |= ShouldCapture;
          workInProgress.expirationTime = renderExpirationTime;
          var update = createRootErrorUpdate(workInProgress, _errorInfo, renderExpirationTime);
          enqueueCapturedUpdate(workInProgress, update);
          return;
        }
      case ClassComponent:
        // Capture and retry
        var errorInfo = value;
        var ctor = workInProgress.type;
        var instance = workInProgress.stateNode;
        if ((workInProgress.effectTag & DidCapture) === NoEffect && (typeof ctor.getDerivedStateFromError === 'function' || instance !== null && typeof instance.componentDidCatch === 'function' && !isAlreadyFailedLegacyErrorBoundary(instance))) {
          workInProgress.effectTag |= ShouldCapture;
          workInProgress.expirationTime = renderExpirationTime;
          // Schedule the error boundary to re-render using updated state
          var _update = createClassErrorUpdate(workInProgress, errorInfo, renderExpirationTime);
          enqueueCapturedUpdate(workInProgress, _update);
          return;
        }
        break;
      default:
        break;
    }
    workInProgress = workInProgress.return;
  } while (workInProgress !== null);
}

function unwindWork(workInProgress, renderExpirationTime) {
  switch (workInProgress.tag) {
    case ClassComponent:
      {
        var Component = workInProgress.type;
        if (isContextProvider(Component)) {
          popContext(workInProgress);
        }
        var effectTag = workInProgress.effectTag;
        if (effectTag & ShouldCapture) {
          workInProgress.effectTag = effectTag & ~ShouldCapture | DidCapture;
          return workInProgress;
        }
        return null;
      }
    case HostRoot:
      {
        popHostContainer(workInProgress);
        popTopLevelContextObject(workInProgress);
        var _effectTag = workInProgress.effectTag;
        !((_effectTag & DidCapture) === NoEffect) ? invariant(false, 'The root failed to unmount after an error. This is likely a bug in React. Please file an issue.') : void 0;
        workInProgress.effectTag = _effectTag & ~ShouldCapture | DidCapture;
        return workInProgress;
      }
    case HostComponent:
      {
        popHostContext(workInProgress);
        return null;
      }
    case SuspenseComponent:
      {
        var _effectTag2 = workInProgress.effectTag;
        if (_effectTag2 & ShouldCapture) {
          workInProgress.effectTag = _effectTag2 & ~ShouldCapture | DidCapture;
          // Captured a suspense effect. Set the boundary's `alreadyCaptured`
          // state to true so we know to render the fallback.
          var current = workInProgress.alternate;
          var currentState = current !== null ? current.memoizedState : null;
          var nextState = workInProgress.memoizedState;
          if (nextState === null) {
            // No existing state. Create a new object.
            nextState = {
              alreadyCaptured: true,
              didTimeout: false,
              timedOutAt: NoWork
            };
          } else if (currentState === nextState) {
            // There is an existing state but it's the same as the current tree's.
            // Clone the object.
            nextState = {
              alreadyCaptured: true,
              didTimeout: nextState.didTimeout,
              timedOutAt: nextState.timedOutAt
            };
          } else {
            // Already have a clone, so it's safe to mutate.
            nextState.alreadyCaptured = true;
          }
          workInProgress.memoizedState = nextState;
          // Re-render the boundary.
          return workInProgress;
        }
        return null;
      }
    case HostPortal:
      popHostContainer(workInProgress);
      return null;
    case ContextProvider:
      popProvider(workInProgress);
      return null;
    default:
      return null;
  }
}

function unwindInterruptedWork(interruptedWork) {
  switch (interruptedWork.tag) {
    case ClassComponent:
      {
        var childContextTypes = interruptedWork.type.childContextTypes;
        if (childContextTypes !== null && childContextTypes !== undefined) {
          popContext(interruptedWork);
        }
        break;
      }
    case HostRoot:
      {
        popHostContainer(interruptedWork);
        popTopLevelContextObject(interruptedWork);
        break;
      }
    case HostComponent:
      {
        popHostContext(interruptedWork);
        break;
      }
    case HostPortal:
      popHostContainer(interruptedWork);
      break;
    case ContextProvider:
      popProvider(interruptedWork);
      break;
    default:
      break;
  }
}

