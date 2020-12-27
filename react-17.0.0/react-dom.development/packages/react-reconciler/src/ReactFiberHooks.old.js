  var ReactCurrentDispatcher$1 = ReactSharedInternals.ReactCurrentDispatcher,
      ReactCurrentBatchConfig$1 = ReactSharedInternals.ReactCurrentBatchConfig;
  var didWarnAboutMismatchedHooksForComponent;
  var didWarnAboutUseOpaqueIdentifier;

  {
    didWarnAboutUseOpaqueIdentifier = {};
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

  var didScheduleRenderPhaseUpdateDuringThisPass = false;
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
      if (deps !== undefined && deps !== null && !Array.isArray(deps)) {
        // Verify deps, but only on mount to avoid extra checks.
        // It's unlikely their type would change as usually you define them inline.
        error('%s received a final argument that is not an array (instead, received `%s`). When ' + 'specified, the final argument must be an array.', currentHookNameInDev, typeof deps);
      }
    }
  }

  function warnOnHookMismatchInDev(currentHookName) {
    {
      var componentName = getComponentName(currentlyRenderingFiber$1.type);

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
    {
      {
        throw Error( "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem." );
      }
    }
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

        if (!(numberOfReRenders < RE_RENDER_LIMIT)) {
          {
            throw Error( "Too many re-renders. React limits the number of renders to prevent an infinite loop." );
          }
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
    // at the beginning of the render phase and there's no re-entrancy.


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
      hookTypesUpdateIndexDev = -1;
    }

    didScheduleRenderPhaseUpdate = false;

    if (!!didRenderTooFewHooks) {
      {
        throw Error( "Rendered fewer hooks than expected. This may be caused by an accidental early return statement." );
      }
    }

    return children;
  }
  function bailoutHooks(current, workInProgress, lanes) {
    workInProgress.updateQueue = current.updateQueue;
    workInProgress.flags &= ~(Passive | Update);
    current.lanes = removeLanes(current.lanes, lanes);
  }
  function resetHooksAfterThrow() {
    // We can assume the previous dispatcher is always this one, since we set it
    // at the beginning of the render phase and there's no re-entrancy.
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
      if (!(nextCurrentHook !== null)) {
        {
          throw Error( "Rendered more hooks than during the previous render." );
        }
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
      lastEffect: null
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
    var queue = hook.queue = {
      pending: null,
      dispatch: null,
      lastRenderedReducer: reducer,
      lastRenderedState: initialState
    };
    var dispatch = queue.dispatch = dispatchAction.bind(null, currentlyRenderingFiber$1, queue);
    return [hook.memoizedState, dispatch];
  }

  function updateReducer(reducer, initialArg, init) {
    var hook = updateWorkInProgressHook();
    var queue = hook.queue;

    if (!(queue !== null)) {
      {
        throw Error( "Should have a queue. This is likely a bug in React. Please file an issue." );
      }
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
            eagerReducer: update.eagerReducer,
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
              eagerReducer: update.eagerReducer,
              eagerState: update.eagerState,
              next: null
            };
            newBaseQueueLast = newBaseQueueLast.next = _clone;
          } // Process this update.


          if (update.eagerReducer === reducer) {
            // If this update was processed eagerly, and its reducer matches the
            // current reducer, we can use the eagerly computed state.
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
    }

    var dispatch = queue.dispatch;
    return [hook.memoizedState, dispatch];
  }

  function rerenderReducer(reducer, initialArg, init) {
    var hook = updateWorkInProgressHook();
    var queue = hook.queue;

    if (!(queue !== null)) {
      {
        throw Error( "Should have a queue. This is likely a bug in React. Please file an issue." );
      }
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

  function readFromUnsubcribedMutableSource(root, source, getSnapshot) {
    {
      warnAboutMultipleRenderersDEV(source);
    }

    var getVersion = source._getVersion;
    var version = getVersion(source._source); // Is it safe for this component to read from this source during the current render?

    var isSafeToReadFromSource = false; // Check the version first.
    // If this render has already been started with a specific version,
    // we can use it alone to determine if we can safely read from the source.

    var currentRenderVersion = getWorkInProgressVersion(source);

    if (currentRenderVersion !== null) {
      // It's safe to read if the store hasn't been mutated since the last time
      // we read something.
      isSafeToReadFromSource = currentRenderVersion === version;
    } else {
      // If there's no version, then this is the first time we've read from the
      // source during the current render pass, so we need to do a bit more work.
      // What we need to determine is if there are any hooks that already
      // subscribed to the source, and if so, whether there are any pending
      // mutations that haven't been synchronized yet.
      //
      // If there are no pending mutations, then `root.mutableReadLanes` will be
      // empty, and we know we can safely read.
      //
      // If there *are* pending mutations, we may still be able to safely read
      // if the currently rendering lanes are inclusive of the pending mutation
      // lanes, since that guarantees that the value we're about to read from
      // the source is consistent with the values that we read during the most
      // recent mutation.
      isSafeToReadFromSource = isSubsetOfLanes(renderLanes, root.mutableReadLanes);

      if (isSafeToReadFromSource) {
        // If it's safe to read from this source during the current render,
        // store the version in case other components read from it.
        // A changed version number will let those components know to throw and restart the render.
        setWorkInProgressVersion(source, version);
      }
    }

    if (isSafeToReadFromSource) {
      var snapshot = getSnapshot(source._source);

      {
        if (typeof snapshot === 'function') {
          error('Mutable source should not return a function as the snapshot value. ' + 'Functions may close over mutable values and cause tearing.');
        }
      }

      return snapshot;
    } else {
      // This handles the special case of a mutable source being shared between renderers.
      // In that case, if the source is mutated between the first and second renderer,
      // The second renderer don't know that it needs to reset the WIP version during unwind,
      // (because the hook only marks sources as dirty if it's written to their WIP version).
      // That would cause this tear check to throw again and eventually be visible to the user.
      // We can avoid this infinite loop by explicitly marking the source as dirty.
      //
      // This can lead to tearing in the first renderer when it resumes,
      // but there's nothing we can do about that (short of throwing here and refusing to continue the render).
      markSourceAsDirty(source);

      {
        {
          throw Error( "Cannot read from mutable source during the current render without tearing. This is a bug in React. Please file an issue." );
        }
      }
    }
  }

  function useMutableSource(hook, source, getSnapshot, subscribe) {
    var root = getWorkInProgressRoot();

    if (!(root !== null)) {
      {
        throw Error( "Expected a work-in-progress root. This is a bug in React. Please file an issue." );
      }
    }

    var getVersion = source._getVersion;
    var version = getVersion(source._source);
    var dispatcher = ReactCurrentDispatcher$1.current; // eslint-disable-next-line prefer-const

    var _dispatcher$useState = dispatcher.useState(function () {
      return readFromUnsubcribedMutableSource(root, source, getSnapshot);
    }),
        currentSnapshot = _dispatcher$useState[0],
        setSnapshot = _dispatcher$useState[1];

    var snapshot = currentSnapshot; // Grab a handle to the state hook as well.
    // We use it to clear the pending update queue if we have a new source.

    var stateHook = workInProgressHook;
    var memoizedState = hook.memoizedState;
    var refs = memoizedState.refs;
    var prevGetSnapshot = refs.getSnapshot;
    var prevSource = memoizedState.source;
    var prevSubscribe = memoizedState.subscribe;
    var fiber = currentlyRenderingFiber$1;
    hook.memoizedState = {
      refs: refs,
      source: source,
      subscribe: subscribe
    }; // Sync the values needed by our subscription handler after each commit.

    dispatcher.useEffect(function () {
      refs.getSnapshot = getSnapshot; // Normally the dispatch function for a state hook never changes,
      // but this hook recreates the queue in certain cases  to avoid updates from stale sources.
      // handleChange() below needs to reference the dispatch function without re-subscribing,
      // so we use a ref to ensure that it always has the latest version.

      refs.setSnapshot = setSnapshot; // Check for a possible change between when we last rendered now.

      var maybeNewVersion = getVersion(source._source);

      if (!objectIs(version, maybeNewVersion)) {
        var maybeNewSnapshot = getSnapshot(source._source);

        {
          if (typeof maybeNewSnapshot === 'function') {
            error('Mutable source should not return a function as the snapshot value. ' + 'Functions may close over mutable values and cause tearing.');
          }
        }

        if (!objectIs(snapshot, maybeNewSnapshot)) {
          setSnapshot(maybeNewSnapshot);
          var lane = requestUpdateLane(fiber);
          markRootMutableRead(root, lane);
        } // If the source mutated between render and now,
        // there may be state updates already scheduled from the old source.
        // Entangle the updates so that they render in the same batch.


        markRootEntangled(root, root.mutableReadLanes);
      }
    }, [getSnapshot, source, subscribe]); // If we got a new source or subscribe function, re-subscribe in a passive effect.

    dispatcher.useEffect(function () {
      var handleChange = function () {
        var latestGetSnapshot = refs.getSnapshot;
        var latestSetSnapshot = refs.setSnapshot;

        try {
          latestSetSnapshot(latestGetSnapshot(source._source)); // Record a pending mutable source update with the same expiration time.

          var lane = requestUpdateLane(fiber);
          markRootMutableRead(root, lane);
        } catch (error) {
          // A selector might throw after a source mutation.
          // e.g. it might try to read from a part of the store that no longer exists.
          // In this case we should still schedule an update with React.
          // Worst case the selector will throw again and then an error boundary will handle it.
          latestSetSnapshot(function () {
            throw error;
          });
        }
      };

      var unsubscribe = subscribe(source._source, handleChange);

      {
        if (typeof unsubscribe !== 'function') {
          error('Mutable source subscribe function must return an unsubscribe function.');
        }
      }

      return unsubscribe;
    }, [source, subscribe]); // If any of the inputs to useMutableSource change, reading is potentially unsafe.
    //
    // If either the source or the subscription have changed we can't can't trust the update queue.
    // Maybe the source changed in a way that the old subscription ignored but the new one depends on.
    //
    // If the getSnapshot function changed, we also shouldn't rely on the update queue.
    // It's possible that the underlying source was mutated between the when the last "change" event fired,
    // and when the current render (with the new getSnapshot function) is processed.
    //
    // In both cases, we need to throw away pending updates (since they are no longer relevant)
    // and treat reading from the source as we do in the mount case.

    if (!objectIs(prevGetSnapshot, getSnapshot) || !objectIs(prevSource, source) || !objectIs(prevSubscribe, subscribe)) {
      // Create a new queue and setState method,
      // So if there are interleaved updates, they get pushed to the older queue.
      // When this becomes current, the previous queue and dispatch method will be discarded,
      // including any interleaving updates that occur.
      var newQueue = {
        pending: null,
        dispatch: null,
        lastRenderedReducer: basicStateReducer,
        lastRenderedState: snapshot
      };
      newQueue.dispatch = setSnapshot = dispatchAction.bind(null, currentlyRenderingFiber$1, newQueue);
      stateHook.queue = newQueue;
      stateHook.baseQueue = null;
      snapshot = readFromUnsubcribedMutableSource(root, source, getSnapshot);
      stateHook.memoizedState = stateHook.baseState = snapshot;
    }

    return snapshot;
  }

  function mountMutableSource(source, getSnapshot, subscribe) {
    var hook = mountWorkInProgressHook();
    hook.memoizedState = {
      refs: {
        getSnapshot: getSnapshot,
        setSnapshot: null
      },
      source: source,
      subscribe: subscribe
    };
    return useMutableSource(hook, source, getSnapshot, subscribe);
  }

  function updateMutableSource(source, getSnapshot, subscribe) {
    var hook = updateWorkInProgressHook();
    return useMutableSource(hook, source, getSnapshot, subscribe);
  }

  function mountState(initialState) {
    var hook = mountWorkInProgressHook();

    if (typeof initialState === 'function') {
      // $FlowFixMe: Flow doesn't like mixed types
      initialState = initialState();
    }

    hook.memoizedState = hook.baseState = initialState;
    var queue = hook.queue = {
      pending: null,
      dispatch: null,
      lastRenderedReducer: basicStateReducer,
      lastRenderedState: initialState
    };
    var dispatch = queue.dispatch = dispatchAction.bind(null, currentlyRenderingFiber$1, queue);
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
    var ref = {
      current: initialValue
    };

    {
      Object.seal(ref);
    }

    hook.memoizedState = ref;
    return ref;
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
          pushEffect(hookFlags, create, destroy, nextDeps);
          return;
        }
      }
    }

    currentlyRenderingFiber$1.flags |= fiberFlags;
    hook.memoizedState = pushEffect(HasEffect | hookFlags, create, destroy, nextDeps);
  }

  function mountEffect(create, deps) {
    {
      // $FlowExpectedError - jest isn't a global, and isn't recognized outside of tests
      if ('undefined' !== typeof jest) {
        warnIfNotCurrentlyActingEffectsInDEV(currentlyRenderingFiber$1);
      }
    }

    return mountEffectImpl(Update | Passive, Passive$1, create, deps);
  }

  function updateEffect(create, deps) {
    {
      // $FlowExpectedError - jest isn't a global, and isn't recognized outside of tests
      if ('undefined' !== typeof jest) {
        warnIfNotCurrentlyActingEffectsInDEV(currentlyRenderingFiber$1);
      }
    }

    return updateEffectImpl(Update | Passive, Passive$1, create, deps);
  }

  function mountLayoutEffect(create, deps) {
    return mountEffectImpl(Update, Layout, create, deps);
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
    return mountEffectImpl(Update, Layout, imperativeHandleEffect.bind(null, create, ref), effectDeps);
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
    var _mountState = mountState(value),
        prevValue = _mountState[0],
        setValue = _mountState[1];

    mountEffect(function () {
      var prevTransition = ReactCurrentBatchConfig$1.transition;
      ReactCurrentBatchConfig$1.transition = 1;

      try {
        setValue(value);
      } finally {
        ReactCurrentBatchConfig$1.transition = prevTransition;
      }
    }, [value]);
    return prevValue;
  }

  function updateDeferredValue(value) {
    var _updateState = updateState(),
        prevValue = _updateState[0],
        setValue = _updateState[1];

    updateEffect(function () {
      var prevTransition = ReactCurrentBatchConfig$1.transition;
      ReactCurrentBatchConfig$1.transition = 1;

      try {
        setValue(value);
      } finally {
        ReactCurrentBatchConfig$1.transition = prevTransition;
      }
    }, [value]);
    return prevValue;
  }

  function rerenderDeferredValue(value) {
    var _rerenderState = rerenderState(),
        prevValue = _rerenderState[0],
        setValue = _rerenderState[1];

    updateEffect(function () {
      var prevTransition = ReactCurrentBatchConfig$1.transition;
      ReactCurrentBatchConfig$1.transition = 1;

      try {
        setValue(value);
      } finally {
        ReactCurrentBatchConfig$1.transition = prevTransition;
      }
    }, [value]);
    return prevValue;
  }

  function startTransition(setPending, callback) {
    var priorityLevel = getCurrentPriorityLevel();

    {
      runWithPriority$1(priorityLevel < UserBlockingPriority$2 ? UserBlockingPriority$2 : priorityLevel, function () {
        setPending(true);
      });
      runWithPriority$1(priorityLevel > NormalPriority$1 ? NormalPriority$1 : priorityLevel, function () {
        var prevTransition = ReactCurrentBatchConfig$1.transition;
        ReactCurrentBatchConfig$1.transition = 1;

        try {
          setPending(false);
          callback();
        } finally {
          ReactCurrentBatchConfig$1.transition = prevTransition;
        }
      });
    }
  }

  function mountTransition() {
    var _mountState2 = mountState(false),
        isPending = _mountState2[0],
        setPending = _mountState2[1]; // The `start` method can be stored on a ref, since `setPending`
    // never changes.


    var start = startTransition.bind(null, setPending);
    mountRef(start);
    return [start, isPending];
  }

  function updateTransition() {
    var _updateState2 = updateState(),
        isPending = _updateState2[0];

    var startRef = updateRef();
    var start = startRef.current;
    return [start, isPending];
  }

  function rerenderTransition() {
    var _rerenderState2 = rerenderState(),
        isPending = _rerenderState2[0];

    var startRef = updateRef();
    var start = startRef.current;
    return [start, isPending];
  }

  var isUpdatingOpaqueValueInRenderPhase = false;
  function getIsUpdatingOpaqueValueInRenderPhaseInDEV() {
    {
      return isUpdatingOpaqueValueInRenderPhase;
    }
  }

  function warnOnOpaqueIdentifierAccessInDEV(fiber) {
    {
      // TODO: Should warn in effects and callbacks, too
      var name = getComponentName(fiber.type) || 'Unknown';

      if (getIsRendering() && !didWarnAboutUseOpaqueIdentifier[name]) {
        error('The object passed back from useOpaqueIdentifier is meant to be ' + 'passed through to attributes only. Do not read the ' + 'value directly.');

        didWarnAboutUseOpaqueIdentifier[name] = true;
      }
    }
  }

  function mountOpaqueIdentifier() {
    var makeId =  makeClientIdInDEV.bind(null, warnOnOpaqueIdentifierAccessInDEV.bind(null, currentlyRenderingFiber$1)) ;

    if (getIsHydrating()) {
      var didUpgrade = false;
      var fiber = currentlyRenderingFiber$1;

      var readValue = function () {
        if (!didUpgrade) {
          // Only upgrade once. This works even inside the render phase because
          // the update is added to a shared queue, which outlasts the
          // in-progress render.
          didUpgrade = true;

          {
            isUpdatingOpaqueValueInRenderPhase = true;
            setId(makeId());
            isUpdatingOpaqueValueInRenderPhase = false;
            warnOnOpaqueIdentifierAccessInDEV(fiber);
          }
        }

        {
          {
            throw Error( "The object passed back from useOpaqueIdentifier is meant to be passed through to attributes only. Do not read the value directly." );
          }
        }
      };

      var id = makeOpaqueHydratingObject(readValue);
      var setId = mountState(id)[1];

      if ((currentlyRenderingFiber$1.mode & BlockingMode) === NoMode) {
        currentlyRenderingFiber$1.flags |= Update | Passive;
        pushEffect(HasEffect | Passive$1, function () {
          setId(makeId());
        }, undefined, null);
      }

      return id;
    } else {
      var _id = makeId();

      mountState(_id);
      return _id;
    }
  }

  function updateOpaqueIdentifier() {
    var id = updateState()[0];
    return id;
  }

  function rerenderOpaqueIdentifier() {
    var id = rerenderState()[0];
    return id;
  }

  function dispatchAction(fiber, queue, action) {
    {
      if (typeof arguments[3] === 'function') {
        error("State updates from the useState() and useReducer() Hooks don't support the " + 'second callback argument. To execute a side effect after ' + 'rendering, declare it in the component body with useEffect().');
      }
    }

    var eventTime = requestEventTime();
    var lane = requestUpdateLane(fiber);
    var update = {
      lane: lane,
      action: action,
      eagerReducer: null,
      eagerState: null,
      next: null
    }; // Append the update to the end of the list.

    var pending = queue.pending;

    if (pending === null) {
      // This is the first update. Create a circular list.
      update.next = update;
    } else {
      update.next = pending.next;
      pending.next = update;
    }

    queue.pending = update;
    var alternate = fiber.alternate;

    if (fiber === currentlyRenderingFiber$1 || alternate !== null && alternate === currentlyRenderingFiber$1) {
      // This is a render phase update. Stash it in a lazily-created map of
      // queue -> linked list of updates. After this render pass, we'll restart
      // and apply the stashed updates on top of the work-in-progress hook.
      didScheduleRenderPhaseUpdateDuringThisPass = didScheduleRenderPhaseUpdate = true;
    } else {
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

            update.eagerReducer = lastRenderedReducer;
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

      {
        // $FlowExpectedError - jest isn't a global, and isn't recognized outside of tests
        if ('undefined' !== typeof jest) {
          warnIfNotScopedWithMatchingAct(fiber);
          warnIfNotCurrentlyActingUpdatesInDev(fiber);
        }
      }

      scheduleUpdateOnFiber(fiber, lane, eventTime);
    }

    {
      markStateUpdateScheduled(fiber, lane);
    }
  }

  var ContextOnlyDispatcher = {
    readContext: readContext,
    useCallback: throwInvalidHookError,
    useContext: throwInvalidHookError,
    useEffect: throwInvalidHookError,
    useImperativeHandle: throwInvalidHookError,
    useLayoutEffect: throwInvalidHookError,
    useMemo: throwInvalidHookError,
    useReducer: throwInvalidHookError,
    useRef: throwInvalidHookError,
    useState: throwInvalidHookError,
    useDebugValue: throwInvalidHookError,
    useDeferredValue: throwInvalidHookError,
    useTransition: throwInvalidHookError,
    useMutableSource: throwInvalidHookError,
    useOpaqueIdentifier: throwInvalidHookError,
    unstable_isNewReconciler: enableNewReconciler
  };
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
      readContext: function (context, observedBits) {
        return readContext(context, observedBits);
      },
      useCallback: function (callback, deps) {
        currentHookNameInDev = 'useCallback';
        mountHookTypesDev();
        checkDepsAreArrayDev(deps);
        return mountCallback(callback, deps);
      },
      useContext: function (context, observedBits) {
        currentHookNameInDev = 'useContext';
        mountHookTypesDev();
        return readContext(context, observedBits);
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
        return mountMutableSource(source, getSnapshot, subscribe);
      },
      useOpaqueIdentifier: function () {
        currentHookNameInDev = 'useOpaqueIdentifier';
        mountHookTypesDev();
        return mountOpaqueIdentifier();
      },
      unstable_isNewReconciler: enableNewReconciler
    };
    HooksDispatcherOnMountWithHookTypesInDEV = {
      readContext: function (context, observedBits) {
        return readContext(context, observedBits);
      },
      useCallback: function (callback, deps) {
        currentHookNameInDev = 'useCallback';
        updateHookTypesDev();
        return mountCallback(callback, deps);
      },
      useContext: function (context, observedBits) {
        currentHookNameInDev = 'useContext';
        updateHookTypesDev();
        return readContext(context, observedBits);
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
        return mountMutableSource(source, getSnapshot, subscribe);
      },
      useOpaqueIdentifier: function () {
        currentHookNameInDev = 'useOpaqueIdentifier';
        updateHookTypesDev();
        return mountOpaqueIdentifier();
      },
      unstable_isNewReconciler: enableNewReconciler
    };
    HooksDispatcherOnUpdateInDEV = {
      readContext: function (context, observedBits) {
        return readContext(context, observedBits);
      },
      useCallback: function (callback, deps) {
        currentHookNameInDev = 'useCallback';
        updateHookTypesDev();
        return updateCallback(callback, deps);
      },
      useContext: function (context, observedBits) {
        currentHookNameInDev = 'useContext';
        updateHookTypesDev();
        return readContext(context, observedBits);
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
        return updateMutableSource(source, getSnapshot, subscribe);
      },
      useOpaqueIdentifier: function () {
        currentHookNameInDev = 'useOpaqueIdentifier';
        updateHookTypesDev();
        return updateOpaqueIdentifier();
      },
      unstable_isNewReconciler: enableNewReconciler
    };
    HooksDispatcherOnRerenderInDEV = {
      readContext: function (context, observedBits) {
        return readContext(context, observedBits);
      },
      useCallback: function (callback, deps) {
        currentHookNameInDev = 'useCallback';
        updateHookTypesDev();
        return updateCallback(callback, deps);
      },
      useContext: function (context, observedBits) {
        currentHookNameInDev = 'useContext';
        updateHookTypesDev();
        return readContext(context, observedBits);
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
        return updateMutableSource(source, getSnapshot, subscribe);
      },
      useOpaqueIdentifier: function () {
        currentHookNameInDev = 'useOpaqueIdentifier';
        updateHookTypesDev();
        return rerenderOpaqueIdentifier();
      },
      unstable_isNewReconciler: enableNewReconciler
    };
    InvalidNestedHooksDispatcherOnMountInDEV = {
      readContext: function (context, observedBits) {
        warnInvalidContextAccess();
        return readContext(context, observedBits);
      },
      useCallback: function (callback, deps) {
        currentHookNameInDev = 'useCallback';
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountCallback(callback, deps);
      },
      useContext: function (context, observedBits) {
        currentHookNameInDev = 'useContext';
        warnInvalidHookAccess();
        mountHookTypesDev();
        return readContext(context, observedBits);
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
        return mountMutableSource(source, getSnapshot, subscribe);
      },
      useOpaqueIdentifier: function () {
        currentHookNameInDev = 'useOpaqueIdentifier';
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountOpaqueIdentifier();
      },
      unstable_isNewReconciler: enableNewReconciler
    };
    InvalidNestedHooksDispatcherOnUpdateInDEV = {
      readContext: function (context, observedBits) {
        warnInvalidContextAccess();
        return readContext(context, observedBits);
      },
      useCallback: function (callback, deps) {
        currentHookNameInDev = 'useCallback';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateCallback(callback, deps);
      },
      useContext: function (context, observedBits) {
        currentHookNameInDev = 'useContext';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return readContext(context, observedBits);
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
        return updateMutableSource(source, getSnapshot, subscribe);
      },
      useOpaqueIdentifier: function () {
        currentHookNameInDev = 'useOpaqueIdentifier';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateOpaqueIdentifier();
      },
      unstable_isNewReconciler: enableNewReconciler
    };
    InvalidNestedHooksDispatcherOnRerenderInDEV = {
      readContext: function (context, observedBits) {
        warnInvalidContextAccess();
        return readContext(context, observedBits);
      },
      useCallback: function (callback, deps) {
        currentHookNameInDev = 'useCallback';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateCallback(callback, deps);
      },
      useContext: function (context, observedBits) {
        currentHookNameInDev = 'useContext';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return readContext(context, observedBits);
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
        return updateMutableSource(source, getSnapshot, subscribe);
      },
      useOpaqueIdentifier: function () {
        currentHookNameInDev = 'useOpaqueIdentifier';
        warnInvalidHookAccess();
        updateHookTypesDev();
        return rerenderOpaqueIdentifier();
      },
      unstable_isNewReconciler: enableNewReconciler
    };
  }