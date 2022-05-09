  var ReactCurrentDispatcher$1 = ReactSharedInternals.ReactCurrentDispatcher,
      ReactCurrentBatchConfig$2 = ReactSharedInternals.ReactCurrentBatchConfig;
  var didWarnAboutMismatchedHooksForComponent;
  var didWarnUncachedGetSnapshot;

  {
    didWarnAboutMismatchedHooksForComponent = new Set();
  }

  // These are set right before calling the component.
  var renderLanes = NoLanes; // The work-in-progress fiber. I've named it differently to distinguish it from
  // the work-in-progress hook.

  var currentlyRenderingFiber$1 = null; // Hooks are stored as a linked list on the fiber's memoizedState field. The
  // current hook list is the list that belongs to the current fiber. The
  // work-in-progress hook list is a new list that will be added to the
  // work-in-progress fiber.

  var currentHook = null;
  var workInProgressHook = null; // Whether an update was scheduled at any point during the render phase. This
  // does not get reset if we do another render pass; only when we're completely
  // finished evaluating this component. This is an optimization so we know
  // whether we need to clear render phase updates after a throw.

  var didScheduleRenderPhaseUpdate = false; // Where an update was scheduled only during the current render pass. This
  // gets reset after each attempt.
  // TODO: Maybe there's some way to consolidate this with
  // `didScheduleRenderPhaseUpdate`. Or with `numberOfReRenders`.

  var didScheduleRenderPhaseUpdateDuringThisPass = false; // Counts the number of useId hooks in this component.

  var localIdCounter = 0; // Used for ids that are generated completely client-side (i.e. not during
  // hydration). This counter is global, so client ids are not stable across
  // render attempts.

  var globalClientIdCounter = 0;
  var RE_RENDER_LIMIT = 25; // In DEV, this is the name of the currently executing primitive hook

  var currentHookNameInDev = null; // In DEV, this list ensures that hooks are called in the same order between renders.
  // The list stores the order of hooks used during the initial render (mount).
  // Subsequent renders (updates) reference this list.

  var hookTypesDev = null;
  var hookTypesUpdateIndexDev = -1; // In DEV, this tracks whether currently rendering component needs to ignore
  // the dependencies for Hooks that need them (e.g. useEffect or useMemo).
  // When true, such Hooks will always be "remounted". Only used during hot reload.

  var ignorePreviousDependencies = false;

  function mountHookTypesDev() {
    {
      var hookName = currentHookNameInDev;

      if (hookTypesDev === null) {
        hookTypesDev = [hookName];
      } else {
        hookTypesDev.push(hookName);
      }
    }
  }

  function updateHookTypesDev() {
    {
      var hookName = currentHookNameInDev;

      if (hookTypesDev !== null) {
        hookTypesUpdateIndexDev++;

        if (hookTypesDev[hookTypesUpdateIndexDev] !== hookName) {
          warnOnHookMismatchInDev(hookName);
        }
      }
    }
  }

  function checkDepsAreArrayDev(deps) {
    {
      if (deps !== undefined && deps !== null && !isArray(deps)) {
        // Verify deps, but only on mount to avoid extra checks.
        // It's unlikely their type would change as usually you define them inline.
        error('%s received a final argument that is not an array (instead, received `%s`). When ' + 'specified, the final argument must be an array.', currentHookNameInDev, typeof deps);
      }
    }
  }

  function warnOnHookMismatchInDev(currentHookName) {
    {
      var componentName = getComponentNameFromFiber(currentlyRenderingFiber$1);

      if (!didWarnAboutMismatchedHooksForComponent.has(componentName)) {
        didWarnAboutMismatchedHooksForComponent.add(componentName);

        if (hookTypesDev !== null) {
          var table = '';
          var secondColumnStart = 30;

          for (var i = 0; i <= hookTypesUpdateIndexDev; i++) {
            var oldHookName = hookTypesDev[i];
            var newHookName = i === hookTypesUpdateIndexDev ? currentHookName : oldHookName;
            var row = i + 1 + ". " + oldHookName; // Extra space so second column lines up
            // lol @ IE not supporting String#repeat

            while (row.length < secondColumnStart) {
              row += ' ';
            }

            row += newHookName + '\n';
            table += row;
          }

          error('React has detected a change in the order of Hooks called by %s. ' + 'This will lead to bugs and errors if not fixed. ' + 'For more information, read the Rules of Hooks: https://reactjs.org/link/rules-of-hooks\n\n' + '   Previous render            Next render\n' + '   ------------------------------------------------------\n' + '%s' + '   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n', componentName, table);
        }
      }
    }
  }

  function throwInvalidHookError() {
    throw new Error('Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for' + ' one of the following reasons:\n' + '1. You might have mismatching versions of React and the renderer (such as React DOM)\n' + '2. You might be breaking the Rules of Hooks\n' + '3. You might have more than one copy of React in the same app\n' + 'See https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem.');
  }

  function areHookInputsEqual(nextDeps, prevDeps) {
    {
      if (ignorePreviousDependencies) {
        // Only true when this component is being hot reloaded.
        return false;
      }
    }

    if (prevDeps === null) {
      {
        error('%s received a final argument during this render, but not during ' + 'the previous render. Even though the final argument is optional, ' + 'its type cannot change between renders.', currentHookNameInDev);
      }

      return false;
    }

    {
      // Don't bother comparing lengths in prod because these arrays should be
      // passed inline.
      if (nextDeps.length !== prevDeps.length) {
        error('The final argument passed to %s changed size between renders. The ' + 'order and size of this array must remain constant.\n\n' + 'Previous: %s\n' + 'Incoming: %s', currentHookNameInDev, "[" + prevDeps.join(', ') + "]", "[" + nextDeps.join(', ') + "]");
      }
    }

    for (var i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
      if (objectIs(nextDeps[i], prevDeps[i])) {
        continue;
      }

      return false;
    }

    return true;
  }

  function renderWithHooks(current, workInProgress, Component, props, secondArg, nextRenderLanes) {
    renderLanes = nextRenderLanes;
    currentlyRenderingFiber$1 = workInProgress;

    {
      hookTypesDev = current !== null ? current._debugHookTypes : null;
      hookTypesUpdateIndexDev = -1; // Used for hot reloading:

      ignorePreviousDependencies = current !== null && current.type !== workInProgress.type;
    }

    workInProgress.memoizedState = null;
    workInProgress.updateQueue = null;
    workInProgress.lanes = NoLanes; // The following should have already been reset
    // currentHook = null;
    // workInProgressHook = null;
    // didScheduleRenderPhaseUpdate = false;
    // localIdCounter = 0;
    // TODO Warn if no hooks are used at all during mount, then some are used during update.
    // Currently we will identify the update render as a mount because memoizedState === null.
    // This is tricky because it's valid for certain types of components (e.g. React.lazy)
    // Using memoizedState to differentiate between mount/update only works if at least one stateful hook is used.
    // Non-stateful hooks (e.g. context) don't get added to memoizedState,
    // so memoizedState would be null during updates and mounts.

    {
      if (current !== null && current.memoizedState !== null) {
        ReactCurrentDispatcher$1.current = HooksDispatcherOnUpdateInDEV;
      } else if (hookTypesDev !== null) {
        // This dispatcher handles an edge case where a component is updating,
        // but no stateful hooks have been used.
        // We want to match the production code behavior (which will use HooksDispatcherOnMount),
        // but with the extra DEV validation to ensure hooks ordering hasn't changed.
        // This dispatcher does that.
        ReactCurrentDispatcher$1.current = HooksDispatcherOnMountWithHookTypesInDEV;
      } else {
        ReactCurrentDispatcher$1.current = HooksDispatcherOnMountInDEV;
      }
    }

    var children = Component(props, secondArg); // Check if there was a render phase update

    if (didScheduleRenderPhaseUpdateDuringThisPass) {
      // Keep rendering in a loop for as long as render phase updates continue to
      // be scheduled. Use a counter to prevent infinite loops.
      var numberOfReRenders = 0;

      do {
        didScheduleRenderPhaseUpdateDuringThisPass = false;
        localIdCounter = 0;

        if (numberOfReRenders >= RE_RENDER_LIMIT) {
          throw new Error('Too many re-renders. React limits the number of renders to prevent ' + 'an infinite loop.');
        }

        numberOfReRenders += 1;

        {
          // Even when hot reloading, allow dependencies to stabilize
          // after first render to prevent infinite render phase updates.
          ignorePreviousDependencies = false;
        } // Start over from the beginning of the list


        currentHook = null;
        workInProgressHook = null;
        workInProgress.updateQueue = null;

        {
          // Also validate hook order for cascading updates.
          hookTypesUpdateIndexDev = -1;
        }

        ReactCurrentDispatcher$1.current =  HooksDispatcherOnRerenderInDEV ;
        children = Component(props, secondArg);
      } while (didScheduleRenderPhaseUpdateDuringThisPass);
    } // We can assume the previous dispatcher is always this one, since we set it
    // at the beginning of the render phase and there's no re-entrance.


    ReactCurrentDispatcher$1.current = ContextOnlyDispatcher;

    {
      workInProgress._debugHookTypes = hookTypesDev;
    } // This check uses currentHook so that it works the same in DEV and prod bundles.
    // hookTypesDev could catch more cases (e.g. context) but only in DEV bundles.


    var didRenderTooFewHooks = currentHook !== null && currentHook.next !== null;
    renderLanes = NoLanes;
    currentlyRenderingFiber$1 = null;
    currentHook = null;
    workInProgressHook = null;

    {
      currentHookNameInDev = null;
      hookTypesDev = null;
      hookTypesUpdateIndexDev = -1; // Confirm that a static flag was not added or removed since the last
      // render. If this fires, it suggests that we incorrectly reset the static
      // flags in some other part of the codebase. This has happened before, for
      // example, in the SuspenseList implementation.

      if (current !== null && (current.flags & StaticMask) !== (workInProgress.flags & StaticMask) && // Disable this warning in legacy mode, because legacy Suspense is weird
      // and creates false positives. To make this work in legacy mode, we'd
      // need to mark fibers that commit in an incomplete state, somehow. For
      // now I'll disable the warning that most of the bugs that would trigger
      // it are either exclusive to concurrent mode or exist in both.
      (current.mode & ConcurrentMode) !== NoMode) {
        error('Internal React error: Expected static flag was missing. Please ' + 'notify the React team.');
      }
    }

    didScheduleRenderPhaseUpdate = false; // This is reset by checkDidRenderIdHook
    // localIdCounter = 0;

    if (didRenderTooFewHooks) {
      throw new Error('Rendered fewer hooks than expected. This may be caused by an accidental ' + 'early return statement.');
    }

    return children;
  }
  function checkDidRenderIdHook() {
    // This should be called immediately after every renderWithHooks call.
    // Conceptually, it's part of the return value of renderWithHooks; it's only a
    // separate function to avoid using an array tuple.
    var didRenderIdHook = localIdCounter !== 0;
    localIdCounter = 0;
    return didRenderIdHook;
  }
  function bailoutHooks(current, workInProgress, lanes) {
    workInProgress.updateQueue = current.updateQueue; // TODO: Don't need to reset the flags here, because they're reset in the
    // complete phase (bubbleProperties).

    if ( (workInProgress.mode & StrictEffectsMode) !== NoMode) {
      workInProgress.flags &= ~(MountPassiveDev | MountLayoutDev | Passive | Update);
    } else {
      workInProgress.flags &= ~(Passive | Update);
    }

    current.lanes = removeLanes(current.lanes, lanes);
  }
  function resetHooksAfterThrow() {
    // We can assume the previous dispatcher is always this one, since we set it
    // at the beginning of the render phase and there's no re-entrance.
    ReactCurrentDispatcher$1.current = ContextOnlyDispatcher;

    if (didScheduleRenderPhaseUpdate) {
      // There were render phase updates. These are only valid for this render
      // phase, which we are now aborting. Remove the updates from the queues so
      // they do not persist to the next render. Do not remove updates from hooks
      // that weren't processed.
      //
      // Only reset the updates from the queue if it has a clone. If it does
      // not have a clone, that means it wasn't processed, and the updates were
      // scheduled before we entered the render phase.
      var hook = currentlyRenderingFiber$1.memoizedState;

      while (hook !== null) {
        var queue = hook.queue;

        if (queue !== null) {
          queue.pending = null;
        }

        hook = hook.next;
      }

      didScheduleRenderPhaseUpdate = false;
    }

    renderLanes = NoLanes;
    currentlyRenderingFiber$1 = null;
    currentHook = null;
    workInProgressHook = null;

    {
      hookTypesDev = null;
      hookTypesUpdateIndexDev = -1;
      currentHookNameInDev = null;
      isUpdatingOpaqueValueInRenderPhase = false;
    }

    didScheduleRenderPhaseUpdateDuringThisPass = false;
    localIdCounter = 0;
  }

  function mountWorkInProgressHook() {
    var hook = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };

    if (workInProgressHook === null) {
      // This is the first hook in the list
      currentlyRenderingFiber$1.memoizedState = workInProgressHook = hook;
    } else {
      // Append to the end of the list
      workInProgressHook = workInProgressHook.next = hook;
    }

    return workInProgressHook;
  }

  function updateWorkInProgressHook() {
    // This function is used both for updates and for re-renders triggered by a
    // render phase update. It assumes there is either a current hook we can
    // clone, or a work-in-progress hook from a previous render pass that we can
    // use as a base. When we reach the end of the base list, we must switch to
    // the dispatcher used for mounts.
    var nextCurrentHook;

    if (currentHook === null) {
      var current = currentlyRenderingFiber$1.alternate;

      if (current !== null) {
        nextCurrentHook = current.memoizedState;
      } else {
        nextCurrentHook = null;
      }
    } else {
      nextCurrentHook = currentHook.next;
    }

    var nextWorkInProgressHook;

    if (workInProgressHook === null) {
      nextWorkInProgressHook = currentlyRenderingFiber$1.memoizedState;
    } else {
      nextWorkInProgressHook = workInProgressHook.next;
    }

    if (nextWorkInProgressHook !== null) {
      // There's already a work-in-progress. Reuse it.
      workInProgressHook = nextWorkInProgressHook;
      nextWorkInProgressHook = workInProgressHook.next;
      currentHook = nextCurrentHook;
    } else {
      // Clone from the current hook.
      if (nextCurrentHook === null) {
        throw new Error('Rendered more hooks than during the previous render.');
      }

      currentHook = nextCurrentHook;
      var newHook = {
        memoizedState: currentHook.memoizedState,
        baseState: currentHook.baseState,
        baseQueue: currentHook.baseQueue,
        queue: currentHook.queue,
        next: null
      };

      if (workInProgressHook === null) {
        // This is the first hook in the list.
        currentlyRenderingFiber$1.memoizedState = workInProgressHook = newHook;
      } else {
        // Append to the end of the list.
        workInProgressHook = workInProgressHook.next = newHook;
      }
    }

    return workInProgressHook;
  }

  function createFunctionComponentUpdateQueue() {
    return {
      lastEffect: null,
      stores: null
    };
  }

  function basicStateReducer(state, action) {
    // $FlowFixMe: Flow doesn't like mixed types
    return typeof action === 'function' ? action(state) : action;
  }

  function mountReducer(reducer, initialArg, init) {
    var hook = mountWorkInProgressHook();
    var initialState;

    if (init !== undefined) {
      initialState = init(initialArg);
    } else {
      initialState = initialArg;
    }

    hook.memoizedState = hook.baseState = initialState;
    var queue = {
      pending: null,
      interleaved: null,
      lanes: NoLanes,
      dispatch: null,
      lastRenderedReducer: reducer,
      lastRenderedState: initialState
    };
    hook.queue = queue;
    var dispatch = queue.dispatch = dispatchReducerAction.bind(null, currentlyRenderingFiber$1, queue);
    return [hook.memoizedState, dispatch];
  }

  function updateReducer(reducer, initialArg, init) {
    var hook = updateWorkInProgressHook();
    var queue = hook.queue;

    if (queue === null) {
      throw new Error('Should have a queue. This is likely a bug in React. Please file an issue.');
    }

    queue.lastRenderedReducer = reducer;
    var current = currentHook; // The last rebase update that is NOT part of the base state.

    var baseQueue = current.baseQueue; // The last pending update that hasn't been processed yet.

    var pendingQueue = queue.pending;

    if (pendingQueue !== null) {
      // We have new updates that haven't been processed yet.
      // We'll add them to the base queue.
      if (baseQueue !== null) {
        // Merge the pending queue and the base queue.
        var baseFirst = baseQueue.next;
        var pendingFirst = pendingQueue.next;
        baseQueue.next = pendingFirst;
        pendingQueue.next = baseFirst;
      }

      {
        if (current.baseQueue !== baseQueue) {
          // Internal invariant that should never happen, but feasibly could in
          // the future if we implement resuming, or some form of that.
          error('Internal error: Expected work-in-progress queue to be a clone. ' + 'This is a bug in React.');
        }
      }

      current.baseQueue = baseQueue = pendingQueue;
      queue.pending = null;
    }

    if (baseQueue !== null) {
      // We have a queue to process.
      var first = baseQueue.next;
      var newState = current.baseState;
      var newBaseState = null;
      var newBaseQueueFirst = null;
      var newBaseQueueLast = null;
      var update = first;

      do {
        var updateLane = update.lane;

        if (!isSubsetOfLanes(renderLanes, updateLane)) {
          // Priority is insufficient. Skip this update. If this is the first
          // skipped update, the previous update/state is the new base
          // update/state.
          var clone = {
            lane: updateLane,
            action: update.action,
            hasEagerState: update.hasEagerState,
            eagerState: update.eagerState,
            next: null
          };

          if (newBaseQueueLast === null) {
            newBaseQueueFirst = newBaseQueueLast = clone;
            newBaseState = newState;
          } else {
            newBaseQueueLast = newBaseQueueLast.next = clone;
          } // Update the remaining priority in the queue.
          // TODO: Don't need to accumulate this. Instead, we can remove
          // renderLanes from the original lanes.


          currentlyRenderingFiber$1.lanes = mergeLanes(currentlyRenderingFiber$1.lanes, updateLane);
          markSkippedUpdateLanes(updateLane);
        } else {
          // This update does have sufficient priority.
          if (newBaseQueueLast !== null) {
            var _clone = {
              // This update is going to be committed so we never want uncommit
              // it. Using NoLane works because 0 is a subset of all bitmasks, so
              // this will never be skipped by the check above.
              lane: NoLane,
              action: update.action,
              hasEagerState: update.hasEagerState,
              eagerState: update.eagerState,
              next: null
            };
            newBaseQueueLast = newBaseQueueLast.next = _clone;
          } // Process this update.


          if (update.hasEagerState) {
            // If this update is a state update (not a reducer) and was processed eagerly,
            // we can use the eagerly computed state
            newState = update.eagerState;
          } else {
            var action = update.action;
            newState = reducer(newState, action);
          }
        }

        update = update.next;
      } while (update !== null && update !== first);

      if (newBaseQueueLast === null) {
        newBaseState = newState;
      } else {
        newBaseQueueLast.next = newBaseQueueFirst;
      } // Mark that the fiber performed work, but only if the new state is
      // different from the current state.


      if (!objectIs(newState, hook.memoizedState)) {
        markWorkInProgressReceivedUpdate();
      }

      hook.memoizedState = newState;
      hook.baseState = newBaseState;
      hook.baseQueue = newBaseQueueLast;
      queue.lastRenderedState = newState;
    } // Interleaved updates are stored on a separate queue. We aren't going to
    // process them during this render, but we do need to track which lanes
    // are remaining.


    var lastInterleaved = queue.interleaved;

    if (lastInterleaved !== null) {
      var interleaved = lastInterleaved;

      do {
        var interleavedLane = interleaved.lane;
        currentlyRenderingFiber$1.lanes = mergeLanes(currentlyRenderingFiber$1.lanes, interleavedLane);
        markSkippedUpdateLanes(interleavedLane);
        interleaved = interleaved.next;
      } while (interleaved !== lastInterleaved);
    } else if (baseQueue === null) {
      // `queue.lanes` is used for entangling transitions. We can set it back to
      // zero once the queue is empty.
      queue.lanes = NoLanes;
    }

    var dispatch = queue.dispatch;
    return [hook.memoizedState, dispatch];
  }

  function rerenderReducer(reducer, initialArg, init) {
    var hook = updateWorkInProgressHook();
    var queue = hook.queue;

    if (queue === null) {
      throw new Error('Should have a queue. This is likely a bug in React. Please file an issue.');
    }

    queue.lastRenderedReducer = reducer; // This is a re-render. Apply the new render phase updates to the previous
    // work-in-progress hook.

    var dispatch = queue.dispatch;
    var lastRenderPhaseUpdate = queue.pending;
    var newState = hook.memoizedState;

    if (lastRenderPhaseUpdate !== null) {
      // The queue doesn't persist past this render pass.
      queue.pending = null;
      var firstRenderPhaseUpdate = lastRenderPhaseUpdate.next;
      var update = firstRenderPhaseUpdate;

      do {
        // Process this render phase update. We don't have to check the
        // priority because it will always be the same as the current
        // render's.
        var action = update.action;
        newState = reducer(newState, action);
        update = update.next;
      } while (update !== firstRenderPhaseUpdate); // Mark that the fiber performed work, but only if the new state is
      // different from the current state.


      if (!objectIs(newState, hook.memoizedState)) {
        markWorkInProgressReceivedUpdate();
      }

      hook.memoizedState = newState; // Don't persist the state accumulated from the render phase updates to
      // the base state unless the queue is empty.
      // TODO: Not sure if this is the desired semantics, but it's what we
      // do for gDSFP. I can't remember why.

      if (hook.baseQueue === null) {
        hook.baseState = newState;
      }

      queue.lastRenderedState = newState;
    }

    return [newState, dispatch];
  }

  function mountMutableSource(source, getSnapshot, subscribe) {
    {
      return undefined;
    }
  }

  function updateMutableSource(source, getSnapshot, subscribe) {
    {
      return undefined;
    }
  }

  function mountSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
    var fiber = currentlyRenderingFiber$1;
    var hook = mountWorkInProgressHook();
    var nextSnapshot;
    var isHydrating = getIsHydrating();

    if (isHydrating) {
      if (getServerSnapshot === undefined) {
        throw new Error('Missing getServerSnapshot, which is required for ' + 'server-rendered content. Will revert to client rendering.');
      }

      nextSnapshot = getServerSnapshot();

      {
        if (!didWarnUncachedGetSnapshot) {
          if (nextSnapshot !== getServerSnapshot()) {
            error('The result of getServerSnapshot should be cached to avoid an infinite loop');

            didWarnUncachedGetSnapshot = true;
          }
        }
      }
    } else {
      nextSnapshot = getSnapshot();

      {
        if (!didWarnUncachedGetSnapshot) {
          var cachedSnapshot = getSnapshot();

          if (!objectIs(nextSnapshot, cachedSnapshot)) {
            error('The result of getSnapshot should be cached to avoid an infinite loop');

            didWarnUncachedGetSnapshot = true;
          }
        }
      } // Unless we're rendering a blocking lane, schedule a consistency check.
      // Right before committing, we will walk the tree and check if any of the
      // stores were mutated.
      //
      // We won't do this if we're hydrating server-rendered content, because if
      // the content is stale, it's already visible anyway. Instead we'll patch
      // it up in a passive effect.


      var root = getWorkInProgressRoot();

      if (root === null) {
        throw new Error('Expected a work-in-progress root. This is a bug in React. Please file an issue.');
      }

      if (!includesBlockingLane(root, renderLanes)) {
        pushStoreConsistencyCheck(fiber, getSnapshot, nextSnapshot);
      }
    } // Read the current snapshot from the store on every render. This breaks the
    // normal rules of React, and only works because store updates are
    // always synchronous.


    hook.memoizedState = nextSnapshot;
    var inst = {
      value: nextSnapshot,
      getSnapshot: getSnapshot
    };
    hook.queue = inst; // Schedule an effect to subscribe to the store.

    mountEffect(subscribeToStore.bind(null, fiber, inst, subscribe), [subscribe]); // Schedule an effect to update the mutable instance fields. We will update
    // this whenever subscribe, getSnapshot, or value changes. Because there's no
    // clean-up function, and we track the deps correctly, we can call pushEffect
    // directly, without storing any additional state. For the same reason, we
    // don't need to set a static flag, either.
    // TODO: We can move this to the passive phase once we add a pre-commit
    // consistency check. See the next comment.

    fiber.flags |= Passive;
    pushEffect(HasEffect | Passive$1, updateStoreInstance.bind(null, fiber, inst, nextSnapshot, getSnapshot), undefined, null);
    return nextSnapshot;
  }

  function updateSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
    var fiber = currentlyRenderingFiber$1;
    var hook = updateWorkInProgressHook(); // Read the current snapshot from the store on every render. This breaks the
    // normal rules of React, and only works because store updates are
    // always synchronous.

    var nextSnapshot = getSnapshot();

    {
      if (!didWarnUncachedGetSnapshot) {
        var cachedSnapshot = getSnapshot();

        if (!objectIs(nextSnapshot, cachedSnapshot)) {
          error('The result of getSnapshot should be cached to avoid an infinite loop');

          didWarnUncachedGetSnapshot = true;
        }
      }
    }

    var prevSnapshot = hook.memoizedState;
    var snapshotChanged = !objectIs(prevSnapshot, nextSnapshot);

    if (snapshotChanged) {
      hook.memoizedState = nextSnapshot;
      markWorkInProgressReceivedUpdate();
    }

    var inst = hook.queue;
    updateEffect(subscribeToStore.bind(null, fiber, inst, subscribe), [subscribe]); // Whenever getSnapshot or subscribe changes, we need to check in the
    // commit phase if there was an interleaved mutation. In concurrent mode
    // this can happen all the time, but even in synchronous mode, an earlier
    // effect may have mutated the store.

    if (inst.getSnapshot !== getSnapshot || snapshotChanged || // Check if the susbcribe function changed. We can save some memory by
    // checking whether we scheduled a subscription effect above.
    workInProgressHook !== null && workInProgressHook.memoizedState.tag & HasEffect) {
      fiber.flags |= Passive;
      pushEffect(HasEffect | Passive$1, updateStoreInstance.bind(null, fiber, inst, nextSnapshot, getSnapshot), undefined, null); // Unless we're rendering a blocking lane, schedule a consistency check.
      // Right before committing, we will walk the tree and check if any of the
      // stores were mutated.

      var root = getWorkInProgressRoot();

      if (root === null) {
        throw new Error('Expected a work-in-progress root. This is a bug in React. Please file an issue.');
      }

      if (!includesBlockingLane(root, renderLanes)) {
        pushStoreConsistencyCheck(fiber, getSnapshot, nextSnapshot);
      }
    }

    return nextSnapshot;
  }

  function pushStoreConsistencyCheck(fiber, getSnapshot, renderedSnapshot) {
    fiber.flags |= StoreConsistency;
    var check = {
      getSnapshot: getSnapshot,
      value: renderedSnapshot
    };
    var componentUpdateQueue = currentlyRenderingFiber$1.updateQueue;

    if (componentUpdateQueue === null) {
      componentUpdateQueue = createFunctionComponentUpdateQueue();
      currentlyRenderingFiber$1.updateQueue = componentUpdateQueue;
      componentUpdateQueue.stores = [check];
    } else {
      var stores = componentUpdateQueue.stores;

      if (stores === null) {
        componentUpdateQueue.stores = [check];
      } else {
        stores.push(check);
      }
    }
  }

  function updateStoreInstance(fiber, inst, nextSnapshot, getSnapshot) {
    // These are updated in the passive phase
    inst.value = nextSnapshot;
    inst.getSnapshot = getSnapshot; // Something may have been mutated in between render and commit. This could
    // have been in an event that fired before the passive effects, or it could
    // have been in a layout effect. In that case, we would have used the old
    // snapsho and getSnapshot values to bail out. We need to check one more time.

    if (checkIfSnapshotChanged(inst)) {
      // Force a re-render.
      forceStoreRerender(fiber);
    }
  }

  function subscribeToStore(fiber, inst, subscribe) {
    var handleStoreChange = function () {
      // The store changed. Check if the snapshot changed since the last time we
      // read from the store.
      if (checkIfSnapshotChanged(inst)) {
        // Force a re-render.
        forceStoreRerender(fiber);
      }
    }; // Subscribe to the store and return a clean-up function.


    return subscribe(handleStoreChange);
  }

  function checkIfSnapshotChanged(inst) {
    var latestGetSnapshot = inst.getSnapshot;
    var prevValue = inst.value;

    try {
      var nextValue = latestGetSnapshot();
      return !objectIs(prevValue, nextValue);
    } catch (error) {
      return true;
    }
  }

  function forceStoreRerender(fiber) {
    scheduleUpdateOnFiber(fiber, SyncLane, NoTimestamp);
  }

  function mountState(initialState) {
    var hook = mountWorkInProgressHook();

    if (typeof initialState === 'function') {
      // $FlowFixMe: Flow doesn't like mixed types
      initialState = initialState();
    }

    hook.memoizedState = hook.baseState = initialState;
    var queue = {
      pending: null,
      interleaved: null,
      lanes: NoLanes,
      dispatch: null,
      lastRenderedReducer: basicStateReducer,
      lastRenderedState: initialState
    };
    hook.queue = queue;
    var dispatch = queue.dispatch = dispatchSetState.bind(null, currentlyRenderingFiber$1, queue);
    return [hook.memoizedState, dispatch];
  }

  function updateState(initialState) {
    return updateReducer(basicStateReducer);
  }

  function rerenderState(initialState) {
    return rerenderReducer(basicStateReducer);
  }

  function pushEffect(tag, create, destroy, deps) {
    var effect = {
      tag: tag,
      create: create,
      destroy: destroy,
      deps: deps,
      // Circular
      next: null
    };
    var componentUpdateQueue = currentlyRenderingFiber$1.updateQueue;

    if (componentUpdateQueue === null) {
      componentUpdateQueue = createFunctionComponentUpdateQueue();
      currentlyRenderingFiber$1.updateQueue = componentUpdateQueue;
      componentUpdateQueue.lastEffect = effect.next = effect;
    } else {
      var lastEffect = componentUpdateQueue.lastEffect;

      if (lastEffect === null) {
        componentUpdateQueue.lastEffect = effect.next = effect;
      } else {
        var firstEffect = lastEffect.next;
        lastEffect.next = effect;
        effect.next = firstEffect;
        componentUpdateQueue.lastEffect = effect;
      }
    }

    return effect;
  }

  function mountRef(initialValue) {
    var hook = mountWorkInProgressHook();

    {
      var _ref2 = {
        current: initialValue
      };
      hook.memoizedState = _ref2;
      return _ref2;
    }
  }

  function updateRef(initialValue) {
    var hook = updateWorkInProgressHook();
    return hook.memoizedState;
  }

  function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
    var hook = mountWorkInProgressHook();
    var nextDeps = deps === undefined ? null : deps;
    currentlyRenderingFiber$1.flags |= fiberFlags;
    hook.memoizedState = pushEffect(HasEffect | hookFlags, create, undefined, nextDeps);
  }

  function updateEffectImpl(fiberFlags, hookFlags, create, deps) {
    var hook = updateWorkInProgressHook();
    var nextDeps = deps === undefined ? null : deps;
    var destroy = undefined;

    if (currentHook !== null) {
      var prevEffect = currentHook.memoizedState;
      destroy = prevEffect.destroy;

      if (nextDeps !== null) {
        var prevDeps = prevEffect.deps;

        if (areHookInputsEqual(nextDeps, prevDeps)) {
          hook.memoizedState = pushEffect(hookFlags, create, destroy, nextDeps);
          return;
        }
      }
    }

    currentlyRenderingFiber$1.flags |= fiberFlags;
    hook.memoizedState = pushEffect(HasEffect | hookFlags, create, destroy, nextDeps);
  }

  function mountEffect(create, deps) {
    if ( (currentlyRenderingFiber$1.mode & StrictEffectsMode) !== NoMode) {
      return mountEffectImpl(MountPassiveDev | Passive | PassiveStatic, Passive$1, create, deps);
    } else {
      return mountEffectImpl(Passive | PassiveStatic, Passive$1, create, deps);
    }
  }

  function updateEffect(create, deps) {
    return updateEffectImpl(Passive, Passive$1, create, deps);
  }

  function mountInsertionEffect(create, deps) {
    return mountEffectImpl(Update, Insertion, create, deps);
  }

  function updateInsertionEffect(create, deps) {
    return updateEffectImpl(Update, Insertion, create, deps);
  }

  function mountLayoutEffect(create, deps) {
    var fiberFlags = Update;

    {
      fiberFlags |= LayoutStatic;
    }

    if ( (currentlyRenderingFiber$1.mode & StrictEffectsMode) !== NoMode) {
      fiberFlags |= MountLayoutDev;
    }

    return mountEffectImpl(fiberFlags, Layout, create, deps);
  }

  function updateLayoutEffect(create, deps) {
    return updateEffectImpl(Update, Layout, create, deps);
  }

  function imperativeHandleEffect(create, ref) {
    if (typeof ref === 'function') {
      var refCallback = ref;

      var _inst = create();

      refCallback(_inst);
      return function () {
        refCallback(null);
      };
    } else if (ref !== null && ref !== undefined) {
      var refObject = ref;

      {
        if (!refObject.hasOwnProperty('current')) {
          error('Expected useImperativeHandle() first argument to either be a ' + 'ref callback or React.createRef() object. Instead received: %s.', 'an object with keys {' + Object.keys(refObject).join(', ') + '}');
        }
      }

      var _inst2 = create();

      refObject.current = _inst2;
      return function () {
        refObject.current = null;
      };
    }
  }

  function mountImperativeHandle(ref, create, deps) {
    {
      if (typeof create !== 'function') {
        error('Expected useImperativeHandle() second argument to be a function ' + 'that creates a handle. Instead received: %s.', create !== null ? typeof create : 'null');
      }
    } // TODO: If deps are provided, should we skip comparing the ref itself?


    var effectDeps = deps !== null && deps !== undefined ? deps.concat([ref]) : null;
    var fiberFlags = Update;

    {
      fiberFlags |= LayoutStatic;
    }

    if ( (currentlyRenderingFiber$1.mode & StrictEffectsMode) !== NoMode) {
      fiberFlags |= MountLayoutDev;
    }

    return mountEffectImpl(fiberFlags, Layout, imperativeHandleEffect.bind(null, create, ref), effectDeps);
  }

  function updateImperativeHandle(ref, create, deps) {
    {
      if (typeof create !== 'function') {
        error('Expected useImperativeHandle() second argument to be a function ' + 'that creates a handle. Instead received: %s.', create !== null ? typeof create : 'null');
      }
    } // TODO: If deps are provided, should we skip comparing the ref itself?


    var effectDeps = deps !== null && deps !== undefined ? deps.concat([ref]) : null;
    return updateEffectImpl(Update, Layout, imperativeHandleEffect.bind(null, create, ref), effectDeps);
  }

  function mountDebugValue(value, formatterFn) {// This hook is normally a no-op.
    // The react-debug-hooks package injects its own implementation
    // so that e.g. DevTools can display custom hook values.
  }

  var updateDebugValue = mountDebugValue;

  function mountCallback(callback, deps) {
    var hook = mountWorkInProgressHook();
    var nextDeps = deps === undefined ? null : deps;
    hook.memoizedState = [callback, nextDeps];
    return callback;
  }

  function updateCallback(callback, deps) {
    var hook = updateWorkInProgressHook();
    var nextDeps = deps === undefined ? null : deps;
    var prevState = hook.memoizedState;

    if (prevState !== null) {
      if (nextDeps !== null) {
        var prevDeps = prevState[1];

        if (areHookInputsEqual(nextDeps, prevDeps)) {
          return prevState[0];
        }
      }
    }

    hook.memoizedState = [callback, nextDeps];
    return callback;
  }

  function mountMemo(nextCreate, deps) {
    var hook = mountWorkInProgressHook();
    var nextDeps = deps === undefined ? null : deps;
    var nextValue = nextCreate();
    hook.memoizedState = [nextValue, nextDeps];
    return nextValue;
  }

  function updateMemo(nextCreate, deps) {
    var hook = updateWorkInProgressHook();
    var nextDeps = deps === undefined ? null : deps;
    var prevState = hook.memoizedState;

    if (prevState !== null) {
      // Assume these are defined. If they're not, areHookInputsEqual will warn.
      if (nextDeps !== null) {
        var prevDeps = prevState[1];

        if (areHookInputsEqual(nextDeps, prevDeps)) {
          return prevState[0];
        }
      }
    }

    var nextValue = nextCreate();
    hook.memoizedState = [nextValue, nextDeps];
    return nextValue;
  }

  function mountDeferredValue(value) {
    var hook = mountWorkInProgressHook();
    hook.memoizedState = value;
    return value;
  }

  function updateDeferredValue(value) {
    var hook = updateWorkInProgressHook();
    var resolvedCurrentHook = currentHook;
    var prevValue = resolvedCurrentHook.memoizedState;
    return updateDeferredValueImpl(hook, prevValue, value);
  }

  function rerenderDeferredValue(value) {
    var hook = updateWorkInProgressHook();

    if (currentHook === null) {
      // This is a rerender during a mount.
      hook.memoizedState = value;
      return value;
    } else {
      // This is a rerender during an update.
      var prevValue = currentHook.memoizedState;
      return updateDeferredValueImpl(hook, prevValue, value);
    }
  }

  function updateDeferredValueImpl(hook, prevValue, value) {
    var shouldDeferValue = !includesOnlyNonUrgentLanes(renderLanes);

    if (shouldDeferValue) {
      // This is an urgent update. If the value has changed, keep using the
      // previous value and spawn a deferred render to update it later.
      if (!objectIs(value, prevValue)) {
        // Schedule a deferred render
        var deferredLane = claimNextTransitionLane();
        currentlyRenderingFiber$1.lanes = mergeLanes(currentlyRenderingFiber$1.lanes, deferredLane);
        markSkippedUpdateLanes(deferredLane); // Set this to true to indicate that the rendered value is inconsistent
        // from the latest value. The name "baseState" doesn't really match how we
        // use it because we're reusing a state hook field instead of creating a
        // new one.

        hook.baseState = true;
      } // Reuse the previous value


      return prevValue;
    } else {
      // This is not an urgent update, so we can use the latest value regardless
      // of what it is. No need to defer it.
      // However, if we're currently inside a spawned render, then we need to mark
      // this as an update to prevent the fiber from bailing out.
      //
      // `baseState` is true when the current value is different from the rendered
      // value. The name doesn't really match how we use it because we're reusing
      // a state hook field instead of creating a new one.
      if (hook.baseState) {
        // Flip this back to false.
        hook.baseState = false;
        markWorkInProgressReceivedUpdate();
      }

      hook.memoizedState = value;
      return value;
    }
  }

  function startTransition(setPending, callback, options) {
    var previousPriority = getCurrentUpdatePriority();
    setCurrentUpdatePriority(higherEventPriority(previousPriority, ContinuousEventPriority));
    setPending(true);
    var prevTransition = ReactCurrentBatchConfig$2.transition;
    ReactCurrentBatchConfig$2.transition = {};
    var currentTransition = ReactCurrentBatchConfig$2.transition;

    {
      ReactCurrentBatchConfig$2.transition._updatedFibers = new Set();
    }

    try {
      setPending(false);
      callback();
    } finally {
      setCurrentUpdatePriority(previousPriority);
      ReactCurrentBatchConfig$2.transition = prevTransition;

      {
        if (prevTransition === null && currentTransition._updatedFibers) {
          var updatedFibersCount = currentTransition._updatedFibers.size;

          if (updatedFibersCount > 10) {
            warn('Detected a large number of updates inside startTransition. ' + 'If this is due to a subscription please re-write it to use React provided hooks. ' + 'Otherwise concurrent mode guarantees are off the table.');
          }

          currentTransition._updatedFibers.clear();
        }
      }
    }
  }

  function mountTransition() {
    var _mountState = mountState(false),
        isPending = _mountState[0],
        setPending = _mountState[1]; // The `start` method never changes.


    var start = startTransition.bind(null, setPending);
    var hook = mountWorkInProgressHook();
    hook.memoizedState = start;
    return [isPending, start];
  }

  function updateTransition() {
    var _updateState = updateState(),
        isPending = _updateState[0];

    var hook = updateWorkInProgressHook();
    var start = hook.memoizedState;
    return [isPending, start];
  }

  function rerenderTransition() {
    var _rerenderState = rerenderState(),
        isPending = _rerenderState[0];

    var hook = updateWorkInProgressHook();
    var start = hook.memoizedState;
    return [isPending, start];
  }

  var isUpdatingOpaqueValueInRenderPhase = false;
  function getIsUpdatingOpaqueValueInRenderPhaseInDEV() {
    {
      return isUpdatingOpaqueValueInRenderPhase;
    }
  }

  function mountId() {
    var hook = mountWorkInProgressHook();
    var root = getWorkInProgressRoot(); // TODO: In Fizz, id generation is specific to each server config. Maybe we
    // should do this in Fiber, too? Deferring this decision for now because
    // there's no other place to store the prefix except for an internal field on
    // the public createRoot object, which the fiber tree does not currently have
    // a reference to.

    var identifierPrefix = root.identifierPrefix;
    var id;

    if (getIsHydrating()) {
      var treeId = getTreeId(); // Use a captial R prefix for server-generated ids.

      id = ':' + identifierPrefix + 'R' + treeId; // Unless this is the first id at this level, append a number at the end
      // that represents the position of this useId hook among all the useId
      // hooks for this fiber.

      var localId = localIdCounter++;

      if (localId > 0) {
        id += 'H' + localId.toString(32);
      }

      id += ':';
    } else {
      // Use a lowercase r prefix for client-generated ids.
      var globalClientId = globalClientIdCounter++;
      id = ':' + identifierPrefix + 'r' + globalClientId.toString(32) + ':';
    }

    hook.memoizedState = id;
    return id;
  }

  function updateId() {
    var hook = updateWorkInProgressHook();
    var id = hook.memoizedState;
    return id;
  }

  function mountRefresh() {
    var hook = mountWorkInProgressHook();
    var refresh = hook.memoizedState = refreshCache.bind(null, currentlyRenderingFiber$1);
    return refresh;
  }

  function updateRefresh() {
    var hook = updateWorkInProgressHook();
    return hook.memoizedState;
  }

  function refreshCache(fiber, seedKey, seedValue) {
    // TODO: Consider warning if the refresh is at discrete priority, or if we
    // otherwise suspect that it wasn't batched properly.


    var provider = fiber.return;

    while (provider !== null) {
      switch (provider.tag) {
        case CacheComponent:
        case HostRoot:
          {
            var lane = requestUpdateLane(provider);
            var eventTime = requestEventTime();
            var root = scheduleUpdateOnFiber(provider, lane, eventTime);

            if (root !== null) {
              entangleTransitions(root, provider, lane);
            } // TODO: If a refresh never commits, the new cache created here must be
            // released. A simple case is start refreshing a cache boundary, but then
            // unmount that boundary before the refresh completes.


            var seededCache = createCache();

            if (seedKey !== null && seedKey !== undefined && root !== null) {
              // Seed the cache with the value passed by the caller. This could be
              // from a server mutation, or it could be a streaming response.
              seededCache.data.set(seedKey, seedValue);
            } // Schedule an update on the cache boundary to trigger a refresh.


            var refreshUpdate = createUpdate(eventTime, lane);
            var payload = {
              cache: seededCache
            };
            refreshUpdate.payload = payload;
            enqueueUpdate(provider, refreshUpdate);
            return;
          }
      }

      provider = provider.return;
    } // TODO: Warn if unmounted?

  }

  function dispatchReducerAction(fiber, queue, action) {
    {
      if (typeof arguments[3] === 'function') {
        error("State updates from the useState() and useReducer() Hooks don't support the " + 'second callback argument. To execute a side effect after ' + 'rendering, declare it in the component body with useEffect().');
      }
    }

    var lane = requestUpdateLane(fiber);
    var update = {
      lane: lane,
      action: action,
      hasEagerState: false,
      eagerState: null,
      next: null
    };

    if (isRenderPhaseUpdate(fiber)) {
      enqueueRenderPhaseUpdate(queue, update);
    } else {
      enqueueUpdate$1(fiber, queue, update);
      var eventTime = requestEventTime();
      var root = scheduleUpdateOnFiber(fiber, lane, eventTime);

      if (root !== null) {
        entangleTransitionUpdate(root, queue, lane);
      }
    }

    markUpdateInDevTools(fiber, lane);
  }

  function dispatchSetState(fiber, queue, action) {
    {
      if (typeof arguments[3] === 'function') {
        error("State updates from the useState() and useReducer() Hooks don't support the " + 'second callback argument. To execute a side effect after ' + 'rendering, declare it in the component body with useEffect().');
      }
    }

    var lane = requestUpdateLane(fiber);
    var update = {
      lane: lane,
      action: action,
      hasEagerState: false,
      eagerState: null,
      next: null
    };

    if (isRenderPhaseUpdate(fiber)) {
      enqueueRenderPhaseUpdate(queue, update);
    } else {
      enqueueUpdate$1(fiber, queue, update);
      var alternate = fiber.alternate;

      if (fiber.lanes === NoLanes && (alternate === null || alternate.lanes === NoLanes)) {
        // The queue is currently empty, which means we can eagerly compute the
        // next state before entering the render phase. If the new state is the
        // same as the current state, we may be able to bail out entirely.
        var lastRenderedReducer = queue.lastRenderedReducer;

        if (lastRenderedReducer !== null) {
          var prevDispatcher;

          {
            prevDispatcher = ReactCurrentDispatcher$1.current;
            ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnUpdateInDEV;
          }

          try {
            var currentState = queue.lastRenderedState;
            var eagerState = lastRenderedReducer(currentState, action); // Stash the eagerly computed state, and the reducer used to compute
            // it, on the update object. If the reducer hasn't changed by the
            // time we enter the render phase, then the eager state can be used
            // without calling the reducer again.

            update.hasEagerState = true;
            update.eagerState = eagerState;

            if (objectIs(eagerState, currentState)) {
              // Fast path. We can bail out without scheduling React to re-render.
              // It's still possible that we'll need to rebase this update later,
              // if the component re-renders for a different reason and by that
              // time the reducer has changed.
              return;
            }
          } catch (error) {// Suppress the error. It will throw again in the render phase.
          } finally {
            {
              ReactCurrentDispatcher$1.current = prevDispatcher;
            }
          }
        }
      }

      var eventTime = requestEventTime();
      var root = scheduleUpdateOnFiber(fiber, lane, eventTime);

      if (root !== null) {
        entangleTransitionUpdate(root, queue, lane);
      }
    }

    markUpdateInDevTools(fiber, lane);
  }

  function isRenderPhaseUpdate(fiber) {
    var alternate = fiber.alternate;
    return fiber === currentlyRenderingFiber$1 || alternate !== null && alternate === currentlyRenderingFiber$1;
  }

  function enqueueRenderPhaseUpdate(queue, update) {
    // This is a render phase update. Stash it in a lazily-created map of
    // queue -> linked list of updates. After this render pass, we'll restart
    // and apply the stashed updates on top of the work-in-progress hook.
    didScheduleRenderPhaseUpdateDuringThisPass = didScheduleRenderPhaseUpdate = true;
    var pending = queue.pending;

    if (pending === null) {
      // This is the first update. Create a circular list.
      update.next = update;
    } else {
      update.next = pending.next;
      pending.next = update;
    }

    queue.pending = update;
  }

  function enqueueUpdate$1(fiber, queue, update, lane) {
    if (isInterleavedUpdate(fiber)) {
      var interleaved = queue.interleaved;

      if (interleaved === null) {
        // This is the first update. Create a circular list.
        update.next = update; // At the end of the current render, this queue's interleaved updates will
        // be transferred to the pending queue.

        pushInterleavedQueue(queue);
      } else {
        update.next = interleaved.next;
        interleaved.next = update;
      }

      queue.interleaved = update;
    } else {
      var pending = queue.pending;

      if (pending === null) {
        // This is the first update. Create a circular list.
        update.next = update;
      } else {
        update.next = pending.next;
        pending.next = update;
      }

      queue.pending = update;
    }
  }

  function entangleTransitionUpdate(root, queue, lane) {
    if (isTransitionLane(lane)) {
      var queueLanes = queue.lanes; // If any entangled lanes are no longer pending on the root, then they
      // must have finished. We can remove them from the shared queue, which
      // represents a superset of the actually pending lanes. In some cases we
      // may entangle more than we need to, but that's OK. In fact it's worse if
      // we *don't* entangle when we should.

      queueLanes = intersectLanes(queueLanes, root.pendingLanes); // Entangle the new transition lane with the other transition lanes.

      var newQueueLanes = mergeLanes(queueLanes, lane);
      queue.lanes = newQueueLanes; // Even if queue.lanes already include lane, we don't know for certain if
      // the lane finished since the last time we entangled it. So we need to
      // entangle it again, just to be sure.

      markRootEntangled(root, newQueueLanes);
    }
  }

  function markUpdateInDevTools(fiber, lane, action) {

    {
      markStateUpdateScheduled(fiber, lane);
    }
  }

  function getCacheSignal() {

    var cache = readContext(CacheContext);
    return cache.controller.signal;
  }

  function getCacheForType(resourceType) {

    var cache = readContext(CacheContext);
    var cacheForType = cache.data.get(resourceType);

    if (cacheForType === undefined) {
      cacheForType = resourceType();
      cache.data.set(resourceType, cacheForType);
    }

    return cacheForType;
  }

  var ContextOnlyDispatcher = {
    readContext: readContext,
    useCallback: throwInvalidHookError,
    useContext: throwInvalidHookError,
    useEffect: throwInvalidHookError,
    useImperativeHandle: throwInvalidHookError,
    useInsertionEffect: throwInvalidHookError,
    useLayoutEffect: throwInvalidHookError,
    useMemo: throwInvalidHookError,
    useReducer: throwInvalidHookError,
    useRef: throwInvalidHookError,
    useState: throwInvalidHookError,
    useDebugValue: throwInvalidHookError,
    useDeferredValue: throwInvalidHookError,
    useTransition: throwInvalidHookError,
    useMutableSource: throwInvalidHookError,
    useSyncExternalStore: throwInvalidHookError,
    useId: throwInvalidHookError,
    unstable_isNewReconciler: enableNewReconciler
  };

  {
    ContextOnlyDispatcher.getCacheSignal = getCacheSignal;
    ContextOnlyDispatcher.getCacheForType = getCacheForType;
    ContextOnlyDispatcher.useCacheRefresh = throwInvalidHookError;
  }

  var HooksDispatcherOnMountInDEV = null;
  var HooksDispatcherOnMountWithHookTypesInDEV = null;
  var HooksDispatcherOnUpdateInDEV = null;
  var HooksDispatcherOnRerenderInDEV = null;
  var InvalidNestedHooksDispatcherOnMountInDEV = null;
  var InvalidNestedHooksDispatcherOnUpdateInDEV = null;
  var InvalidNestedHooksDispatcherOnRerenderInDEV = null;

  {
    var warnInvalidContextAccess = function () {
      error('Context can only be read while React is rendering. ' + 'In classes, you can read it in the render method or getDerivedStateFromProps. ' + 'In function components, you can read it directly in the function body, but not ' + 'inside Hooks like useReducer() or useMemo().');
    };

    var warnInvalidHookAccess = function () {
      error('Do not call Hooks inside useEffect(...), useMemo(...), or other built-in Hooks. ' + 'You can only call Hooks at the top level of your React function. ' + 'For more information, see ' + 'https://reactjs.org/link/rules-of-hooks');
    };

    HooksDispatcherOnMountInDEV = {
      readContext: function (context) {
        return readContext(context);
      },
      useCallback: function (callback, deps) {
        currentHookNameInDev = 'useCallback';
        mountHookTypesDev();
        checkDepsAreArrayDev(deps);
        return mountCallback(callback, deps);
      },
      useContext: function (context) {
        currentHookNameInDev = 'useContext';
        mountHookTypesDev();
        return readContext(context);
      },
      useEffect: function (create, deps) {
        currentHookNameInDev = 'useEffect';
        mountHookTypesDev();
        checkDepsAreArrayDev(deps);
        return mountEffect(create, deps);
      },
      useImperativeHandle: function (ref, create, deps) {
        currentHookNameInDev = 'useImperativeHandle';
        mountHookTypesDev();
        checkDepsAreArrayDev(deps);
        return mountImperativeHandle(ref, create, deps);
      },
      useInsertionEffect: function (create, deps) {
        currentHookNameInDev = 'useInsertionEffect';
        mountHookTypesDev();
        checkDepsAreArrayDev(deps);
        return mountInsertionEffect(create, deps);
      },
      useLayoutEffect: function (create, deps) {
        currentHookNameInDev = 'useLayoutEffect';
        mountHookTypesDev();
        checkDepsAreArrayDev(deps);
        return mountLayoutEffect(create, deps);
      },
      useMemo: function (create, deps) {
        currentHookNameInDev = 'useMemo';
        mountHookTypesDev();
        checkDepsAreArrayDev(deps);
        var prevDispatcher = ReactCurrentDispatcher$1.current;
        ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnMountInDEV;

        try {
          return mountMemo(create, deps);
        } finally {
          ReactCurrentDispatcher$1.current = prevDispatcher;
        }
      },
      useReducer: function (reducer, initialArg, init) {
        currentHookNameInDev = 'useReducer';
        mountHookTypesDev();
        var prevDispatcher = ReactCurrentDispatcher$1.current;
        ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnMountInDEV;

        try {
          return mountReducer(reducer, initialArg, init);
        } finally {
          ReactCurrentDispatcher$1.current = prevDispatcher;
        }
      },
      useRef: function (initialValue) {
        currentHookNameInDev = 'useRef';
        mountHookTypesDev();
        return mountRef(initialValue);
      },
      useState: function (initialState) {
        currentHookNameInDev = 'useState';
        mountHookTypesDev();
        var prevDispatcher = ReactCurrentDispatcher$1.current;
        ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnMountInDEV;

        try {
          return mountState(initialState);
        } finally {
          ReactCurrentDispatcher$1.current = prevDispatcher;
        }
      },
      useDebugValue: function (value, formatterFn) {
        currentHookNameInDev = 'useDebugValue';
        mountHookTypesDev();
        return mountDebugValue();
      },
      useDeferredValue: function (value) {
        currentHookNameInDev = 'useDeferredValue';
        mountHookTypesDev();
        return mountDeferredValue(value);
      },
      useTransition: function () {
        currentHookNameInDev = 'useTransition';
        mountHookTypesDev();
        return mountTransition();
      },
      useMutableSource: function (source, getSnapshot, subscribe) {
        currentHookNameInDev = 'useMutableSource';
        mountHookTypesDev();
        return mountMutableSource();
      },
      useSyncExternalStore: function (subscribe, getSnapshot, getServerSnapshot) {
        currentHookNameInDev = 'useSyncExternalStore';
        mountHookTypesDev();
        return mountSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
      },
      useId: function () {
        currentHookNameInDev = 'useId';
        mountHookTypesDev();
        return mountId();
      },
      unstable_isNewReconciler: enableNewReconciler
    };

    {
      HooksDispatcherOnMountInDEV.getCacheSignal = getCacheSignal;
      HooksDispatcherOnMountInDEV.getCacheForType = getCacheForType;

      HooksDispatcherOnMountInDEV.useCacheRefresh = function useCacheRefresh() {
        currentHookNameInDev = 'useCacheRefresh';
        mountHookTypesDev();
        return mountRefresh();
      };
    }

    HooksDispatcherOnMountWithHookTypesInDEV = {
      readContext: function (context) {
        return readContext(context);
      },
      useCallback: function (callback, deps) {
        currentHookNameInDev = 'useCallback';
        updateHookTypesDev();
        return mountCallback(callback, deps);
      },
      useContext: function (context) {
        currentHookNameInDev = 'useContext';
        updateHookTypesDev();
        return readContext(context);
      },
      useEffect: function (create, deps) {
        currentHookNameInDev = 'useEffect';
        updateHookTypesDev();
        return mountEffect(create, deps);
      },
      useImperativeHandle: function (ref, create, deps) {
        currentHookNameInDev = 'useImperativeHandle';
        updateHookTypesDev();
        return mountImperativeHandle(ref, create, deps);
      },
      useInsertionEffect: function (create, deps) {
        currentHookNameInDev = 'useInsertionEffect';
        updateHookTypesDev();
        return mountInsertionEffect(create, deps);
      },
      useLayoutEffect: function (create, deps) {
        currentHookNameInDev = 'useLayoutEffect';
        updateHookTypesDev();
        return mountLayoutEffect(create, deps);
      },
      useMemo: function (create, deps) {
        currentHookNameInDev = 'useMemo';
        updateHookTypesDev();
        var prevDispatcher = ReactCurrentDispatcher$1.current;
        ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnMountInDEV;

        try {
          return mountMemo(create, deps);
        } finally {
          ReactCurrentDispatcher$1.current = prevDispatcher;
        }
      },
      useReducer: function (reducer, initialArg, init) {
        currentHookNameInDev = 'useReducer';
        updateHookTypesDev();
        var prevDispatcher = ReactCurrentDispatcher$1.current;
        ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnMountInDEV;

        try {
          return mountReducer(reducer, initialArg, init);
        } finally {
          ReactCurrentDispatcher$1.current = prevDispatcher;
        }
      },
      useRef: function (initialValue) {
        currentHookNameInDev = 'useRef';
        updateHookTypesDev();
        return mountRef(initialValue);
      },
      useState: function (initialState) {
        currentHookNameInDev = 'useState';
        updateHookTypesDev();
        var prevDispatcher = ReactCurrentDispatcher$1.current;
        ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnMountInDEV;

        try {
          return mountState(initialState);
        } finally {
          ReactCurrentDispatcher$1.current = prevDispatcher;
        }
      },
      useDebugValue: function (value, formatterFn) {
        currentHookNameInDev = 'useDebugValue';
        updateHookTypesDev();
        return mountDebugValue();
      },
      useDeferredValue: function (value) {
        currentHookNameInDev = 'useDeferredValue';
        updateHookTypesDev();
        return mountDeferredValue(value);
      },
      useTransition: function () {
        currentHookNameInDev = 'useTransition';
        updateHookTypesDev();
        return mountTransition();
      },
      useMutableSource: function (source, getSnapshot, subscribe) {
        currentHookNameInDev = 'useMutableSource';
        updateHookTypesDev();
        return mountMutableSource();
      },
      useSyncExternalStore: function (subscribe, getSnapshot, getServerSnapshot) {
        currentHookNameInDev = 'useSyncExternalStore';
        updateHookTypesDev();
        return mountSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
      },
      useId: function () {
        currentHookNameInDev = 'useId';
        updateHookTypesDev();
        return mountId();
      },
      unstable_isNewReconciler: enableNewReconciler
    };

    {
      HooksDispatcherOnMountWithHookTypesInDEV.getCacheSignal = getCacheSignal;
      HooksDispatcherOnMountWithHookTypesInDEV.getCacheForType = getCacheForType;

      HooksDispatcherOnMountWithHookTypesInDEV.useCacheRefresh = function useCacheRefresh() {
        currentHookNameInDev = 'useCacheRefresh';
        updateHookTypesDev();
        return mountRefresh();
      };
    }

    HooksDispatcherOnUpdateInDEV = {
      readContext: function (context) {
        return readContext(context);
      },
      useCallback: function (callback, deps) {
        currentHookNameInDev = 'useCallback';
        updateHookTypesDev();
        return updateCallback(callback, deps);
      },
      useContext: function (context) {
        currentHookNameInDev = 'useContext';
        updateHookTypesDev();
        return readContext(context);
      },
      useEffect: function (create, deps) {
        currentHookNameInDev = 'useEffect';
        updateHookTypesDev();
        return updateEffect(create, deps);
      },
      useImperativeHandle: function (ref, create, deps) {
        currentHookNameInDev = 'useImperativeHandle';
        updateHookTypesDev();
        return updateImperativeHandle(ref, create, deps);
      },
      useInsertionEffect: function (create, deps) {
        currentHookNameInDev = 'useInsertionEffect';
        updateHookTypesDev();
        return updateInsertionEffect(create, deps);
      },
      useLayoutEffect: function (create, deps) {
        currentHookNameInDev = 'useLayoutEffect';
        updateHookTypesDev();
        return updateLayoutEffect(create, deps);
      },
      useMemo: function (create, deps) {
        currentHookNameInDev = 'useMemo';
        updateHookTypesDev();
        var prevDispatcher = ReactCurrentDispatcher$1.current;
        ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnUpdateInDEV;

        try {
          return updateMemo(create, deps);
        } finally {
          ReactCurrentDispatcher$1.current = prevDispatcher;
        }
      },
      useReducer: function (reducer, initialArg, init) {
        currentHookNameInDev = 'useReducer';
        updateHookTypesDev();
        var prevDispatcher = ReactCurrentDispatcher$1.current;
        ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnUpdateInDEV;

        try {
          return updateReducer(reducer, initialArg, init);
        } finally {
          ReactCurrentDispatcher$1.current = prevDispatcher;
        }
      },
      useRef: function (initialValue) {
        currentHookNameInDev = 'useRef';
        updateHookTypesDev();
        return updateRef();
      },
      useState: function (initialState) {
        currentHookNameInDev = 'useState';
        updateHookTypesDev();
        var prevDispatcher = ReactCurrentDispatcher$1.current;
        ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnUpdateInDEV;

        try {
          return updateState(initialState);
        } finally {
          ReactCurrentDispatcher$1.current = prevDispatcher;
        }
      },
      useDebugValue: function (value, formatterFn) {
        currentHookNameInDev = 'useDebugValue';
        updateHookTypesDev();
        return updateDebugValue();
      },
      useDeferredValue: function (value) {
        currentHookNameInDev = 'useDeferredValue';
        updateHookTypesDev();
        return updateDeferredValue(value);
      },
      useTransition: function () {
        currentHookNameInDev = 'useTransition';
        updateHookTypesDev();
        return updateTransition();
      },
      useMutableSource: function (source, getSnapshot, subscribe) {
        currentHookNameInDev = 'useMutableSource';
        updateHookTypesDev();
        return updateMutableSource();
      },
      useSyncExternalStore: function (subscribe, getSnapshot, getServerSnapshot) {
        currentHookNameInDev = 'useSyncExternalStore';
        updateHookTypesDev();
        return updateSyncExternalStore(subscribe, getSnapshot);
      },
      useId: function () {
        currentHookNameInDev = 'useId';
        updateHookTypesDev();
        return updateId();
      },
      unstable_isNewReconciler: enableNewReconciler
    };

    {
      HooksDispatcherOnUpdateInDEV.getCacheSignal = getCacheSignal;
      HooksDispatcherOnUpdateInDEV.getCacheForType = getCacheForType;

      HooksDispatcherOnUpdateInDEV.useCacheRefresh = function useCacheRefresh() {
        currentHookNameInDev = 'useCacheRefresh';
        updateHookTypesDev();
        return updateRefresh();
      };
    }

    HooksDispatcherOnRerenderInDEV = {
      readContext: function (context) {
        return readContext(context);
      },
      useCallback: function (callback, deps) {
        currentHookNameInDev = 'useCallback';
        updateHookTypesDev();
        return updateCallback(callback, deps);
      },
      useContext: function (context) {
        currentHookNameInDev = 'useContext';
        updateHookTypesDev();
        return readContext(context);
      },
      useEffect: function (create, deps) {
        currentHookNameInDev = 'useEffect';
        updateHookTypesDev();
        return updateEffect(create, deps);
      },
      useImperativeHandle: function (ref, create, deps) {
        currentHookNameInDev = 'useImperativeHandle';
        updateHookTypesDev();
        return updateImperativeHandle(ref, create, deps);
      },
      useInsertionEffect: function (create, deps) {
        currentHookNameInDev = 'useInsertionEffect';
        updateHookTypesDev();
        return updateInsertionEffect(create, deps);
      },
      useLayoutEffect: function (create, deps) {
        currentHookNameInDev = 'useLayoutEffect';
        updateHookTypesDev();
        return updateLayoutEffect(create, deps);
      },
      useMemo: function (create, deps) {
        currentHookNameInDev = 'useMemo';
        updateHookTypesDev();
        var prevDispatcher = ReactCurrentDispatcher$1.current;
        ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnRerenderInDEV;

        try {
          return updateMemo(create, deps);
        } finally {
          ReactCurrentDispatcher$1.current = prevDispatcher;
        }
      },
      useReducer: function (reducer, initialArg, init) {
        currentHookNameInDev = 'useReducer';
        updateHookTypesDev();
        var prevDispatcher = ReactCurrentDispatcher$1.current;
        ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnRerenderInDEV;

        try {
          return rerenderReducer(reducer, initialArg, init);
        } finally {
          ReactCurrentDispatcher$1.current = prevDispatcher;
        }
      },
      useRef: function (initialValue) {
        currentHookNameInDev = 'useRef';
        updateHookTypesDev();
        return updateRef();
      },
      useState: function (initialState) {
        currentHookNameInDev = 'useState';
        updateHookTypesDev();
        var prevDispatcher = ReactCurrentDispatcher$1.current;
        ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnRerenderInDEV;

        try {
          return rerenderState(initialState);
        } finally {
          ReactCurrentDispatcher$1.current = prevDispatcher;
        }
      },
      useDebugValue: function (value, formatterFn) {
        currentHookNameInDev = 'useDebugValue';
        updateHookTypesDev();
        return updateDebugValue();
      },
      useDeferredValue: function (value) {
        currentHookNameInDev = 'useDeferredValue';
        updateHookTypesDev();
        return rerenderDeferredValue(value);
      },
      useTransition: function () {
        currentHookNameInDev = 'useTransition';
        updateHookTypesDev();
        return rerenderTransition();
      },
      useMutableSource: function (source, getSnapshot, subscribe) {
        currentHookNameInDev = 'useMutableSource';
        updateHookTypesDev();
        return updateMutableSource();
      },
      useSyncExternalStore: function (subscribe, getSnapshot, getServerSnapshot) {
        currentHookNameInDev = 'useSyncExternalStore';
        updateHookTypesDev();
        return updateSyncExternalStore(subscribe, getSnapshot);
      },
      useId: function () {
        currentHookNameInDev = 'useId';
        updateHookTypesDev();
        return updateId();
      },
      unstable_isNewReconciler: enableNewReconciler
    };

    {
      HooksDispatcherOnRerenderInDEV.getCacheSignal = getCacheSignal;
      HooksDispatcherOnRerenderInDEV.getCacheForType = getCacheForType;

      HooksDispatcherOnRerenderInDEV.useCacheRefresh = function useCacheRefresh() {
        currentHookNameInDev = 'useCacheRefresh';
        updateHookTypesDev();
        return updateRefresh();
      };
    }

    InvalidNestedHooksDispatcherOnMountInDEV = {
      readContext: function (context) {
        warnInvalidContextAccess();
        return readContext(context);
      },
      useCallback: function (callback, deps) {
        currentHookNameInDev = 'useCallback';
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountCallback(callback, deps);
      },
      useContext: function (context) {
        currentHookNameInDev = 'useContext';
        warnInvalidHookAccess();
        mountHookTypesDev();
        return readContext(context);
      },
      useEffect: function (create, deps) {
        currentHookNameInDev = 'useEffect';
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountEffect(create, deps);
      },
      useImperativeHandle: function (ref, create, deps) {
        currentHookNameInDev = 'useImperativeHandle';
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountImperativeHandle(ref, create, deps);
      },
      useInsertionEffect: function (create, deps) {
        currentHookNameInDev = 'useInsertionEffect';
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountInsertionEffect(create, deps);
      },
      useLayoutEffect: function (create, deps) {
        currentHookNameInDev = 'useLayoutEffect';
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountLayoutEffect(create, deps);
      },
      useMemo: function (create, deps) {
        currentHookNameInDev = 'useMemo';
        warnInvalidHookAccess();
        mountHookTypesDev();
        var prevDispatcher = ReactCurrentDispatcher$1.current;
        ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnMountInDEV;

        try {
          return mountMemo(create, deps);
        } finally {
          ReactCurrentDispatcher$1.current = prevDispatcher;
        }
      },
      useReducer: function (reducer, initialArg, init) {
        currentHookNameInDev = 'useReducer';
        warnInvalidHookAccess();
        mountHookTypesDev();
        var prevDispatcher = ReactCurrentDispatcher$1.current;
        ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnMountInDEV;

        try {
          return mountReducer(reducer, initialArg, init);
        } finally {
          ReactCurrentDispatcher$1.current = prevDispatcher;
        }
      },
      useRef: function (initialValue) {
        currentHookNameInDev = 'useRef';
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountRef(initialValue);
      },
      useState: function (initialState) {
        currentHookNameInDev = 'useState';
        warnInvalidHookAccess();
        mountHookTypesDev();
        var prevDispatcher = ReactCurrentDispatcher$1.current;
        ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnMountInDEV;

        try {
          return mountState(initialState);
        } finally {
          ReactCurrentDispatcher$1.current = prevDispatcher;
        }
      },
      useDebugValue: function (value, formatterFn) {
        currentHookNameInDev = 'useDebugValue';
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountDebugValue();
      },
      useDeferredValue: function (value) {
        currentHookNameInDev = 'useDeferredValue';
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountDeferredValue(value);
      },
      useTransition: function () {
        currentHookNameInDev = 'useTransition';
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountTransition();
      },
      useMutableSource: function (source, getSnapshot, subscribe) {
        currentHookNameInDev = 'useMutableSource';
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountMutableSource();
      },
      useSyncExternalStore: function (subscribe, getSnapshot, getServerSnapshot) {
        currentHookNameInDev = 'useSyncExternalStore';
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
      },
      useId: function () {
        currentHookNameInDev = 'useId';
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountId();
      },
      unstable_isNewReconciler: enableNewReconciler
    };

    {
      InvalidNestedHooksDispatcherOnMountInDEV.getCacheSignal = getCacheSignal;
      InvalidNestedHooksDispatcherOnMountInDEV.getCacheForType = getCacheForType;

      InvalidNestedHooksDispatcherOnMountInDEV.useCacheRefresh = function useCacheRefresh() {
        currentHookNameInDev = 'useCacheRefresh';
        mountHookTypesDev();
        return mountRefresh();
      };
    }

    InvalidNestedHooksDispatcherOnUpdateInDEV = {
      readContext: function (context) {
        warnInvalidContextAccess();
        return readContext(context);
      },
      useCallback: function (callback, deps) {
        currentHookNameInDev = 'useCallback';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateCallback(callback, deps);
      },
      useContext: function (context) {
        currentHookNameInDev = 'useContext';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return readContext(context);
      },
      useEffect: function (create, deps) {
        currentHookNameInDev = 'useEffect';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateEffect(create, deps);
      },
      useImperativeHandle: function (ref, create, deps) {
        currentHookNameInDev = 'useImperativeHandle';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateImperativeHandle(ref, create, deps);
      },
      useInsertionEffect: function (create, deps) {
        currentHookNameInDev = 'useInsertionEffect';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateInsertionEffect(create, deps);
      },
      useLayoutEffect: function (create, deps) {
        currentHookNameInDev = 'useLayoutEffect';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateLayoutEffect(create, deps);
      },
      useMemo: function (create, deps) {
        currentHookNameInDev = 'useMemo';
        warnInvalidHookAccess();
        updateHookTypesDev();
        var prevDispatcher = ReactCurrentDispatcher$1.current;
        ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnUpdateInDEV;

        try {
          return updateMemo(create, deps);
        } finally {
          ReactCurrentDispatcher$1.current = prevDispatcher;
        }
      },
      useReducer: function (reducer, initialArg, init) {
        currentHookNameInDev = 'useReducer';
        warnInvalidHookAccess();
        updateHookTypesDev();
        var prevDispatcher = ReactCurrentDispatcher$1.current;
        ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnUpdateInDEV;

        try {
          return updateReducer(reducer, initialArg, init);
        } finally {
          ReactCurrentDispatcher$1.current = prevDispatcher;
        }
      },
      useRef: function (initialValue) {
        currentHookNameInDev = 'useRef';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateRef();
      },
      useState: function (initialState) {
        currentHookNameInDev = 'useState';
        warnInvalidHookAccess();
        updateHookTypesDev();
        var prevDispatcher = ReactCurrentDispatcher$1.current;
        ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnUpdateInDEV;

        try {
          return updateState(initialState);
        } finally {
          ReactCurrentDispatcher$1.current = prevDispatcher;
        }
      },
      useDebugValue: function (value, formatterFn) {
        currentHookNameInDev = 'useDebugValue';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateDebugValue();
      },
      useDeferredValue: function (value) {
        currentHookNameInDev = 'useDeferredValue';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateDeferredValue(value);
      },
      useTransition: function () {
        currentHookNameInDev = 'useTransition';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateTransition();
      },
      useMutableSource: function (source, getSnapshot, subscribe) {
        currentHookNameInDev = 'useMutableSource';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateMutableSource();
      },
      useSyncExternalStore: function (subscribe, getSnapshot, getServerSnapshot) {
        currentHookNameInDev = 'useSyncExternalStore';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateSyncExternalStore(subscribe, getSnapshot);
      },
      useId: function () {
        currentHookNameInDev = 'useId';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateId();
      },
      unstable_isNewReconciler: enableNewReconciler
    };

    {
      InvalidNestedHooksDispatcherOnUpdateInDEV.getCacheSignal = getCacheSignal;
      InvalidNestedHooksDispatcherOnUpdateInDEV.getCacheForType = getCacheForType;

      InvalidNestedHooksDispatcherOnUpdateInDEV.useCacheRefresh = function useCacheRefresh() {
        currentHookNameInDev = 'useCacheRefresh';
        updateHookTypesDev();
        return updateRefresh();
      };
    }

    InvalidNestedHooksDispatcherOnRerenderInDEV = {
      readContext: function (context) {
        warnInvalidContextAccess();
        return readContext(context);
      },
      useCallback: function (callback, deps) {
        currentHookNameInDev = 'useCallback';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateCallback(callback, deps);
      },
      useContext: function (context) {
        currentHookNameInDev = 'useContext';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return readContext(context);
      },
      useEffect: function (create, deps) {
        currentHookNameInDev = 'useEffect';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateEffect(create, deps);
      },
      useImperativeHandle: function (ref, create, deps) {
        currentHookNameInDev = 'useImperativeHandle';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateImperativeHandle(ref, create, deps);
      },
      useInsertionEffect: function (create, deps) {
        currentHookNameInDev = 'useInsertionEffect';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateInsertionEffect(create, deps);
      },
      useLayoutEffect: function (create, deps) {
        currentHookNameInDev = 'useLayoutEffect';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateLayoutEffect(create, deps);
      },
      useMemo: function (create, deps) {
        currentHookNameInDev = 'useMemo';
        warnInvalidHookAccess();
        updateHookTypesDev();
        var prevDispatcher = ReactCurrentDispatcher$1.current;
        ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnUpdateInDEV;

        try {
          return updateMemo(create, deps);
        } finally {
          ReactCurrentDispatcher$1.current = prevDispatcher;
        }
      },
      useReducer: function (reducer, initialArg, init) {
        currentHookNameInDev = 'useReducer';
        warnInvalidHookAccess();
        updateHookTypesDev();
        var prevDispatcher = ReactCurrentDispatcher$1.current;
        ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnUpdateInDEV;

        try {
          return rerenderReducer(reducer, initialArg, init);
        } finally {
          ReactCurrentDispatcher$1.current = prevDispatcher;
        }
      },
      useRef: function (initialValue) {
        currentHookNameInDev = 'useRef';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateRef();
      },
      useState: function (initialState) {
        currentHookNameInDev = 'useState';
        warnInvalidHookAccess();
        updateHookTypesDev();
        var prevDispatcher = ReactCurrentDispatcher$1.current;
        ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnUpdateInDEV;

        try {
          return rerenderState(initialState);
        } finally {
          ReactCurrentDispatcher$1.current = prevDispatcher;
        }
      },
      useDebugValue: function (value, formatterFn) {
        currentHookNameInDev = 'useDebugValue';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateDebugValue();
      },
      useDeferredValue: function (value) {
        currentHookNameInDev = 'useDeferredValue';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return rerenderDeferredValue(value);
      },
      useTransition: function () {
        currentHookNameInDev = 'useTransition';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return rerenderTransition();
      },
      useMutableSource: function (source, getSnapshot, subscribe) {
        currentHookNameInDev = 'useMutableSource';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateMutableSource();
      },
      useSyncExternalStore: function (subscribe, getSnapshot, getServerSnapshot) {
        currentHookNameInDev = 'useSyncExternalStore';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateSyncExternalStore(subscribe, getSnapshot);
      },
      useId: function () {
        currentHookNameInDev = 'useId';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateId();
      },
      unstable_isNewReconciler: enableNewReconciler
    };

    {
      InvalidNestedHooksDispatcherOnRerenderInDEV.getCacheSignal = getCacheSignal;
      InvalidNestedHooksDispatcherOnRerenderInDEV.getCacheForType = getCacheForType;

      InvalidNestedHooksDispatcherOnRerenderInDEV.useCacheRefresh = function useCacheRefresh() {
        currentHookNameInDev = 'useCacheRefresh';
        updateHookTypesDev();
        return updateRefresh();
      };
    }
  }