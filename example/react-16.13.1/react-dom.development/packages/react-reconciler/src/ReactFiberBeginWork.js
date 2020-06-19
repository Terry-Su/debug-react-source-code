  var ReactCurrentOwner$1 = ReactSharedInternals.ReactCurrentOwner;
  var didReceiveUpdate = false;
  var didWarnAboutBadClass;
  var didWarnAboutModulePatternComponent;
  var didWarnAboutContextTypeOnFunctionComponent;
  var didWarnAboutGetDerivedStateOnFunctionComponent;
  var didWarnAboutFunctionRefs;
  var didWarnAboutReassigningProps;
  var didWarnAboutRevealOrder;
  var didWarnAboutTailOptions;

  {
    didWarnAboutBadClass = {};
    didWarnAboutModulePatternComponent = {};
    didWarnAboutContextTypeOnFunctionComponent = {};
    didWarnAboutGetDerivedStateOnFunctionComponent = {};
    didWarnAboutFunctionRefs = {};
    didWarnAboutReassigningProps = false;
    didWarnAboutRevealOrder = {};
    didWarnAboutTailOptions = {};
  }

  function reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime) {
    if (current === null) {
      // If this is a fresh new component that hasn't been rendered yet, we
      // won't update its child set by applying minimal side-effects. Instead,
      // we will add them all to the child before it gets rendered. That means
      // we can optimize this reconciliation pass by not tracking side-effects.
      workInProgress.child = mountChildFibers(workInProgress, null, nextChildren, renderExpirationTime);
    } else {
      // If the current child is the same as the work in progress, it means that
      // we haven't yet started any work on these children. Therefore, we use
      // the clone algorithm to create a copy of all the current children.
      // If we had any progressed work already, that is invalid at this point so
      // let's throw it out.
      workInProgress.child = reconcileChildFibers(workInProgress, current.child, nextChildren, renderExpirationTime);
    }
  }

  function forceUnmountCurrentAndReconcile(current, workInProgress, nextChildren, renderExpirationTime) {
    // This function is fork of reconcileChildren. It's used in cases where we
    // want to reconcile without matching against the existing set. This has the
    // effect of all current children being unmounted; even if the type and key
    // are the same, the old child is unmounted and a new child is created.
    //
    // To do this, we're going to go through the reconcile algorithm twice. In
    // the first pass, we schedule a deletion for all the current children by
    // passing null.
    workInProgress.child = reconcileChildFibers(workInProgress, current.child, null, renderExpirationTime); // In the second pass, we mount the new children. The trick here is that we
    // pass null in place of where we usually pass the current child set. This has
    // the effect of remounting all children regardless of whether their
    // identities match.

    workInProgress.child = reconcileChildFibers(workInProgress, null, nextChildren, renderExpirationTime);
  }

  function updateForwardRef(current, workInProgress, Component, nextProps, renderExpirationTime) {
    // TODO: current can be non-null here even if the component
    // hasn't yet mounted. This happens after the first render suspends.
    // We'll need to figure out if this is fine or can cause issues.
    {
      if (workInProgress.type !== workInProgress.elementType) {
        // Lazy component props can't be validated in createElement
        // because they're only guaranteed to be resolved here.
        var innerPropTypes = Component.propTypes;

        if (innerPropTypes) {
          checkPropTypes_1(innerPropTypes, nextProps, // Resolved props
          'prop', getComponentName(Component), getCurrentFiberStackInDev);
        }
      }
    }

    var render = Component.render;
    var ref = workInProgress.ref; // The rest is a fork of updateFunctionComponent

    var nextChildren;
    prepareToReadContext(workInProgress, renderExpirationTime);

    {
      ReactCurrentOwner$1.current = workInProgress;
      setIsRendering(true);
      nextChildren = renderWithHooks(current, workInProgress, render, nextProps, ref, renderExpirationTime);

      if ( workInProgress.mode & StrictMode) {
        // Only double-render components with Hooks
        if (workInProgress.memoizedState !== null) {
          nextChildren = renderWithHooks(current, workInProgress, render, nextProps, ref, renderExpirationTime);
        }
      }

      setIsRendering(false);
    }

    if (current !== null && !didReceiveUpdate) {
      bailoutHooks(current, workInProgress, renderExpirationTime);
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime);
    } // React DevTools reads this flag.


    workInProgress.effectTag |= PerformedWork;
    reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime);
    return workInProgress.child;
  }

  function updateMemoComponent(current, workInProgress, Component, nextProps, updateExpirationTime, renderExpirationTime) {
    if (current === null) {
      var type = Component.type;

      if (isSimpleFunctionComponent(type) && Component.compare === null && // SimpleMemoComponent codepath doesn't resolve outer props either.
      Component.defaultProps === undefined) {
        var resolvedType = type;

        {
          resolvedType = resolveFunctionForHotReloading(type);
        } // If this is a plain function component without default props,
        // and with only the default shallow comparison, we upgrade it
        // to a SimpleMemoComponent to allow fast path updates.


        workInProgress.tag = SimpleMemoComponent;
        workInProgress.type = resolvedType;

        {
          validateFunctionComponentInDev(workInProgress, type);
        }

        return updateSimpleMemoComponent(current, workInProgress, resolvedType, nextProps, updateExpirationTime, renderExpirationTime);
      }

      {
        var innerPropTypes = type.propTypes;

        if (innerPropTypes) {
          // Inner memo component props aren't currently validated in createElement.
          // We could move it there, but we'd still need this for lazy code path.
          checkPropTypes_1(innerPropTypes, nextProps, // Resolved props
          'prop', getComponentName(type), getCurrentFiberStackInDev);
        }
      }

      var child = createFiberFromTypeAndProps(Component.type, null, nextProps, null, workInProgress.mode, renderExpirationTime);
      child.ref = workInProgress.ref;
      child.return = workInProgress;
      workInProgress.child = child;
      return child;
    }

    {
      var _type = Component.type;
      var _innerPropTypes = _type.propTypes;

      if (_innerPropTypes) {
        // Inner memo component props aren't currently validated in createElement.
        // We could move it there, but we'd still need this for lazy code path.
        checkPropTypes_1(_innerPropTypes, nextProps, // Resolved props
        'prop', getComponentName(_type), getCurrentFiberStackInDev);
      }
    }

    var currentChild = current.child; // This is always exactly one child

    if (updateExpirationTime < renderExpirationTime) {
      // This will be the props with resolved defaultProps,
      // unlike current.memoizedProps which will be the unresolved ones.
      var prevProps = currentChild.memoizedProps; // Default to shallow comparison

      var compare = Component.compare;
      compare = compare !== null ? compare : shallowEqual;

      if (compare(prevProps, nextProps) && current.ref === workInProgress.ref) {
        return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime);
      }
    } // React DevTools reads this flag.


    workInProgress.effectTag |= PerformedWork;
    var newChild = createWorkInProgress(currentChild, nextProps);
    newChild.ref = workInProgress.ref;
    newChild.return = workInProgress;
    workInProgress.child = newChild;
    return newChild;
  }

  function updateSimpleMemoComponent(current, workInProgress, Component, nextProps, updateExpirationTime, renderExpirationTime) {
    // TODO: current can be non-null here even if the component
    // hasn't yet mounted. This happens when the inner render suspends.
    // We'll need to figure out if this is fine or can cause issues.
    {
      if (workInProgress.type !== workInProgress.elementType) {
        // Lazy component props can't be validated in createElement
        // because they're only guaranteed to be resolved here.
        var outerMemoType = workInProgress.elementType;

        if (outerMemoType.$$typeof === REACT_LAZY_TYPE) {
          // We warn when you define propTypes on lazy()
          // so let's just skip over it to find memo() outer wrapper.
          // Inner props for memo are validated later.
          outerMemoType = refineResolvedLazyComponent(outerMemoType);
        }

        var outerPropTypes = outerMemoType && outerMemoType.propTypes;

        if (outerPropTypes) {
          checkPropTypes_1(outerPropTypes, nextProps, // Resolved (SimpleMemoComponent has no defaultProps)
          'prop', getComponentName(outerMemoType), getCurrentFiberStackInDev);
        } // Inner propTypes will be validated in the function component path.

      }
    }

    if (current !== null) {
      var prevProps = current.memoizedProps;

      if (shallowEqual(prevProps, nextProps) && current.ref === workInProgress.ref && ( // Prevent bailout if the implementation changed due to hot reload.
       workInProgress.type === current.type )) {
        didReceiveUpdate = false;

        if (updateExpirationTime < renderExpirationTime) {
          // The pending update priority was cleared at the beginning of
          // beginWork. We're about to bail out, but there might be additional
          // updates at a lower priority. Usually, the priority level of the
          // remaining updates is accumlated during the evaluation of the
          // component (i.e. when processing the update queue). But since since
          // we're bailing out early *without* evaluating the component, we need
          // to account for it here, too. Reset to the value of the current fiber.
          // NOTE: This only applies to SimpleMemoComponent, not MemoComponent,
          // because a MemoComponent fiber does not have hooks or an update queue;
          // rather, it wraps around an inner component, which may or may not
          // contains hooks.
          // TODO: Move the reset at in beginWork out of the common path so that
          // this is no longer necessary.
          workInProgress.expirationTime = current.expirationTime;
          return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime);
        }
      }
    }

    return updateFunctionComponent(current, workInProgress, Component, nextProps, renderExpirationTime);
  }

  function updateFragment(current, workInProgress, renderExpirationTime) {
    var nextChildren = workInProgress.pendingProps;
    reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime);
    return workInProgress.child;
  }

  function updateMode(current, workInProgress, renderExpirationTime) {
    var nextChildren = workInProgress.pendingProps.children;
    reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime);
    return workInProgress.child;
  }

  function updateProfiler(current, workInProgress, renderExpirationTime) {
    {
      workInProgress.effectTag |= Update;
    }

    var nextProps = workInProgress.pendingProps;
    var nextChildren = nextProps.children;
    reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime);
    return workInProgress.child;
  }

  function markRef(current, workInProgress) {
    var ref = workInProgress.ref;

    if (current === null && ref !== null || current !== null && current.ref !== ref) {
      // Schedule a Ref effect
      workInProgress.effectTag |= Ref;
    }
  }

  function updateFunctionComponent(current, workInProgress, Component, nextProps, renderExpirationTime) {
    {
      if (workInProgress.type !== workInProgress.elementType) {
        // Lazy component props can't be validated in createElement
        // because they're only guaranteed to be resolved here.
        var innerPropTypes = Component.propTypes;

        if (innerPropTypes) {
          checkPropTypes_1(innerPropTypes, nextProps, // Resolved props
          'prop', getComponentName(Component), getCurrentFiberStackInDev);
        }
      }
    }

    var context;

    {
      var unmaskedContext = getUnmaskedContext(workInProgress, Component, true);
      context = getMaskedContext(workInProgress, unmaskedContext);
    }

    var nextChildren;
    prepareToReadContext(workInProgress, renderExpirationTime);

    {
      ReactCurrentOwner$1.current = workInProgress;
      setIsRendering(true);
      nextChildren = renderWithHooks(current, workInProgress, Component, nextProps, context, renderExpirationTime);

      if ( workInProgress.mode & StrictMode) {
        // Only double-render components with Hooks
        if (workInProgress.memoizedState !== null) {
          nextChildren = renderWithHooks(current, workInProgress, Component, nextProps, context, renderExpirationTime);
        }
      }

      setIsRendering(false);
    }

    if (current !== null && !didReceiveUpdate) {
      bailoutHooks(current, workInProgress, renderExpirationTime);
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime);
    } // React DevTools reads this flag.


    workInProgress.effectTag |= PerformedWork;
    reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime);
    return workInProgress.child;
  }

  function updateBlock(current, workInProgress, block, nextProps, renderExpirationTime) {
    // TODO: current can be non-null here even if the component
    // hasn't yet mounted. This happens after the first render suspends.
    // We'll need to figure out if this is fine or can cause issues.
    var render = block.render;
    var data = block.query(); // The rest is a fork of updateFunctionComponent

    var nextChildren;
    prepareToReadContext(workInProgress, renderExpirationTime);

    {
      ReactCurrentOwner$1.current = workInProgress;
      setIsRendering(true);
      nextChildren = renderWithHooks(current, workInProgress, render, nextProps, data, renderExpirationTime);

      if ( workInProgress.mode & StrictMode) {
        // Only double-render components with Hooks
        if (workInProgress.memoizedState !== null) {
          nextChildren = renderWithHooks(current, workInProgress, render, nextProps, data, renderExpirationTime);
        }
      }

      setIsRendering(false);
    }

    if (current !== null && !didReceiveUpdate) {
      bailoutHooks(current, workInProgress, renderExpirationTime);
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime);
    } // React DevTools reads this flag.


    workInProgress.effectTag |= PerformedWork;
    reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime);
    return workInProgress.child;
  }

  function updateClassComponent(current, workInProgress, Component, nextProps, renderExpirationTime) {
    {
      if (workInProgress.type !== workInProgress.elementType) {
        // Lazy component props can't be validated in createElement
        // because they're only guaranteed to be resolved here.
        var innerPropTypes = Component.propTypes;

        if (innerPropTypes) {
          checkPropTypes_1(innerPropTypes, nextProps, // Resolved props
          'prop', getComponentName(Component), getCurrentFiberStackInDev);
        }
      }
    } // Push context providers early to prevent context stack mismatches.
    // During mounting we don't know the child context yet as the instance doesn't exist.
    // We will invalidate the child context in finishClassComponent() right after rendering.


    var hasContext;

    if (isContextProvider(Component)) {
      hasContext = true;
      pushContextProvider(workInProgress);
    } else {
      hasContext = false;
    }

    prepareToReadContext(workInProgress, renderExpirationTime);
    var instance = workInProgress.stateNode;
    var shouldUpdate;

    if (instance === null) {
      if (current !== null) {
        // A class component without an instance only mounts if it suspended
        // inside a non-concurrent tree, in an inconsistent state. We want to
        // treat it like a new mount, even though an empty version of it already
        // committed. Disconnect the alternate pointers.
        current.alternate = null;
        workInProgress.alternate = null; // Since this is conceptually a new fiber, schedule a Placement effect

        workInProgress.effectTag |= Placement;
      } // In the initial pass we might need to construct the instance.


      constructClassInstance(workInProgress, Component, nextProps);
      mountClassInstance(workInProgress, Component, nextProps, renderExpirationTime);
      shouldUpdate = true;
    } else if (current === null) {
      // In a resume, we'll already have an instance we can reuse.
      shouldUpdate = resumeMountClassInstance(workInProgress, Component, nextProps, renderExpirationTime);
    } else {
      shouldUpdate = updateClassInstance(current, workInProgress, Component, nextProps, renderExpirationTime);
    }

    var nextUnitOfWork = finishClassComponent(current, workInProgress, Component, shouldUpdate, hasContext, renderExpirationTime);

    {
      var inst = workInProgress.stateNode;

      if (inst.props !== nextProps) {
        if (!didWarnAboutReassigningProps) {
          error('It looks like %s is reassigning its own `this.props` while rendering. ' + 'This is not supported and can lead to confusing bugs.', getComponentName(workInProgress.type) || 'a component');
        }

        didWarnAboutReassigningProps = true;
      }
    }

    return nextUnitOfWork;
  }

  function finishClassComponent(current, workInProgress, Component, shouldUpdate, hasContext, renderExpirationTime) {
    // Refs should update even if shouldComponentUpdate returns false
    markRef(current, workInProgress);
    var didCaptureError = (workInProgress.effectTag & DidCapture) !== NoEffect;

    if (!shouldUpdate && !didCaptureError) {
      // Context providers should defer to sCU for rendering
      if (hasContext) {
        invalidateContextProvider(workInProgress, Component, false);
      }

      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime);
    }

    var instance = workInProgress.stateNode; // Rerender

    ReactCurrentOwner$1.current = workInProgress;
    var nextChildren;

    if (didCaptureError && typeof Component.getDerivedStateFromError !== 'function') {
      // If we captured an error, but getDerivedStateFromError is not defined,
      // unmount all the children. componentDidCatch will schedule an update to
      // re-render a fallback. This is temporary until we migrate everyone to
      // the new API.
      // TODO: Warn in a future release.
      nextChildren = null;

      {
        stopProfilerTimerIfRunning();
      }
    } else {
      {
        setIsRendering(true);
        nextChildren = instance.render();

        if ( workInProgress.mode & StrictMode) {
          instance.render();
        }

        setIsRendering(false);
      }
    } // React DevTools reads this flag.


    workInProgress.effectTag |= PerformedWork;

    if (current !== null && didCaptureError) {
      // If we're recovering from an error, reconcile without reusing any of
      // the existing children. Conceptually, the normal children and the children
      // that are shown on error are two different sets, so we shouldn't reuse
      // normal children even if their identities match.
      forceUnmountCurrentAndReconcile(current, workInProgress, nextChildren, renderExpirationTime);
    } else {
      reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime);
    } // Memoize state using the values we just used to render.
    // TODO: Restructure so we never read values from the instance.


    workInProgress.memoizedState = instance.state; // The context might have changed so we need to recalculate it.

    if (hasContext) {
      invalidateContextProvider(workInProgress, Component, true);
    }

    return workInProgress.child;
  }

  function pushHostRootContext(workInProgress) {
    var root = workInProgress.stateNode;

    if (root.pendingContext) {
      pushTopLevelContextObject(workInProgress, root.pendingContext, root.pendingContext !== root.context);
    } else if (root.context) {
      // Should always be set
      pushTopLevelContextObject(workInProgress, root.context, false);
    }

    pushHostContainer(workInProgress, root.containerInfo);
  }

  function updateHostRoot(current, workInProgress, renderExpirationTime) {
    pushHostRootContext(workInProgress);
    var updateQueue = workInProgress.updateQueue;

    if (!(current !== null && updateQueue !== null)) {
      {
        throw Error( "If the root does not have an updateQueue, we should have already bailed out. This error is likely caused by a bug in React. Please file an issue." );
      }
    }

    var nextProps = workInProgress.pendingProps;
    var prevState = workInProgress.memoizedState;
    var prevChildren = prevState !== null ? prevState.element : null;
    cloneUpdateQueue(current, workInProgress);
    processUpdateQueue(workInProgress, nextProps, null, renderExpirationTime);
    var nextState = workInProgress.memoizedState; // Caution: React DevTools currently depends on this property
    // being called "element".

    var nextChildren = nextState.element;

    if (nextChildren === prevChildren) {
      // If the state is the same as before, that's a bailout because we had
      // no work that expires at this time.
      resetHydrationState();
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime);
    }

    var root = workInProgress.stateNode;

    if (root.hydrate && enterHydrationState(workInProgress)) {
      // If we don't have any current children this might be the first pass.
      // We always try to hydrate. If this isn't a hydration pass there won't
      // be any children to hydrate which is effectively the same thing as
      // not hydrating.
      var child = mountChildFibers(workInProgress, null, nextChildren, renderExpirationTime);
      workInProgress.child = child;
      var node = child;

      while (node) {
        // Mark each child as hydrating. This is a fast path to know whether this
        // tree is part of a hydrating tree. This is used to determine if a child
        // node has fully mounted yet, and for scheduling event replaying.
        // Conceptually this is similar to Placement in that a new subtree is
        // inserted into the React tree here. It just happens to not need DOM
        // mutations because it already exists.
        node.effectTag = node.effectTag & ~Placement | Hydrating;
        node = node.sibling;
      }
    } else {
      // Otherwise reset hydration state in case we aborted and resumed another
      // root.
      reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime);
      resetHydrationState();
    }

    return workInProgress.child;
  }

  function updateHostComponent(current, workInProgress, renderExpirationTime) {
    pushHostContext(workInProgress);

    if (current === null) {
      tryToClaimNextHydratableInstance(workInProgress);
    }

    var type = workInProgress.type;
    var nextProps = workInProgress.pendingProps;
    var prevProps = current !== null ? current.memoizedProps : null;
    var nextChildren = nextProps.children;
    var isDirectTextChild = shouldSetTextContent(type, nextProps);

    if (isDirectTextChild) {
      // We special case a direct text child of a host node. This is a common
      // case. We won't handle it as a reified child. We will instead handle
      // this in the host environment that also has access to this prop. That
      // avoids allocating another HostText fiber and traversing it.
      nextChildren = null;
    } else if (prevProps !== null && shouldSetTextContent(type, prevProps)) {
      // If we're switching from a direct text child to a normal child, or to
      // empty, we need to schedule the text content to be reset.
      workInProgress.effectTag |= ContentReset;
    }

    markRef(current, workInProgress); // Check the host config to see if the children are offscreen/hidden.

    if (workInProgress.mode & ConcurrentMode && renderExpirationTime !== Never && shouldDeprioritizeSubtree(type, nextProps)) {
      {
        markSpawnedWork(Never);
      } // Schedule this fiber to re-render at offscreen priority. Then bailout.


      workInProgress.expirationTime = workInProgress.childExpirationTime = Never;
      return null;
    }

    reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime);
    return workInProgress.child;
  }

  function updateHostText(current, workInProgress) {
    if (current === null) {
      tryToClaimNextHydratableInstance(workInProgress);
    } // Nothing to do here. This is terminal. We'll do the completion step
    // immediately after.


    return null;
  }

  function mountLazyComponent(_current, workInProgress, elementType, updateExpirationTime, renderExpirationTime) {
    if (_current !== null) {
      // A lazy component only mounts if it suspended inside a non-
      // concurrent tree, in an inconsistent state. We want to treat it like
      // a new mount, even though an empty version of it already committed.
      // Disconnect the alternate pointers.
      _current.alternate = null;
      workInProgress.alternate = null; // Since this is conceptually a new fiber, schedule a Placement effect

      workInProgress.effectTag |= Placement;
    }

    var props = workInProgress.pendingProps; // We can't start a User Timing measurement with correct label yet.
    // Cancel and resume right after we know the tag.

    cancelWorkTimer(workInProgress);
    var Component = readLazyComponentType(elementType); // Store the unwrapped component in the type.

    workInProgress.type = Component;
    var resolvedTag = workInProgress.tag = resolveLazyComponentTag(Component);
    startWorkTimer(workInProgress);
    var resolvedProps = resolveDefaultProps(Component, props);
    var child;

    switch (resolvedTag) {
      case FunctionComponent:
        {
          {
            validateFunctionComponentInDev(workInProgress, Component);
            workInProgress.type = Component = resolveFunctionForHotReloading(Component);
          }

          child = updateFunctionComponent(null, workInProgress, Component, resolvedProps, renderExpirationTime);
          return child;
        }

      case ClassComponent:
        {
          {
            workInProgress.type = Component = resolveClassForHotReloading(Component);
          }

          child = updateClassComponent(null, workInProgress, Component, resolvedProps, renderExpirationTime);
          return child;
        }

      case ForwardRef:
        {
          {
            workInProgress.type = Component = resolveForwardRefForHotReloading(Component);
          }

          child = updateForwardRef(null, workInProgress, Component, resolvedProps, renderExpirationTime);
          return child;
        }

      case MemoComponent:
        {
          {
            if (workInProgress.type !== workInProgress.elementType) {
              var outerPropTypes = Component.propTypes;

              if (outerPropTypes) {
                checkPropTypes_1(outerPropTypes, resolvedProps, // Resolved for outer only
                'prop', getComponentName(Component), getCurrentFiberStackInDev);
              }
            }
          }

          child = updateMemoComponent(null, workInProgress, Component, resolveDefaultProps(Component.type, resolvedProps), // The inner type can have defaults too
          updateExpirationTime, renderExpirationTime);
          return child;
        }

      case Block:
        {
          {
            // TODO: Resolve for Hot Reloading.
            child = updateBlock(null, workInProgress, Component, props, renderExpirationTime);
            return child;
          }
        }
    }

    var hint = '';

    {
      if (Component !== null && typeof Component === 'object' && Component.$$typeof === REACT_LAZY_TYPE) {
        hint = ' Did you wrap a component in React.lazy() more than once?';
      }
    } // This message intentionally doesn't mention ForwardRef or MemoComponent
    // because the fact that it's a separate type of work is an
    // implementation detail.


    {
      {
        throw Error( "Element type is invalid. Received a promise that resolves to: " + Component + ". Lazy element type must resolve to a class or function." + hint );
      }
    }
  }

  function mountIncompleteClassComponent(_current, workInProgress, Component, nextProps, renderExpirationTime) {
    if (_current !== null) {
      // An incomplete component only mounts if it suspended inside a non-
      // concurrent tree, in an inconsistent state. We want to treat it like
      // a new mount, even though an empty version of it already committed.
      // Disconnect the alternate pointers.
      _current.alternate = null;
      workInProgress.alternate = null; // Since this is conceptually a new fiber, schedule a Placement effect

      workInProgress.effectTag |= Placement;
    } // Promote the fiber to a class and try rendering again.


    workInProgress.tag = ClassComponent; // The rest of this function is a fork of `updateClassComponent`
    // Push context providers early to prevent context stack mismatches.
    // During mounting we don't know the child context yet as the instance doesn't exist.
    // We will invalidate the child context in finishClassComponent() right after rendering.

    var hasContext;

    if (isContextProvider(Component)) {
      hasContext = true;
      pushContextProvider(workInProgress);
    } else {
      hasContext = false;
    }

    prepareToReadContext(workInProgress, renderExpirationTime);
    constructClassInstance(workInProgress, Component, nextProps);
    mountClassInstance(workInProgress, Component, nextProps, renderExpirationTime);
    return finishClassComponent(null, workInProgress, Component, true, hasContext, renderExpirationTime);
  }

  function mountIndeterminateComponent(_current, workInProgress, Component, renderExpirationTime) {
    if (_current !== null) {
      // An indeterminate component only mounts if it suspended inside a non-
      // concurrent tree, in an inconsistent state. We want to treat it like
      // a new mount, even though an empty version of it already committed.
      // Disconnect the alternate pointers.
      _current.alternate = null;
      workInProgress.alternate = null; // Since this is conceptually a new fiber, schedule a Placement effect

      workInProgress.effectTag |= Placement;
    }

    var props = workInProgress.pendingProps;
    var context;

    {
      var unmaskedContext = getUnmaskedContext(workInProgress, Component, false);
      context = getMaskedContext(workInProgress, unmaskedContext);
    }

    prepareToReadContext(workInProgress, renderExpirationTime);
    var value;

    {
      if (Component.prototype && typeof Component.prototype.render === 'function') {
        var componentName = getComponentName(Component) || 'Unknown';

        if (!didWarnAboutBadClass[componentName]) {
          error("The <%s /> component appears to have a render method, but doesn't extend React.Component. " + 'This is likely to cause errors. Change %s to extend React.Component instead.', componentName, componentName);

          didWarnAboutBadClass[componentName] = true;
        }
      }

      if (workInProgress.mode & StrictMode) {
        ReactStrictModeWarnings.recordLegacyContextWarning(workInProgress, null);
      }

      setIsRendering(true);
      ReactCurrentOwner$1.current = workInProgress;
      value = renderWithHooks(null, workInProgress, Component, props, context, renderExpirationTime);
      setIsRendering(false);
    } // React DevTools reads this flag.


    workInProgress.effectTag |= PerformedWork;

    if (typeof value === 'object' && value !== null && typeof value.render === 'function' && value.$$typeof === undefined) {
      {
        var _componentName = getComponentName(Component) || 'Unknown';

        if (!didWarnAboutModulePatternComponent[_componentName]) {
          error('The <%s /> component appears to be a function component that returns a class instance. ' + 'Change %s to a class that extends React.Component instead. ' + "If you can't use a class try assigning the prototype on the function as a workaround. " + "`%s.prototype = React.Component.prototype`. Don't use an arrow function since it " + 'cannot be called with `new` by React.', _componentName, _componentName, _componentName);

          didWarnAboutModulePatternComponent[_componentName] = true;
        }
      } // Proceed under the assumption that this is a class instance


      workInProgress.tag = ClassComponent; // Throw out any hooks that were used.

      workInProgress.memoizedState = null;
      workInProgress.updateQueue = null; // Push context providers early to prevent context stack mismatches.
      // During mounting we don't know the child context yet as the instance doesn't exist.
      // We will invalidate the child context in finishClassComponent() right after rendering.

      var hasContext = false;

      if (isContextProvider(Component)) {
        hasContext = true;
        pushContextProvider(workInProgress);
      } else {
        hasContext = false;
      }

      workInProgress.memoizedState = value.state !== null && value.state !== undefined ? value.state : null;
      initializeUpdateQueue(workInProgress);
      var getDerivedStateFromProps = Component.getDerivedStateFromProps;

      if (typeof getDerivedStateFromProps === 'function') {
        applyDerivedStateFromProps(workInProgress, Component, getDerivedStateFromProps, props);
      }

      adoptClassInstance(workInProgress, value);
      mountClassInstance(workInProgress, Component, props, renderExpirationTime);
      return finishClassComponent(null, workInProgress, Component, true, hasContext, renderExpirationTime);
    } else {
      // Proceed under the assumption that this is a function component
      workInProgress.tag = FunctionComponent;

      {

        if ( workInProgress.mode & StrictMode) {
          // Only double-render components with Hooks
          if (workInProgress.memoizedState !== null) {
            value = renderWithHooks(null, workInProgress, Component, props, context, renderExpirationTime);
          }
        }
      }

      reconcileChildren(null, workInProgress, value, renderExpirationTime);

      {
        validateFunctionComponentInDev(workInProgress, Component);
      }

      return workInProgress.child;
    }
  }

  function validateFunctionComponentInDev(workInProgress, Component) {
    {
      if (Component) {
        if (Component.childContextTypes) {
          error('%s(...): childContextTypes cannot be defined on a function component.', Component.displayName || Component.name || 'Component');
        }
      }

      if (workInProgress.ref !== null) {
        var info = '';
        var ownerName = getCurrentFiberOwnerNameInDevOrNull();

        if (ownerName) {
          info += '\n\nCheck the render method of `' + ownerName + '`.';
        }

        var warningKey = ownerName || workInProgress._debugID || '';
        var debugSource = workInProgress._debugSource;

        if (debugSource) {
          warningKey = debugSource.fileName + ':' + debugSource.lineNumber;
        }

        if (!didWarnAboutFunctionRefs[warningKey]) {
          didWarnAboutFunctionRefs[warningKey] = true;

          error('Function components cannot be given refs. ' + 'Attempts to access this ref will fail. ' + 'Did you mean to use React.forwardRef()?%s', info);
        }
      }

      if (typeof Component.getDerivedStateFromProps === 'function') {
        var _componentName2 = getComponentName(Component) || 'Unknown';

        if (!didWarnAboutGetDerivedStateOnFunctionComponent[_componentName2]) {
          error('%s: Function components do not support getDerivedStateFromProps.', _componentName2);

          didWarnAboutGetDerivedStateOnFunctionComponent[_componentName2] = true;
        }
      }

      if (typeof Component.contextType === 'object' && Component.contextType !== null) {
        var _componentName3 = getComponentName(Component) || 'Unknown';

        if (!didWarnAboutContextTypeOnFunctionComponent[_componentName3]) {
          error('%s: Function components do not support contextType.', _componentName3);

          didWarnAboutContextTypeOnFunctionComponent[_componentName3] = true;
        }
      }
    }
  }

  var SUSPENDED_MARKER = {
    dehydrated: null,
    retryTime: NoWork
  };

  function shouldRemainOnFallback(suspenseContext, current, workInProgress) {
    // If the context is telling us that we should show a fallback, and we're not
    // already showing content, then we should show the fallback instead.
    return hasSuspenseContext(suspenseContext, ForceSuspenseFallback) && (current === null || current.memoizedState !== null);
  }

  function updateSuspenseComponent(current, workInProgress, renderExpirationTime) {
    var mode = workInProgress.mode;
    var nextProps = workInProgress.pendingProps; // This is used by DevTools to force a boundary to suspend.

    {
      if (shouldSuspend(workInProgress)) {
        workInProgress.effectTag |= DidCapture;
      }
    }

    var suspenseContext = suspenseStackCursor.current;
    var nextDidTimeout = false;
    var didSuspend = (workInProgress.effectTag & DidCapture) !== NoEffect;

    if (didSuspend || shouldRemainOnFallback(suspenseContext, current)) {
      // Something in this boundary's subtree already suspended. Switch to
      // rendering the fallback children.
      nextDidTimeout = true;
      workInProgress.effectTag &= ~DidCapture;
    } else {
      // Attempting the main content
      if (current === null || current.memoizedState !== null) {
        // This is a new mount or this boundary is already showing a fallback state.
        // Mark this subtree context as having at least one invisible parent that could
        // handle the fallback state.
        // Boundaries without fallbacks or should be avoided are not considered since
        // they cannot handle preferred fallback states.
        if (nextProps.fallback !== undefined && nextProps.unstable_avoidThisFallback !== true) {
          suspenseContext = addSubtreeSuspenseContext(suspenseContext, InvisibleParentSuspenseContext);
        }
      }
    }

    suspenseContext = setDefaultShallowSuspenseContext(suspenseContext);
    pushSuspenseContext(workInProgress, suspenseContext); // This next part is a bit confusing. If the children timeout, we switch to
    // showing the fallback children in place of the "primary" children.
    // However, we don't want to delete the primary children because then their
    // state will be lost (both the React state and the host state, e.g.
    // uncontrolled form inputs). Instead we keep them mounted and hide them.
    // Both the fallback children AND the primary children are rendered at the
    // same time. Once the primary children are un-suspended, we can delete
    // the fallback children — don't need to preserve their state.
    //
    // The two sets of children are siblings in the host environment, but
    // semantically, for purposes of reconciliation, they are two separate sets.
    // So we store them using two fragment fibers.
    //
    // However, we want to avoid allocating extra fibers for every placeholder.
    // They're only necessary when the children time out, because that's the
    // only time when both sets are mounted.
    //
    // So, the extra fragment fibers are only used if the children time out.
    // Otherwise, we render the primary children directly. This requires some
    // custom reconciliation logic to preserve the state of the primary
    // children. It's essentially a very basic form of re-parenting.

    if (current === null) {
      // If we're currently hydrating, try to hydrate this boundary.
      // But only if this has a fallback.
      if (nextProps.fallback !== undefined) {
        tryToClaimNextHydratableInstance(workInProgress); // This could've been a dehydrated suspense component.

        {
          var suspenseState = workInProgress.memoizedState;

          if (suspenseState !== null) {
            var dehydrated = suspenseState.dehydrated;

            if (dehydrated !== null) {
              return mountDehydratedSuspenseComponent(workInProgress, dehydrated);
            }
          }
        }
      } // This is the initial mount. This branch is pretty simple because there's
      // no previous state that needs to be preserved.


      if (nextDidTimeout) {
        // Mount separate fragments for primary and fallback children.
        var nextFallbackChildren = nextProps.fallback;
        var primaryChildFragment = createFiberFromFragment(null, mode, NoWork, null);
        primaryChildFragment.return = workInProgress;

        if ((workInProgress.mode & BlockingMode) === NoMode) {
          // Outside of blocking mode, we commit the effects from the
          // partially completed, timed-out tree, too.
          var progressedState = workInProgress.memoizedState;
          var progressedPrimaryChild = progressedState !== null ? workInProgress.child.child : workInProgress.child;
          primaryChildFragment.child = progressedPrimaryChild;
          var progressedChild = progressedPrimaryChild;

          while (progressedChild !== null) {
            progressedChild.return = primaryChildFragment;
            progressedChild = progressedChild.sibling;
          }
        }

        var fallbackChildFragment = createFiberFromFragment(nextFallbackChildren, mode, renderExpirationTime, null);
        fallbackChildFragment.return = workInProgress;
        primaryChildFragment.sibling = fallbackChildFragment; // Skip the primary children, and continue working on the
        // fallback children.

        workInProgress.memoizedState = SUSPENDED_MARKER;
        workInProgress.child = primaryChildFragment;
        return fallbackChildFragment;
      } else {
        // Mount the primary children without an intermediate fragment fiber.
        var nextPrimaryChildren = nextProps.children;
        workInProgress.memoizedState = null;
        return workInProgress.child = mountChildFibers(workInProgress, null, nextPrimaryChildren, renderExpirationTime);
      }
    } else {
      // This is an update. This branch is more complicated because we need to
      // ensure the state of the primary children is preserved.
      var prevState = current.memoizedState;

      if (prevState !== null) {
        {
          var _dehydrated = prevState.dehydrated;

          if (_dehydrated !== null) {
            if (!didSuspend) {
              return updateDehydratedSuspenseComponent(current, workInProgress, _dehydrated, prevState, renderExpirationTime);
            } else if (workInProgress.memoizedState !== null) {
              // Something suspended and we should still be in dehydrated mode.
              // Leave the existing child in place.
              workInProgress.child = current.child; // The dehydrated completion pass expects this flag to be there
              // but the normal suspense pass doesn't.

              workInProgress.effectTag |= DidCapture;
              return null;
            } else {
              // Suspended but we should no longer be in dehydrated mode.
              // Therefore we now have to render the fallback. Wrap the children
              // in a fragment fiber to keep them separate from the fallback
              // children.
              var _nextFallbackChildren = nextProps.fallback;

              var _primaryChildFragment = createFiberFromFragment( // It shouldn't matter what the pending props are because we aren't
              // going to render this fragment.
              null, mode, NoWork, null);

              _primaryChildFragment.return = workInProgress; // This is always null since we never want the previous child
              // that we're not going to hydrate.

              _primaryChildFragment.child = null;

              if ((workInProgress.mode & BlockingMode) === NoMode) {
                // Outside of blocking mode, we commit the effects from the
                // partially completed, timed-out tree, too.
                var _progressedChild = _primaryChildFragment.child = workInProgress.child;

                while (_progressedChild !== null) {
                  _progressedChild.return = _primaryChildFragment;
                  _progressedChild = _progressedChild.sibling;
                }
              } else {
                // We will have dropped the effect list which contains the deletion.
                // We need to reconcile to delete the current child.
                reconcileChildFibers(workInProgress, current.child, null, renderExpirationTime);
              } // Because primaryChildFragment is a new fiber that we're inserting as the
              // parent of a new tree, we need to set its treeBaseDuration.


              if ( workInProgress.mode & ProfileMode) {
                // treeBaseDuration is the sum of all the child tree base durations.
                var treeBaseDuration = 0;
                var hiddenChild = _primaryChildFragment.child;

                while (hiddenChild !== null) {
                  treeBaseDuration += hiddenChild.treeBaseDuration;
                  hiddenChild = hiddenChild.sibling;
                }

                _primaryChildFragment.treeBaseDuration = treeBaseDuration;
              } // Create a fragment from the fallback children, too.


              var _fallbackChildFragment = createFiberFromFragment(_nextFallbackChildren, mode, renderExpirationTime, null);

              _fallbackChildFragment.return = workInProgress;
              _primaryChildFragment.sibling = _fallbackChildFragment;
              _fallbackChildFragment.effectTag |= Placement;
              _primaryChildFragment.childExpirationTime = NoWork;
              workInProgress.memoizedState = SUSPENDED_MARKER;
              workInProgress.child = _primaryChildFragment; // Skip the primary children, and continue working on the
              // fallback children.

              return _fallbackChildFragment;
            }
          }
        } // The current tree already timed out. That means each child set is
        // wrapped in a fragment fiber.


        var currentPrimaryChildFragment = current.child;
        var currentFallbackChildFragment = currentPrimaryChildFragment.sibling;

        if (nextDidTimeout) {
          // Still timed out. Reuse the current primary children by cloning
          // its fragment. We're going to skip over these entirely.
          var _nextFallbackChildren2 = nextProps.fallback;

          var _primaryChildFragment2 = createWorkInProgress(currentPrimaryChildFragment, currentPrimaryChildFragment.pendingProps);

          _primaryChildFragment2.return = workInProgress;

          if ((workInProgress.mode & BlockingMode) === NoMode) {
            // Outside of blocking mode, we commit the effects from the
            // partially completed, timed-out tree, too.
            var _progressedState = workInProgress.memoizedState;

            var _progressedPrimaryChild = _progressedState !== null ? workInProgress.child.child : workInProgress.child;

            if (_progressedPrimaryChild !== currentPrimaryChildFragment.child) {
              _primaryChildFragment2.child = _progressedPrimaryChild;
              var _progressedChild2 = _progressedPrimaryChild;

              while (_progressedChild2 !== null) {
                _progressedChild2.return = _primaryChildFragment2;
                _progressedChild2 = _progressedChild2.sibling;
              }
            }
          } // Because primaryChildFragment is a new fiber that we're inserting as the
          // parent of a new tree, we need to set its treeBaseDuration.


          if ( workInProgress.mode & ProfileMode) {
            // treeBaseDuration is the sum of all the child tree base durations.
            var _treeBaseDuration = 0;
            var _hiddenChild = _primaryChildFragment2.child;

            while (_hiddenChild !== null) {
              _treeBaseDuration += _hiddenChild.treeBaseDuration;
              _hiddenChild = _hiddenChild.sibling;
            }

            _primaryChildFragment2.treeBaseDuration = _treeBaseDuration;
          } // Clone the fallback child fragment, too. These we'll continue
          // working on.


          var _fallbackChildFragment2 = createWorkInProgress(currentFallbackChildFragment, _nextFallbackChildren2);

          _fallbackChildFragment2.return = workInProgress;
          _primaryChildFragment2.sibling = _fallbackChildFragment2;
          _primaryChildFragment2.childExpirationTime = NoWork; // Skip the primary children, and continue working on the
          // fallback children.

          workInProgress.memoizedState = SUSPENDED_MARKER;
          workInProgress.child = _primaryChildFragment2;
          return _fallbackChildFragment2;
        } else {
          // No longer suspended. Switch back to showing the primary children,
          // and remove the intermediate fragment fiber.
          var _nextPrimaryChildren = nextProps.children;
          var currentPrimaryChild = currentPrimaryChildFragment.child;
          var primaryChild = reconcileChildFibers(workInProgress, currentPrimaryChild, _nextPrimaryChildren, renderExpirationTime); // If this render doesn't suspend, we need to delete the fallback
          // children. Wait until the complete phase, after we've confirmed the
          // fallback is no longer needed.
          // TODO: Would it be better to store the fallback fragment on
          // the stateNode?
          // Continue rendering the children, like we normally do.

          workInProgress.memoizedState = null;
          return workInProgress.child = primaryChild;
        }
      } else {
        // The current tree has not already timed out. That means the primary
        // children are not wrapped in a fragment fiber.
        var _currentPrimaryChild = current.child;

        if (nextDidTimeout) {
          // Timed out. Wrap the children in a fragment fiber to keep them
          // separate from the fallback children.
          var _nextFallbackChildren3 = nextProps.fallback;

          var _primaryChildFragment3 = createFiberFromFragment( // It shouldn't matter what the pending props are because we aren't
          // going to render this fragment.
          null, mode, NoWork, null);

          _primaryChildFragment3.return = workInProgress;
          _primaryChildFragment3.child = _currentPrimaryChild;

          if (_currentPrimaryChild !== null) {
            _currentPrimaryChild.return = _primaryChildFragment3;
          } // Even though we're creating a new fiber, there are no new children,
          // because we're reusing an already mounted tree. So we don't need to
          // schedule a placement.
          // primaryChildFragment.effectTag |= Placement;


          if ((workInProgress.mode & BlockingMode) === NoMode) {
            // Outside of blocking mode, we commit the effects from the
            // partially completed, timed-out tree, too.
            var _progressedState2 = workInProgress.memoizedState;

            var _progressedPrimaryChild2 = _progressedState2 !== null ? workInProgress.child.child : workInProgress.child;

            _primaryChildFragment3.child = _progressedPrimaryChild2;
            var _progressedChild3 = _progressedPrimaryChild2;

            while (_progressedChild3 !== null) {
              _progressedChild3.return = _primaryChildFragment3;
              _progressedChild3 = _progressedChild3.sibling;
            }
          } // Because primaryChildFragment is a new fiber that we're inserting as the
          // parent of a new tree, we need to set its treeBaseDuration.


          if ( workInProgress.mode & ProfileMode) {
            // treeBaseDuration is the sum of all the child tree base durations.
            var _treeBaseDuration2 = 0;
            var _hiddenChild2 = _primaryChildFragment3.child;

            while (_hiddenChild2 !== null) {
              _treeBaseDuration2 += _hiddenChild2.treeBaseDuration;
              _hiddenChild2 = _hiddenChild2.sibling;
            }

            _primaryChildFragment3.treeBaseDuration = _treeBaseDuration2;
          } // Create a fragment from the fallback children, too.


          var _fallbackChildFragment3 = createFiberFromFragment(_nextFallbackChildren3, mode, renderExpirationTime, null);

          _fallbackChildFragment3.return = workInProgress;
          _primaryChildFragment3.sibling = _fallbackChildFragment3;
          _fallbackChildFragment3.effectTag |= Placement;
          _primaryChildFragment3.childExpirationTime = NoWork; // Skip the primary children, and continue working on the
          // fallback children.

          workInProgress.memoizedState = SUSPENDED_MARKER;
          workInProgress.child = _primaryChildFragment3;
          return _fallbackChildFragment3;
        } else {
          // Still haven't timed out. Continue rendering the children, like we
          // normally do.
          workInProgress.memoizedState = null;
          var _nextPrimaryChildren2 = nextProps.children;
          return workInProgress.child = reconcileChildFibers(workInProgress, _currentPrimaryChild, _nextPrimaryChildren2, renderExpirationTime);
        }
      }
    }
  }

  function retrySuspenseComponentWithoutHydrating(current, workInProgress, renderExpirationTime) {
    // We're now not suspended nor dehydrated.
    workInProgress.memoizedState = null; // Retry with the full children.

    var nextProps = workInProgress.pendingProps;
    var nextChildren = nextProps.children; // This will ensure that the children get Placement effects and
    // that the old child gets a Deletion effect.
    // We could also call forceUnmountCurrentAndReconcile.

    reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime);
    return workInProgress.child;
  }

  function mountDehydratedSuspenseComponent(workInProgress, suspenseInstance, renderExpirationTime) {
    // During the first pass, we'll bail out and not drill into the children.
    // Instead, we'll leave the content in place and try to hydrate it later.
    if ((workInProgress.mode & BlockingMode) === NoMode) {
      {
        error('Cannot hydrate Suspense in legacy mode. Switch from ' + 'ReactDOM.hydrate(element, container) to ' + 'ReactDOM.createBlockingRoot(container, { hydrate: true })' + '.render(element) or remove the Suspense components from ' + 'the server rendered components.');
      }

      workInProgress.expirationTime = Sync;
    } else if (isSuspenseInstanceFallback(suspenseInstance)) {
      // This is a client-only boundary. Since we won't get any content from the server
      // for this, we need to schedule that at a higher priority based on when it would
      // have timed out. In theory we could render it in this pass but it would have the
      // wrong priority associated with it and will prevent hydration of parent path.
      // Instead, we'll leave work left on it to render it in a separate commit.
      // TODO This time should be the time at which the server rendered response that is
      // a parent to this boundary was displayed. However, since we currently don't have
      // a protocol to transfer that time, we'll just estimate it by using the current
      // time. This will mean that Suspense timeouts are slightly shifted to later than
      // they should be.
      var serverDisplayTime = requestCurrentTimeForUpdate(); // Schedule a normal pri update to render this content.

      var newExpirationTime = computeAsyncExpiration(serverDisplayTime);

      {
        markSpawnedWork(newExpirationTime);
      }

      workInProgress.expirationTime = newExpirationTime;
    } else {
      // We'll continue hydrating the rest at offscreen priority since we'll already
      // be showing the right content coming from the server, it is no rush.
      workInProgress.expirationTime = Never;

      {
        markSpawnedWork(Never);
      }
    }

    return null;
  }

  function updateDehydratedSuspenseComponent(current, workInProgress, suspenseInstance, suspenseState, renderExpirationTime) {
    // We should never be hydrating at this point because it is the first pass,
    // but after we've already committed once.
    warnIfHydrating();

    if ((workInProgress.mode & BlockingMode) === NoMode) {
      return retrySuspenseComponentWithoutHydrating(current, workInProgress, renderExpirationTime);
    }

    if (isSuspenseInstanceFallback(suspenseInstance)) {
      // This boundary is in a permanent fallback state. In this case, we'll never
      // get an update and we'll never be able to hydrate the final content. Let's just try the
      // client side render instead.
      return retrySuspenseComponentWithoutHydrating(current, workInProgress, renderExpirationTime);
    } // We use childExpirationTime to indicate that a child might depend on context, so if
    // any context has changed, we need to treat is as if the input might have changed.


    var hasContextChanged = current.childExpirationTime >= renderExpirationTime;

    if (didReceiveUpdate || hasContextChanged) {
      // This boundary has changed since the first render. This means that we are now unable to
      // hydrate it. We might still be able to hydrate it using an earlier expiration time, if
      // we are rendering at lower expiration than sync.
      if (renderExpirationTime < Sync) {
        if (suspenseState.retryTime <= renderExpirationTime) {
          // This render is even higher pri than we've seen before, let's try again
          // at even higher pri.
          var attemptHydrationAtExpirationTime = renderExpirationTime + 1;
          suspenseState.retryTime = attemptHydrationAtExpirationTime;
          scheduleWork(current, attemptHydrationAtExpirationTime); // TODO: Early abort this render.
        }
      } // If we have scheduled higher pri work above, this will probably just abort the render
      // since we now have higher priority work, but in case it doesn't, we need to prepare to
      // render something, if we time out. Even if that requires us to delete everything and
      // skip hydration.
      // Delay having to do this as long as the suspense timeout allows us.


      renderDidSuspendDelayIfPossible();
      return retrySuspenseComponentWithoutHydrating(current, workInProgress, renderExpirationTime);
    } else if (isSuspenseInstancePending(suspenseInstance)) {
      // This component is still pending more data from the server, so we can't hydrate its
      // content. We treat it as if this component suspended itself. It might seem as if
      // we could just try to render it client-side instead. However, this will perform a
      // lot of unnecessary work and is unlikely to complete since it often will suspend
      // on missing data anyway. Additionally, the server might be able to render more
      // than we can on the client yet. In that case we'd end up with more fallback states
      // on the client than if we just leave it alone. If the server times out or errors
      // these should update this boundary to the permanent Fallback state instead.
      // Mark it as having captured (i.e. suspended).
      workInProgress.effectTag |= DidCapture; // Leave the child in place. I.e. the dehydrated fragment.

      workInProgress.child = current.child; // Register a callback to retry this boundary once the server has sent the result.

      registerSuspenseInstanceRetry(suspenseInstance, retryDehydratedSuspenseBoundary.bind(null, current));
      return null;
    } else {
      // This is the first attempt.
      reenterHydrationStateFromDehydratedSuspenseInstance(workInProgress, suspenseInstance);
      var nextProps = workInProgress.pendingProps;
      var nextChildren = nextProps.children;
      var child = mountChildFibers(workInProgress, null, nextChildren, renderExpirationTime);
      var node = child;

      while (node) {
        // Mark each child as hydrating. This is a fast path to know whether this
        // tree is part of a hydrating tree. This is used to determine if a child
        // node has fully mounted yet, and for scheduling event replaying.
        // Conceptually this is similar to Placement in that a new subtree is
        // inserted into the React tree here. It just happens to not need DOM
        // mutations because it already exists.
        node.effectTag |= Hydrating;
        node = node.sibling;
      }

      workInProgress.child = child;
      return workInProgress.child;
    }
  }

  function scheduleWorkOnFiber(fiber, renderExpirationTime) {
    if (fiber.expirationTime < renderExpirationTime) {
      fiber.expirationTime = renderExpirationTime;
    }

    var alternate = fiber.alternate;

    if (alternate !== null && alternate.expirationTime < renderExpirationTime) {
      alternate.expirationTime = renderExpirationTime;
    }

    scheduleWorkOnParentPath(fiber.return, renderExpirationTime);
  }

  function propagateSuspenseContextChange(workInProgress, firstChild, renderExpirationTime) {
    // Mark any Suspense boundaries with fallbacks as having work to do.
    // If they were previously forced into fallbacks, they may now be able
    // to unblock.
    var node = firstChild;

    while (node !== null) {
      if (node.tag === SuspenseComponent) {
        var state = node.memoizedState;

        if (state !== null) {
          scheduleWorkOnFiber(node, renderExpirationTime);
        }
      } else if (node.tag === SuspenseListComponent) {
        // If the tail is hidden there might not be an Suspense boundaries
        // to schedule work on. In this case we have to schedule it on the
        // list itself.
        // We don't have to traverse to the children of the list since
        // the list will propagate the change when it rerenders.
        scheduleWorkOnFiber(node, renderExpirationTime);
      } else if (node.child !== null) {
        node.child.return = node;
        node = node.child;
        continue;
      }

      if (node === workInProgress) {
        return;
      }

      while (node.sibling === null) {
        if (node.return === null || node.return === workInProgress) {
          return;
        }

        node = node.return;
      }

      node.sibling.return = node.return;
      node = node.sibling;
    }
  }

  function findLastContentRow(firstChild) {
    // This is going to find the last row among these children that is already
    // showing content on the screen, as opposed to being in fallback state or
    // new. If a row has multiple Suspense boundaries, any of them being in the
    // fallback state, counts as the whole row being in a fallback state.
    // Note that the "rows" will be workInProgress, but any nested children
    // will still be current since we haven't rendered them yet. The mounted
    // order may not be the same as the new order. We use the new order.
    var row = firstChild;
    var lastContentRow = null;

    while (row !== null) {
      var currentRow = row.alternate; // New rows can't be content rows.

      if (currentRow !== null && findFirstSuspended(currentRow) === null) {
        lastContentRow = row;
      }

      row = row.sibling;
    }

    return lastContentRow;
  }

  function validateRevealOrder(revealOrder) {
    {
      if (revealOrder !== undefined && revealOrder !== 'forwards' && revealOrder !== 'backwards' && revealOrder !== 'together' && !didWarnAboutRevealOrder[revealOrder]) {
        didWarnAboutRevealOrder[revealOrder] = true;

        if (typeof revealOrder === 'string') {
          switch (revealOrder.toLowerCase()) {
            case 'together':
            case 'forwards':
            case 'backwards':
              {
                error('"%s" is not a valid value for revealOrder on <SuspenseList />. ' + 'Use lowercase "%s" instead.', revealOrder, revealOrder.toLowerCase());

                break;
              }

            case 'forward':
            case 'backward':
              {
                error('"%s" is not a valid value for revealOrder on <SuspenseList />. ' + 'React uses the -s suffix in the spelling. Use "%ss" instead.', revealOrder, revealOrder.toLowerCase());

                break;
              }

            default:
              error('"%s" is not a supported revealOrder on <SuspenseList />. ' + 'Did you mean "together", "forwards" or "backwards"?', revealOrder);

              break;
          }
        } else {
          error('%s is not a supported value for revealOrder on <SuspenseList />. ' + 'Did you mean "together", "forwards" or "backwards"?', revealOrder);
        }
      }
    }
  }

  function validateTailOptions(tailMode, revealOrder) {
    {
      if (tailMode !== undefined && !didWarnAboutTailOptions[tailMode]) {
        if (tailMode !== 'collapsed' && tailMode !== 'hidden') {
          didWarnAboutTailOptions[tailMode] = true;

          error('"%s" is not a supported value for tail on <SuspenseList />. ' + 'Did you mean "collapsed" or "hidden"?', tailMode);
        } else if (revealOrder !== 'forwards' && revealOrder !== 'backwards') {
          didWarnAboutTailOptions[tailMode] = true;

          error('<SuspenseList tail="%s" /> is only valid if revealOrder is ' + '"forwards" or "backwards". ' + 'Did you mean to specify revealOrder="forwards"?', tailMode);
        }
      }
    }
  }

  function validateSuspenseListNestedChild(childSlot, index) {
    {
      var isArray = Array.isArray(childSlot);
      var isIterable = !isArray && typeof getIteratorFn(childSlot) === 'function';

      if (isArray || isIterable) {
        var type = isArray ? 'array' : 'iterable';

        error('A nested %s was passed to row #%s in <SuspenseList />. Wrap it in ' + 'an additional SuspenseList to configure its revealOrder: ' + '<SuspenseList revealOrder=...> ... ' + '<SuspenseList revealOrder=...>{%s}</SuspenseList> ... ' + '</SuspenseList>', type, index, type);

        return false;
      }
    }

    return true;
  }

  function validateSuspenseListChildren(children, revealOrder) {
    {
      if ((revealOrder === 'forwards' || revealOrder === 'backwards') && children !== undefined && children !== null && children !== false) {
        if (Array.isArray(children)) {
          for (var i = 0; i < children.length; i++) {
            if (!validateSuspenseListNestedChild(children[i], i)) {
              return;
            }
          }
        } else {
          var iteratorFn = getIteratorFn(children);

          if (typeof iteratorFn === 'function') {
            var childrenIterator = iteratorFn.call(children);

            if (childrenIterator) {
              var step = childrenIterator.next();
              var _i = 0;

              for (; !step.done; step = childrenIterator.next()) {
                if (!validateSuspenseListNestedChild(step.value, _i)) {
                  return;
                }

                _i++;
              }
            }
          } else {
            error('A single row was passed to a <SuspenseList revealOrder="%s" />. ' + 'This is not useful since it needs multiple rows. ' + 'Did you mean to pass multiple children or an array?', revealOrder);
          }
        }
      }
    }
  }

  function initSuspenseListRenderState(workInProgress, isBackwards, tail, lastContentRow, tailMode, lastEffectBeforeRendering) {
    var renderState = workInProgress.memoizedState;

    if (renderState === null) {
      workInProgress.memoizedState = {
        isBackwards: isBackwards,
        rendering: null,
        renderingStartTime: 0,
        last: lastContentRow,
        tail: tail,
        tailExpiration: 0,
        tailMode: tailMode,
        lastEffect: lastEffectBeforeRendering
      };
    } else {
      // We can reuse the existing object from previous renders.
      renderState.isBackwards = isBackwards;
      renderState.rendering = null;
      renderState.renderingStartTime = 0;
      renderState.last = lastContentRow;
      renderState.tail = tail;
      renderState.tailExpiration = 0;
      renderState.tailMode = tailMode;
      renderState.lastEffect = lastEffectBeforeRendering;
    }
  } // This can end up rendering this component multiple passes.
  // The first pass splits the children fibers into two sets. A head and tail.
  // We first render the head. If anything is in fallback state, we do another
  // pass through beginWork to rerender all children (including the tail) with
  // the force suspend context. If the first render didn't have anything in
  // in fallback state. Then we render each row in the tail one-by-one.
  // That happens in the completeWork phase without going back to beginWork.


  function updateSuspenseListComponent(current, workInProgress, renderExpirationTime) {
    var nextProps = workInProgress.pendingProps;
    var revealOrder = nextProps.revealOrder;
    var tailMode = nextProps.tail;
    var newChildren = nextProps.children;
    validateRevealOrder(revealOrder);
    validateTailOptions(tailMode, revealOrder);
    validateSuspenseListChildren(newChildren, revealOrder);
    reconcileChildren(current, workInProgress, newChildren, renderExpirationTime);
    var suspenseContext = suspenseStackCursor.current;
    var shouldForceFallback = hasSuspenseContext(suspenseContext, ForceSuspenseFallback);

    if (shouldForceFallback) {
      suspenseContext = setShallowSuspenseContext(suspenseContext, ForceSuspenseFallback);
      workInProgress.effectTag |= DidCapture;
    } else {
      var didSuspendBefore = current !== null && (current.effectTag & DidCapture) !== NoEffect;

      if (didSuspendBefore) {
        // If we previously forced a fallback, we need to schedule work
        // on any nested boundaries to let them know to try to render
        // again. This is the same as context updating.
        propagateSuspenseContextChange(workInProgress, workInProgress.child, renderExpirationTime);
      }

      suspenseContext = setDefaultShallowSuspenseContext(suspenseContext);
    }

    pushSuspenseContext(workInProgress, suspenseContext);

    if ((workInProgress.mode & BlockingMode) === NoMode) {
      // Outside of blocking mode, SuspenseList doesn't work so we just
      // use make it a noop by treating it as the default revealOrder.
      workInProgress.memoizedState = null;
    } else {
      switch (revealOrder) {
        case 'forwards':
          {
            var lastContentRow = findLastContentRow(workInProgress.child);
            var tail;

            if (lastContentRow === null) {
              // The whole list is part of the tail.
              // TODO: We could fast path by just rendering the tail now.
              tail = workInProgress.child;
              workInProgress.child = null;
            } else {
              // Disconnect the tail rows after the content row.
              // We're going to render them separately later.
              tail = lastContentRow.sibling;
              lastContentRow.sibling = null;
            }

            initSuspenseListRenderState(workInProgress, false, // isBackwards
            tail, lastContentRow, tailMode, workInProgress.lastEffect);
            break;
          }

        case 'backwards':
          {
            // We're going to find the first row that has existing content.
            // At the same time we're going to reverse the list of everything
            // we pass in the meantime. That's going to be our tail in reverse
            // order.
            var _tail = null;
            var row = workInProgress.child;
            workInProgress.child = null;

            while (row !== null) {
              var currentRow = row.alternate; // New rows can't be content rows.

              if (currentRow !== null && findFirstSuspended(currentRow) === null) {
                // This is the beginning of the main content.
                workInProgress.child = row;
                break;
              }

              var nextRow = row.sibling;
              row.sibling = _tail;
              _tail = row;
              row = nextRow;
            } // TODO: If workInProgress.child is null, we can continue on the tail immediately.


            initSuspenseListRenderState(workInProgress, true, // isBackwards
            _tail, null, // last
            tailMode, workInProgress.lastEffect);
            break;
          }

        case 'together':
          {
            initSuspenseListRenderState(workInProgress, false, // isBackwards
            null, // tail
            null, // last
            undefined, workInProgress.lastEffect);
            break;
          }

        default:
          {
            // The default reveal order is the same as not having
            // a boundary.
            workInProgress.memoizedState = null;
          }
      }
    }

    return workInProgress.child;
  }

  function updatePortalComponent(current, workInProgress, renderExpirationTime) {
    pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo);
    var nextChildren = workInProgress.pendingProps;

    if (current === null) {
      // Portals are special because we don't append the children during mount
      // but at commit. Therefore we need to track insertions which the normal
      // flow doesn't do during mount. This doesn't happen at the root because
      // the root always starts with a "current" with a null child.
      // TODO: Consider unifying this with how the root works.
      workInProgress.child = reconcileChildFibers(workInProgress, null, nextChildren, renderExpirationTime);
    } else {
      reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime);
    }

    return workInProgress.child;
  }

  function updateContextProvider(current, workInProgress, renderExpirationTime) {
    var providerType = workInProgress.type;
    var context = providerType._context;
    var newProps = workInProgress.pendingProps;
    var oldProps = workInProgress.memoizedProps;
    var newValue = newProps.value;

    {
      var providerPropTypes = workInProgress.type.propTypes;

      if (providerPropTypes) {
        checkPropTypes_1(providerPropTypes, newProps, 'prop', 'Context.Provider', getCurrentFiberStackInDev);
      }
    }

    pushProvider(workInProgress, newValue);

    if (oldProps !== null) {
      var oldValue = oldProps.value;
      var changedBits = calculateChangedBits(context, newValue, oldValue);

      if (changedBits === 0) {
        // No change. Bailout early if children are the same.
        if (oldProps.children === newProps.children && !hasContextChanged()) {
          return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime);
        }
      } else {
        // The context value changed. Search for matching consumers and schedule
        // them to update.
        propagateContextChange(workInProgress, context, changedBits, renderExpirationTime);
      }
    }

    var newChildren = newProps.children;
    reconcileChildren(current, workInProgress, newChildren, renderExpirationTime);
    return workInProgress.child;
  }

  var hasWarnedAboutUsingContextAsConsumer = false;

  function updateContextConsumer(current, workInProgress, renderExpirationTime) {
    var context = workInProgress.type; // The logic below for Context differs depending on PROD or DEV mode. In
    // DEV mode, we create a separate object for Context.Consumer that acts
    // like a proxy to Context. This proxy object adds unnecessary code in PROD
    // so we use the old behaviour (Context.Consumer references Context) to
    // reduce size and overhead. The separate object references context via
    // a property called "_context", which also gives us the ability to check
    // in DEV mode if this property exists or not and warn if it does not.

    {
      if (context._context === undefined) {
        // This may be because it's a Context (rather than a Consumer).
        // Or it may be because it's older React where they're the same thing.
        // We only want to warn if we're sure it's a new React.
        if (context !== context.Consumer) {
          if (!hasWarnedAboutUsingContextAsConsumer) {
            hasWarnedAboutUsingContextAsConsumer = true;

            error('Rendering <Context> directly is not supported and will be removed in ' + 'a future major release. Did you mean to render <Context.Consumer> instead?');
          }
        }
      } else {
        context = context._context;
      }
    }

    var newProps = workInProgress.pendingProps;
    var render = newProps.children;

    {
      if (typeof render !== 'function') {
        error('A context consumer was rendered with multiple children, or a child ' + "that isn't a function. A context consumer expects a single child " + 'that is a function. If you did pass a function, make sure there ' + 'is no trailing or leading whitespace around it.');
      }
    }

    prepareToReadContext(workInProgress, renderExpirationTime);
    var newValue = readContext(context, newProps.unstable_observedBits);
    var newChildren;

    {
      ReactCurrentOwner$1.current = workInProgress;
      setIsRendering(true);
      newChildren = render(newValue);
      setIsRendering(false);
    } // React DevTools reads this flag.


    workInProgress.effectTag |= PerformedWork;
    reconcileChildren(current, workInProgress, newChildren, renderExpirationTime);
    return workInProgress.child;
  }

  function markWorkInProgressReceivedUpdate() {
    didReceiveUpdate = true;
  }

  function bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime) {
    cancelWorkTimer(workInProgress);

    if (current !== null) {
      // Reuse previous dependencies
      workInProgress.dependencies = current.dependencies;
    }

    {
      // Don't update "base" render times for bailouts.
      stopProfilerTimerIfRunning();
    }

    var updateExpirationTime = workInProgress.expirationTime;

    if (updateExpirationTime !== NoWork) {
      markUnprocessedUpdateTime(updateExpirationTime);
    } // Check if the children have any pending work.


    var childExpirationTime = workInProgress.childExpirationTime;

    if (childExpirationTime < renderExpirationTime) {
      // The children don't have any work either. We can skip them.
      // TODO: Once we add back resuming, we should check if the children are
      // a work-in-progress set. If so, we need to transfer their effects.
      return null;
    } else {
      // This fiber doesn't have work, but its subtree does. Clone the child
      // fibers and continue.
      cloneChildFibers(current, workInProgress);
      return workInProgress.child;
    }
  }

  function remountFiber(current, oldWorkInProgress, newWorkInProgress) {
    {
      var returnFiber = oldWorkInProgress.return;

      if (returnFiber === null) {
        throw new Error('Cannot swap the root fiber.');
      } // Disconnect from the old current.
      // It will get deleted.


      current.alternate = null;
      oldWorkInProgress.alternate = null; // Connect to the new tree.

      newWorkInProgress.index = oldWorkInProgress.index;
      newWorkInProgress.sibling = oldWorkInProgress.sibling;
      newWorkInProgress.return = oldWorkInProgress.return;
      newWorkInProgress.ref = oldWorkInProgress.ref; // Replace the child/sibling pointers above it.

      if (oldWorkInProgress === returnFiber.child) {
        returnFiber.child = newWorkInProgress;
      } else {
        var prevSibling = returnFiber.child;

        if (prevSibling === null) {
          throw new Error('Expected parent to have a child.');
        }

        while (prevSibling.sibling !== oldWorkInProgress) {
          prevSibling = prevSibling.sibling;

          if (prevSibling === null) {
            throw new Error('Expected to find the previous sibling.');
          }
        }

        prevSibling.sibling = newWorkInProgress;
      } // Delete the old fiber and place the new one.
      // Since the old fiber is disconnected, we have to schedule it manually.


      var last = returnFiber.lastEffect;

      if (last !== null) {
        last.nextEffect = current;
        returnFiber.lastEffect = current;
      } else {
        returnFiber.firstEffect = returnFiber.lastEffect = current;
      }

      current.nextEffect = null;
      current.effectTag = Deletion;
      newWorkInProgress.effectTag |= Placement; // Restart work from the new fiber.

      return newWorkInProgress;
    }
  }

  function beginWork(current, workInProgress, renderExpirationTime) {
    var updateExpirationTime = workInProgress.expirationTime;

    {
      if (workInProgress._debugNeedsRemount && current !== null) {
        // This will restart the begin phase with a new fiber.
        return remountFiber(current, workInProgress, createFiberFromTypeAndProps(workInProgress.type, workInProgress.key, workInProgress.pendingProps, workInProgress._debugOwner || null, workInProgress.mode, workInProgress.expirationTime));
      }
    }

    if (current !== null) {
      var oldProps = current.memoizedProps;
      var newProps = workInProgress.pendingProps;

      if (oldProps !== newProps || hasContextChanged() || ( // Force a re-render if the implementation changed due to hot reload:
       workInProgress.type !== current.type )) {
        // If props or context changed, mark the fiber as having performed work.
        // This may be unset if the props are determined to be equal later (memo).
        didReceiveUpdate = true;
      } else if (updateExpirationTime < renderExpirationTime) {
        didReceiveUpdate = false; // This fiber does not have any pending work. Bailout without entering
        // the begin phase. There's still some bookkeeping we that needs to be done
        // in this optimized path, mostly pushing stuff onto the stack.

        switch (workInProgress.tag) {
          case HostRoot:
            pushHostRootContext(workInProgress);
            resetHydrationState();
            break;

          case HostComponent:
            pushHostContext(workInProgress);

            if (workInProgress.mode & ConcurrentMode && renderExpirationTime !== Never && shouldDeprioritizeSubtree(workInProgress.type, newProps)) {
              {
                markSpawnedWork(Never);
              } // Schedule this fiber to re-render at offscreen priority. Then bailout.


              workInProgress.expirationTime = workInProgress.childExpirationTime = Never;
              return null;
            }

            break;

          case ClassComponent:
            {
              var Component = workInProgress.type;

              if (isContextProvider(Component)) {
                pushContextProvider(workInProgress);
              }

              break;
            }

          case HostPortal:
            pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo);
            break;

          case ContextProvider:
            {
              var newValue = workInProgress.memoizedProps.value;
              pushProvider(workInProgress, newValue);
              break;
            }

          case Profiler:
            {
              // Profiler should only call onRender when one of its descendants actually rendered.
              var hasChildWork = workInProgress.childExpirationTime >= renderExpirationTime;

              if (hasChildWork) {
                workInProgress.effectTag |= Update;
              }
            }

            break;

          case SuspenseComponent:
            {
              var state = workInProgress.memoizedState;

              if (state !== null) {
                {
                  if (state.dehydrated !== null) {
                    pushSuspenseContext(workInProgress, setDefaultShallowSuspenseContext(suspenseStackCursor.current)); // We know that this component will suspend again because if it has
                    // been unsuspended it has committed as a resolved Suspense component.
                    // If it needs to be retried, it should have work scheduled on it.

                    workInProgress.effectTag |= DidCapture;
                    break;
                  }
                } // If this boundary is currently timed out, we need to decide
                // whether to retry the primary children, or to skip over it and
                // go straight to the fallback. Check the priority of the primary
                // child fragment.


                var primaryChildFragment = workInProgress.child;
                var primaryChildExpirationTime = primaryChildFragment.childExpirationTime;

                if (primaryChildExpirationTime !== NoWork && primaryChildExpirationTime >= renderExpirationTime) {
                  // The primary children have pending work. Use the normal path
                  // to attempt to render the primary children again.
                  return updateSuspenseComponent(current, workInProgress, renderExpirationTime);
                } else {
                  pushSuspenseContext(workInProgress, setDefaultShallowSuspenseContext(suspenseStackCursor.current)); // The primary children do not have pending work with sufficient
                  // priority. Bailout.

                  var child = bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime);

                  if (child !== null) {
                    // The fallback children have pending work. Skip over the
                    // primary children and work on the fallback.
                    return child.sibling;
                  } else {
                    return null;
                  }
                }
              } else {
                pushSuspenseContext(workInProgress, setDefaultShallowSuspenseContext(suspenseStackCursor.current));
              }

              break;
            }

          case SuspenseListComponent:
            {
              var didSuspendBefore = (current.effectTag & DidCapture) !== NoEffect;

              var _hasChildWork = workInProgress.childExpirationTime >= renderExpirationTime;

              if (didSuspendBefore) {
                if (_hasChildWork) {
                  // If something was in fallback state last time, and we have all the
                  // same children then we're still in progressive loading state.
                  // Something might get unblocked by state updates or retries in the
                  // tree which will affect the tail. So we need to use the normal
                  // path to compute the correct tail.
                  return updateSuspenseListComponent(current, workInProgress, renderExpirationTime);
                } // If none of the children had any work, that means that none of
                // them got retried so they'll still be blocked in the same way
                // as before. We can fast bail out.


                workInProgress.effectTag |= DidCapture;
              } // If nothing suspended before and we're rendering the same children,
              // then the tail doesn't matter. Anything new that suspends will work
              // in the "together" mode, so we can continue from the state we had.


              var renderState = workInProgress.memoizedState;

              if (renderState !== null) {
                // Reset to the "together" mode in case we've started a different
                // update in the past but didn't complete it.
                renderState.rendering = null;
                renderState.tail = null;
              }

              pushSuspenseContext(workInProgress, suspenseStackCursor.current);

              if (_hasChildWork) {
                break;
              } else {
                // If none of the children had any work, that means that none of
                // them got retried so they'll still be blocked in the same way
                // as before. We can fast bail out.
                return null;
              }
            }
        }

        return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime);
      } else {
        // An update was scheduled on this fiber, but there are no new props
        // nor legacy context. Set this to false. If an update queue or context
        // consumer produces a changed value, it will set this to true. Otherwise,
        // the component will assume the children have not changed and bail out.
        didReceiveUpdate = false;
      }
    } else {
      didReceiveUpdate = false;
    } // Before entering the begin phase, clear pending update priority.
    // TODO: This assumes that we're about to evaluate the component and process
    // the update queue. However, there's an exception: SimpleMemoComponent
    // sometimes bails out later in the begin phase. This indicates that we should
    // move this assignment out of the common path and into each branch.


    workInProgress.expirationTime = NoWork;

    switch (workInProgress.tag) {
      case IndeterminateComponent:
        {
          return mountIndeterminateComponent(current, workInProgress, workInProgress.type, renderExpirationTime);
        }

      case LazyComponent:
        {
          var elementType = workInProgress.elementType;
          return mountLazyComponent(current, workInProgress, elementType, updateExpirationTime, renderExpirationTime);
        }

      case FunctionComponent:
        {
          var _Component = workInProgress.type;
          var unresolvedProps = workInProgress.pendingProps;
          var resolvedProps = workInProgress.elementType === _Component ? unresolvedProps : resolveDefaultProps(_Component, unresolvedProps);
          return updateFunctionComponent(current, workInProgress, _Component, resolvedProps, renderExpirationTime);
        }

      case ClassComponent:
        {
          var _Component2 = workInProgress.type;
          var _unresolvedProps = workInProgress.pendingProps;

          var _resolvedProps = workInProgress.elementType === _Component2 ? _unresolvedProps : resolveDefaultProps(_Component2, _unresolvedProps);

          return updateClassComponent(current, workInProgress, _Component2, _resolvedProps, renderExpirationTime);
        }

      case HostRoot:
        return updateHostRoot(current, workInProgress, renderExpirationTime);

      case HostComponent:
        return updateHostComponent(current, workInProgress, renderExpirationTime);

      case HostText:
        return updateHostText(current, workInProgress);

      case SuspenseComponent:
        return updateSuspenseComponent(current, workInProgress, renderExpirationTime);

      case HostPortal:
        return updatePortalComponent(current, workInProgress, renderExpirationTime);

      case ForwardRef:
        {
          var type = workInProgress.type;
          var _unresolvedProps2 = workInProgress.pendingProps;

          var _resolvedProps2 = workInProgress.elementType === type ? _unresolvedProps2 : resolveDefaultProps(type, _unresolvedProps2);

          return updateForwardRef(current, workInProgress, type, _resolvedProps2, renderExpirationTime);
        }

      case Fragment:
        return updateFragment(current, workInProgress, renderExpirationTime);

      case Mode:
        return updateMode(current, workInProgress, renderExpirationTime);

      case Profiler:
        return updateProfiler(current, workInProgress, renderExpirationTime);

      case ContextProvider:
        return updateContextProvider(current, workInProgress, renderExpirationTime);

      case ContextConsumer:
        return updateContextConsumer(current, workInProgress, renderExpirationTime);

      case MemoComponent:
        {
          var _type2 = workInProgress.type;
          var _unresolvedProps3 = workInProgress.pendingProps; // Resolve outer props first, then resolve inner props.

          var _resolvedProps3 = resolveDefaultProps(_type2, _unresolvedProps3);

          {
            if (workInProgress.type !== workInProgress.elementType) {
              var outerPropTypes = _type2.propTypes;

              if (outerPropTypes) {
                checkPropTypes_1(outerPropTypes, _resolvedProps3, // Resolved for outer only
                'prop', getComponentName(_type2), getCurrentFiberStackInDev);
              }
            }
          }

          _resolvedProps3 = resolveDefaultProps(_type2.type, _resolvedProps3);
          return updateMemoComponent(current, workInProgress, _type2, _resolvedProps3, updateExpirationTime, renderExpirationTime);
        }

      case SimpleMemoComponent:
        {
          return updateSimpleMemoComponent(current, workInProgress, workInProgress.type, workInProgress.pendingProps, updateExpirationTime, renderExpirationTime);
        }

      case IncompleteClassComponent:
        {
          var _Component3 = workInProgress.type;
          var _unresolvedProps4 = workInProgress.pendingProps;

          var _resolvedProps4 = workInProgress.elementType === _Component3 ? _unresolvedProps4 : resolveDefaultProps(_Component3, _unresolvedProps4);

          return mountIncompleteClassComponent(current, workInProgress, _Component3, _resolvedProps4, renderExpirationTime);
        }

      case SuspenseListComponent:
        {
          return updateSuspenseListComponent(current, workInProgress, renderExpirationTime);
        }

      case FundamentalComponent:
        {

          break;
        }

      case ScopeComponent:
        {

          break;
        }

      case Block:
        {
          {
            var block = workInProgress.type;
            var props = workInProgress.pendingProps;
            return updateBlock(current, workInProgress, block, props, renderExpirationTime);
          }
        }
    }

    {
      {
        throw Error( "Unknown unit of work tag (" + workInProgress.tag + "). This error is likely caused by a bug in React. Please file an issue." );
      }
    }
  }