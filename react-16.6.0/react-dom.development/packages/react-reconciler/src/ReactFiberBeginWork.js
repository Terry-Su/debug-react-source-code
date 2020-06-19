var ReactCurrentOwner$3 = ReactSharedInternals.ReactCurrentOwner;

var didWarnAboutBadClass = void 0;
var didWarnAboutContextTypeOnFunctionComponent = void 0;
var didWarnAboutGetDerivedStateOnFunctionComponent = void 0;
var didWarnAboutFunctionRefs = void 0;

{
  didWarnAboutBadClass = {};
  didWarnAboutContextTypeOnFunctionComponent = {};
  didWarnAboutGetDerivedStateOnFunctionComponent = {};
  didWarnAboutFunctionRefs = {};
}

function reconcileChildren(current$$1, workInProgress, nextChildren, renderExpirationTime) {
  if (current$$1 === null) {
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
    workInProgress.child = reconcileChildFibers(workInProgress, current$$1.child, nextChildren, renderExpirationTime);
  }
}

function forceUnmountCurrentAndReconcile(current$$1, workInProgress, nextChildren, renderExpirationTime) {
  // This function is fork of reconcileChildren. It's used in cases where we
  // want to reconcile without matching against the existing set. This has the
  // effect of all current children being unmounted; even if the type and key
  // are the same, the old child is unmounted and a new child is created.
  //
  // To do this, we're going to go through the reconcile algorithm twice. In
  // the first pass, we schedule a deletion for all the current children by
  // passing null.
  workInProgress.child = reconcileChildFibers(workInProgress, current$$1.child, null, renderExpirationTime);
  // In the second pass, we mount the new children. The trick here is that we
  // pass null in place of where we usually pass the current child set. This has
  // the effect of remounting all children regardless of whether their their
  // identity matches.
  workInProgress.child = reconcileChildFibers(workInProgress, null, nextChildren, renderExpirationTime);
}

function updateForwardRef(current$$1, workInProgress, type, nextProps, renderExpirationTime) {
  var render = type.render;
  var ref = workInProgress.ref;
  if (hasContextChanged()) {
    // Normally we can bail out on props equality but if context has changed
    // we don't do the bailout and we have to reuse existing props instead.
  } else if (workInProgress.memoizedProps === nextProps) {
    var currentRef = current$$1 !== null ? current$$1.ref : null;
    if (ref === currentRef) {
      return bailoutOnAlreadyFinishedWork(current$$1, workInProgress, renderExpirationTime);
    }
  }

  var nextChildren = void 0;
  {
    ReactCurrentOwner$3.current = workInProgress;
    setCurrentPhase('render');
    nextChildren = render(nextProps, ref);
    setCurrentPhase(null);
  }

  reconcileChildren(current$$1, workInProgress, nextChildren, renderExpirationTime);
  return workInProgress.child;
}

function updateMemoComponent(current$$1, workInProgress, Component, nextProps, updateExpirationTime, renderExpirationTime) {
  if (current$$1 === null) {
    var type = Component.type;
    if (isSimpleFunctionComponent(type) && Component.compare === null) {
      // If this is a plain function component without default props,
      // and with only the default shallow comparison, we upgrade it
      // to a SimpleMemoComponent to allow fast path updates.
      workInProgress.tag = SimpleMemoComponent;
      workInProgress.type = type;
      return updateSimpleMemoComponent(current$$1, workInProgress, type, nextProps, updateExpirationTime, renderExpirationTime);
    }
    var child = createFiberFromTypeAndProps(Component.type, null, nextProps, null, workInProgress.mode, renderExpirationTime);
    child.ref = workInProgress.ref;
    child.return = workInProgress;
    workInProgress.child = child;
    return child;
  }
  var currentChild = current$$1.child; // This is always exactly one child
  if (updateExpirationTime === NoWork || updateExpirationTime > renderExpirationTime) {
    // This will be the props with resolved defaultProps,
    // unlike current.memoizedProps which will be the unresolved ones.
    var prevProps = currentChild.memoizedProps;
    // Default to shallow comparison
    var compare = Component.compare;
    compare = compare !== null ? compare : shallowEqual;
    if (compare(prevProps, nextProps) && current$$1.ref === workInProgress.ref) {
      return bailoutOnAlreadyFinishedWork(current$$1, workInProgress, renderExpirationTime);
    }
  }
  var newChild = createWorkInProgress(currentChild, nextProps, renderExpirationTime);
  newChild.ref = workInProgress.ref;
  newChild.return = workInProgress;
  workInProgress.child = newChild;
  return newChild;
}

function updateSimpleMemoComponent(current$$1, workInProgress, Component, nextProps, updateExpirationTime, renderExpirationTime) {
  if (current$$1 !== null && (updateExpirationTime === NoWork || updateExpirationTime > renderExpirationTime)) {
    var prevProps = current$$1.memoizedProps;
    if (shallowEqual(prevProps, nextProps) && current$$1.ref === workInProgress.ref) {
      return bailoutOnAlreadyFinishedWork(current$$1, workInProgress, renderExpirationTime);
    }
  }
  return updateFunctionComponent(current$$1, workInProgress, Component, nextProps, renderExpirationTime);
}

function updateFragment(current$$1, workInProgress, renderExpirationTime) {
  var nextChildren = workInProgress.pendingProps;
  reconcileChildren(current$$1, workInProgress, nextChildren, renderExpirationTime);
  return workInProgress.child;
}

function updateMode(current$$1, workInProgress, renderExpirationTime) {
  var nextChildren = workInProgress.pendingProps.children;
  reconcileChildren(current$$1, workInProgress, nextChildren, renderExpirationTime);
  return workInProgress.child;
}

function updateProfiler(current$$1, workInProgress, renderExpirationTime) {
  if (enableProfilerTimer) {
    workInProgress.effectTag |= Update;
  }
  var nextProps = workInProgress.pendingProps;
  var nextChildren = nextProps.children;
  reconcileChildren(current$$1, workInProgress, nextChildren, renderExpirationTime);
  return workInProgress.child;
}

function markRef(current$$1, workInProgress) {
  var ref = workInProgress.ref;
  if (current$$1 === null && ref !== null || current$$1 !== null && current$$1.ref !== ref) {
    // Schedule a Ref effect
    workInProgress.effectTag |= Ref;
  }
}

function updateFunctionComponent(current$$1, workInProgress, Component, nextProps, renderExpirationTime) {
  var unmaskedContext = getUnmaskedContext(workInProgress, Component, true);
  var context = getMaskedContext(workInProgress, unmaskedContext);

  var nextChildren = void 0;
  prepareToReadContext(workInProgress, renderExpirationTime);
  {
    ReactCurrentOwner$3.current = workInProgress;
    setCurrentPhase('render');
    nextChildren = Component(nextProps, context);
    setCurrentPhase(null);
  }

  // React DevTools reads this flag.
  workInProgress.effectTag |= PerformedWork;
  reconcileChildren(current$$1, workInProgress, nextChildren, renderExpirationTime);
  return workInProgress.child;
}

function updateClassComponent(current$$1, workInProgress, Component, nextProps, renderExpirationTime) {
  // Push context providers early to prevent context stack mismatches.
  // During mounting we don't know the child context yet as the instance doesn't exist.
  // We will invalidate the child context in finishClassComponent() right after rendering.
  var hasContext = void 0;
  if (isContextProvider(Component)) {
    hasContext = true;
    pushContextProvider(workInProgress);
  } else {
    hasContext = false;
  }
  prepareToReadContext(workInProgress, renderExpirationTime);

  var instance = workInProgress.stateNode;
  var shouldUpdate = void 0;
  if (instance === null) {
    if (current$$1 !== null) {
      // An class component without an instance only mounts if it suspended
      // inside a non- concurrent tree, in an inconsistent state. We want to
      // tree it like a new mount, even though an empty version of it already
      // committed. Disconnect the alternate pointers.
      current$$1.alternate = null;
      workInProgress.alternate = null;
      // Since this is conceptually a new fiber, schedule a Placement effect
      workInProgress.effectTag |= Placement;
    }
    // In the initial pass we might need to construct the instance.
    constructClassInstance(workInProgress, Component, nextProps, renderExpirationTime);
    mountClassInstance(workInProgress, Component, nextProps, renderExpirationTime);
    shouldUpdate = true;
  } else if (current$$1 === null) {
    // In a resume, we'll already have an instance we can reuse.
    shouldUpdate = resumeMountClassInstance(workInProgress, Component, nextProps, renderExpirationTime);
  } else {
    shouldUpdate = updateClassInstance(current$$1, workInProgress, Component, nextProps, renderExpirationTime);
  }
  return finishClassComponent(current$$1, workInProgress, Component, shouldUpdate, hasContext, renderExpirationTime);
}

function finishClassComponent(current$$1, workInProgress, Component, shouldUpdate, hasContext, renderExpirationTime) {
  // Refs should update even if shouldComponentUpdate returns false
  markRef(current$$1, workInProgress);

  var didCaptureError = (workInProgress.effectTag & DidCapture) !== NoEffect;

  if (!shouldUpdate && !didCaptureError) {
    // Context providers should defer to sCU for rendering
    if (hasContext) {
      invalidateContextProvider(workInProgress, Component, false);
    }

    return bailoutOnAlreadyFinishedWork(current$$1, workInProgress, renderExpirationTime);
  }

  var instance = workInProgress.stateNode;

  // Rerender
  ReactCurrentOwner$3.current = workInProgress;
  var nextChildren = void 0;
  if (didCaptureError && typeof Component.getDerivedStateFromError !== 'function') {
    // If we captured an error, but getDerivedStateFrom catch is not defined,
    // unmount all the children. componentDidCatch will schedule an update to
    // re-render a fallback. This is temporary until we migrate everyone to
    // the new API.
    // TODO: Warn in a future release.
    nextChildren = null;

    if (enableProfilerTimer) {
      stopProfilerTimerIfRunning(workInProgress);
    }
  } else {
    {
      setCurrentPhase('render');
      nextChildren = instance.render();
      if (debugRenderPhaseSideEffects || debugRenderPhaseSideEffectsForStrictMode && workInProgress.mode & StrictMode) {
        instance.render();
      }
      setCurrentPhase(null);
    }
  }

  // React DevTools reads this flag.
  workInProgress.effectTag |= PerformedWork;
  if (current$$1 !== null && didCaptureError) {
    // If we're recovering from an error, reconcile without reusing any of
    // the existing children. Conceptually, the normal children and the children
    // that are shown on error are two different sets, so we shouldn't reuse
    // normal children even if their identities match.
    forceUnmountCurrentAndReconcile(current$$1, workInProgress, nextChildren, renderExpirationTime);
  } else {
    reconcileChildren(current$$1, workInProgress, nextChildren, renderExpirationTime);
  }

  // Memoize state using the values we just used to render.
  // TODO: Restructure so we never read values from the instance.
  workInProgress.memoizedState = instance.state;

  // The context might have changed so we need to recalculate it.
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

function updateHostRoot(current$$1, workInProgress, renderExpirationTime) {
  pushHostRootContext(workInProgress);
  var updateQueue = workInProgress.updateQueue;
  !(updateQueue !== null) ? invariant(false, 'If the root does not have an updateQueue, we should have already bailed out. This error is likely caused by a bug in React. Please file an issue.') : void 0;
  var nextProps = workInProgress.pendingProps;
  var prevState = workInProgress.memoizedState;
  var prevChildren = prevState !== null ? prevState.element : null;
  processUpdateQueue(workInProgress, updateQueue, nextProps, null, renderExpirationTime);
  var nextState = workInProgress.memoizedState;
  // Caution: React DevTools currently depends on this property
  // being called "element".
  var nextChildren = nextState.element;
  if (nextChildren === prevChildren) {
    // If the state is the same as before, that's a bailout because we had
    // no work that expires at this time.
    resetHydrationState();
    return bailoutOnAlreadyFinishedWork(current$$1, workInProgress, renderExpirationTime);
  }
  var root = workInProgress.stateNode;
  if ((current$$1 === null || current$$1.child === null) && root.hydrate && enterHydrationState(workInProgress)) {
    // If we don't have any current children this might be the first pass.
    // We always try to hydrate. If this isn't a hydration pass there won't
    // be any children to hydrate which is effectively the same thing as
    // not hydrating.

    // This is a bit of a hack. We track the host root as a placement to
    // know that we're currently in a mounting state. That way isMounted
    // works as expected. We must reset this before committing.
    // TODO: Delete this when we delete isMounted and findDOMNode.
    workInProgress.effectTag |= Placement;

    // Ensure that children mount into this root without tracking
    // side-effects. This ensures that we don't store Placement effects on
    // nodes that will be hydrated.
    workInProgress.child = mountChildFibers(workInProgress, null, nextChildren, renderExpirationTime);
  } else {
    // Otherwise reset hydration state in case we aborted and resumed another
    // root.
    reconcileChildren(current$$1, workInProgress, nextChildren, renderExpirationTime);
    resetHydrationState();
  }
  return workInProgress.child;
}

function updateHostComponent(current$$1, workInProgress, renderExpirationTime) {
  pushHostContext(workInProgress);

  if (current$$1 === null) {
    tryToClaimNextHydratableInstance(workInProgress);
  }

  var type = workInProgress.type;
  var nextProps = workInProgress.pendingProps;
  var prevProps = current$$1 !== null ? current$$1.memoizedProps : null;

  var nextChildren = nextProps.children;
  var isDirectTextChild = shouldSetTextContent(type, nextProps);

  if (isDirectTextChild) {
    // We special case a direct text child of a host node. This is a common
    // case. We won't handle it as a reified child. We will instead handle
    // this in the host environment that also have access to this prop. That
    // avoids allocating another HostText fiber and traversing it.
    nextChildren = null;
  } else if (prevProps !== null && shouldSetTextContent(type, prevProps)) {
    // If we're switching from a direct text child to a normal child, or to
    // empty, we need to schedule the text content to be reset.
    workInProgress.effectTag |= ContentReset;
  }

  markRef(current$$1, workInProgress);

  // Check the host config to see if the children are offscreen/hidden.
  if (renderExpirationTime !== Never && workInProgress.mode & ConcurrentMode && shouldDeprioritizeSubtree(type, nextProps)) {
    // Schedule this fiber to re-render at offscreen priority. Then bailout.
    workInProgress.expirationTime = Never;
    return null;
  }

  reconcileChildren(current$$1, workInProgress, nextChildren, renderExpirationTime);
  return workInProgress.child;
}

function updateHostText(current$$1, workInProgress) {
  if (current$$1 === null) {
    tryToClaimNextHydratableInstance(workInProgress);
  }
  // Nothing to do here. This is terminal. We'll do the completion step
  // immediately after.
  return null;
}

function resolveDefaultProps(Component, baseProps) {
  if (Component && Component.defaultProps) {
    // Resolve default props. Taken from ReactElement
    var props = _assign({}, baseProps);
    var defaultProps = Component.defaultProps;
    for (var propName in defaultProps) {
      if (props[propName] === undefined) {
        props[propName] = defaultProps[propName];
      }
    }
    return props;
  }
  return baseProps;
}

function mountLazyComponent(_current, workInProgress, elementType, updateExpirationTime, renderExpirationTime) {
  if (_current !== null) {
    // An lazy component only mounts if it suspended inside a non-
    // concurrent tree, in an inconsistent state. We want to tree it like
    // a new mount, even though an empty version of it already committed.
    // Disconnect the alternate pointers.
    _current.alternate = null;
    workInProgress.alternate = null;
    // Since this is conceptually a new fiber, schedule a Placement effect
    workInProgress.effectTag |= Placement;
  }

  var props = workInProgress.pendingProps;
  // We can't start a User Timing measurement with correct label yet.
  // Cancel and resume right after we know the tag.
  cancelWorkTimer(workInProgress);
  var Component = readLazyComponentType(elementType);
  // Store the unwrapped component in the type.
  workInProgress.type = Component;
  var resolvedTag = workInProgress.tag = resolveLazyComponentTag(Component);
  startWorkTimer(workInProgress);
  var resolvedProps = resolveDefaultProps(Component, props);
  var child = void 0;
  switch (resolvedTag) {
    case FunctionComponent:
      {
        child = updateFunctionComponent(null, workInProgress, Component, resolvedProps, renderExpirationTime);
        break;
      }
    case ClassComponent:
      {
        child = updateClassComponent(null, workInProgress, Component, resolvedProps, renderExpirationTime);
        break;
      }
    case ForwardRef:
      {
        child = updateForwardRef(null, workInProgress, Component, resolvedProps, renderExpirationTime);
        break;
      }
    case MemoComponent:
      {
        child = updateMemoComponent(null, workInProgress, Component, resolveDefaultProps(Component.type, resolvedProps), // The inner type can have defaults too
        updateExpirationTime, renderExpirationTime);
        break;
      }
    default:
      {
        // This message intentionally doesn't metion ForwardRef or MemoComponent
        // because the fact that it's a separate type of work is an
        // implementation detail.
        invariant(false, 'Element type is invalid. Received a promise that resolves to: %s. Promise elements must resolve to a class or function.', Component);
      }
  }
  return child;
}

function mountIncompleteClassComponent(_current, workInProgress, Component, nextProps, renderExpirationTime) {
  if (_current !== null) {
    // An incomplete component only mounts if it suspended inside a non-
    // concurrent tree, in an inconsistent state. We want to tree it like
    // a new mount, even though an empty version of it already committed.
    // Disconnect the alternate pointers.
    _current.alternate = null;
    workInProgress.alternate = null;
    // Since this is conceptually a new fiber, schedule a Placement effect
    workInProgress.effectTag |= Placement;
  }

  // Promote the fiber to a class and try rendering again.
  workInProgress.tag = ClassComponent;

  // The rest of this function is a fork of `updateClassComponent`

  // Push context providers early to prevent context stack mismatches.
  // During mounting we don't know the child context yet as the instance doesn't exist.
  // We will invalidate the child context in finishClassComponent() right after rendering.
  var hasContext = void 0;
  if (isContextProvider(Component)) {
    hasContext = true;
    pushContextProvider(workInProgress);
  } else {
    hasContext = false;
  }
  prepareToReadContext(workInProgress, renderExpirationTime);

  constructClassInstance(workInProgress, Component, nextProps, renderExpirationTime);
  mountClassInstance(workInProgress, Component, nextProps, renderExpirationTime);

  return finishClassComponent(null, workInProgress, Component, true, hasContext, renderExpirationTime);
}

function mountIndeterminateComponent(_current, workInProgress, Component, renderExpirationTime) {
  if (_current !== null) {
    // An indeterminate component only mounts if it suspended inside a non-
    // concurrent tree, in an inconsistent state. We want to tree it like
    // a new mount, even though an empty version of it already committed.
    // Disconnect the alternate pointers.
    _current.alternate = null;
    workInProgress.alternate = null;
    // Since this is conceptually a new fiber, schedule a Placement effect
    workInProgress.effectTag |= Placement;
  }

  var props = workInProgress.pendingProps;
  var unmaskedContext = getUnmaskedContext(workInProgress, Component, false);
  var context = getMaskedContext(workInProgress, unmaskedContext);

  prepareToReadContext(workInProgress, renderExpirationTime);

  var value = void 0;

  {
    if (Component.prototype && typeof Component.prototype.render === 'function') {
      var componentName = getComponentName(Component) || 'Unknown';

      if (!didWarnAboutBadClass[componentName]) {
        warningWithoutStack$1(false, "The <%s /> component appears to have a render method, but doesn't extend React.Component. " + 'This is likely to cause errors. Change %s to extend React.Component instead.', componentName, componentName);
        didWarnAboutBadClass[componentName] = true;
      }
    }

    if (workInProgress.mode & StrictMode) {
      ReactStrictModeWarnings.recordLegacyContextWarning(workInProgress, null);
    }

    ReactCurrentOwner$3.current = workInProgress;
    value = Component(props, context);
  }
  // React DevTools reads this flag.
  workInProgress.effectTag |= PerformedWork;

  if (typeof value === 'object' && value !== null && typeof value.render === 'function' && value.$$typeof === undefined) {
    // Proceed under the assumption that this is a class instance
    workInProgress.tag = ClassComponent;

    // Push context providers early to prevent context stack mismatches.
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
      if (Component) {
        !!Component.childContextTypes ? warningWithoutStack$1(false, '%s(...): childContextTypes cannot be defined on a function component.', Component.displayName || Component.name || 'Component') : void 0;
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
          warning$1(false, 'Function components cannot be given refs. ' + 'Attempts to access this ref will fail.%s', info);
        }
      }

      if (typeof Component.getDerivedStateFromProps === 'function') {
        var _componentName = getComponentName(Component) || 'Unknown';

        if (!didWarnAboutGetDerivedStateOnFunctionComponent[_componentName]) {
          warningWithoutStack$1(false, '%s: Function components do not support getDerivedStateFromProps.', _componentName);
          didWarnAboutGetDerivedStateOnFunctionComponent[_componentName] = true;
        }
      }

      if (typeof Component.contextType === 'object' && Component.contextType !== null) {
        var _componentName2 = getComponentName(Component) || 'Unknown';

        if (!didWarnAboutContextTypeOnFunctionComponent[_componentName2]) {
          warningWithoutStack$1(false, '%s: Function components do not support contextType.', _componentName2);
          didWarnAboutContextTypeOnFunctionComponent[_componentName2] = true;
        }
      }
    }
    reconcileChildren(null, workInProgress, value, renderExpirationTime);
    return workInProgress.child;
  }
}

function updateSuspenseComponent(current$$1, workInProgress, renderExpirationTime) {
  var mode = workInProgress.mode;
  var nextProps = workInProgress.pendingProps;

  // We should attempt to render the primary children unless this boundary
  // already suspended during this render (`alreadyCaptured` is true).
  var nextState = workInProgress.memoizedState;
  if (nextState === null) {
    // An empty suspense state means this boundary has not yet timed out.
  } else {
    if (!nextState.alreadyCaptured) {
      // Since we haven't already suspended during this commit, clear the
      // existing suspense state. We'll try rendering again.
      nextState = null;
    } else {
      // Something in this boundary's subtree already suspended. Switch to
      // rendering the fallback children. Set `alreadyCaptured` to true.
      if (current$$1 !== null && nextState === current$$1.memoizedState) {
        // Create a new suspense state to avoid mutating the current tree's.
        nextState = {
          alreadyCaptured: true,
          didTimeout: true,
          timedOutAt: nextState.timedOutAt
        };
      } else {
        // Already have a clone, so it's safe to mutate.
        nextState.alreadyCaptured = true;
        nextState.didTimeout = true;
      }
    }
  }
  var nextDidTimeout = nextState !== null && nextState.didTimeout;

  // This next part is a bit confusing. If the children timeout, we switch to
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

  // `child` points to the child fiber. In the normal case, this is the first
  // fiber of the primary children set. In the timed-out case, it's a
  // a fragment fiber containing the primary children.
  var child = void 0;
  // `next` points to the next fiber React should render. In the normal case,
  // it's the same as `child`: the first fiber of the primary children set.
  // In the timed-out case, it's a fragment fiber containing the *fallback*
  // children -- we skip over the primary children entirely.
  var next = void 0;
  if (current$$1 === null) {
    // This is the initial mount. This branch is pretty simple because there's
    // no previous state that needs to be preserved.
    if (nextDidTimeout) {
      // Mount separate fragments for primary and fallback children.
      var nextFallbackChildren = nextProps.fallback;
      var primaryChildFragment = createFiberFromFragment(null, mode, NoWork, null);
      var fallbackChildFragment = createFiberFromFragment(nextFallbackChildren, mode, renderExpirationTime, null);
      primaryChildFragment.sibling = fallbackChildFragment;
      child = primaryChildFragment;
      // Skip the primary children, and continue working on the
      // fallback children.
      next = fallbackChildFragment;
      child.return = next.return = workInProgress;
    } else {
      // Mount the primary children without an intermediate fragment fiber.
      var nextPrimaryChildren = nextProps.children;
      child = next = mountChildFibers(workInProgress, null, nextPrimaryChildren, renderExpirationTime);
    }
  } else {
    // This is an update. This branch is more complicated because we need to
    // ensure the state of the primary children is preserved.
    var prevState = current$$1.memoizedState;
    var prevDidTimeout = prevState !== null && prevState.didTimeout;
    if (prevDidTimeout) {
      // The current tree already timed out. That means each child set is
      var currentPrimaryChildFragment = current$$1.child;
      var currentFallbackChildFragment = currentPrimaryChildFragment.sibling;
      if (nextDidTimeout) {
        // Still timed out. Reuse the current primary children by cloning
        // its fragment. We're going to skip over these entirely.
        var _nextFallbackChildren = nextProps.fallback;
        var _primaryChildFragment = createWorkInProgress(currentPrimaryChildFragment, currentPrimaryChildFragment.pendingProps, NoWork);
        _primaryChildFragment.effectTag |= Placement;
        // Clone the fallback child fragment, too. These we'll continue
        // working on.
        var _fallbackChildFragment = _primaryChildFragment.sibling = createWorkInProgress(currentFallbackChildFragment, _nextFallbackChildren, currentFallbackChildFragment.expirationTime);
        _fallbackChildFragment.effectTag |= Placement;
        child = _primaryChildFragment;
        _primaryChildFragment.childExpirationTime = NoWork;
        // Skip the primary children, and continue working on the
        // fallback children.
        next = _fallbackChildFragment;
        child.return = next.return = workInProgress;
      } else {
        // No longer suspended. Switch back to showing the primary children,
        // and remove the intermediate fragment fiber.
        var _nextPrimaryChildren = nextProps.children;
        var currentPrimaryChild = currentPrimaryChildFragment.child;
        var currentFallbackChild = currentFallbackChildFragment.child;
        var primaryChild = reconcileChildFibers(workInProgress, currentPrimaryChild, _nextPrimaryChildren, renderExpirationTime);
        // Delete the fallback children.
        reconcileChildFibers(workInProgress, currentFallbackChild, null, renderExpirationTime);
        // Continue rendering the children, like we normally do.
        child = next = primaryChild;
      }
    } else {
      // The current tree has not already timed out. That means the primary
      var _currentPrimaryChild = current$$1.child;
      if (nextDidTimeout) {
        // Timed out. Wrap the children in a fragment fiber to keep them
        // separate from the fallback children.
        var _nextFallbackChildren2 = nextProps.fallback;
        var _primaryChildFragment2 = createFiberFromFragment(
        // It shouldn't matter what the pending props are because we aren't
        // going to render this fragment.
        null, mode, NoWork, null);
        _primaryChildFragment2.effectTag |= Placement;
        _primaryChildFragment2.child = _currentPrimaryChild;
        _currentPrimaryChild.return = _primaryChildFragment2;
        // Create a fragment from the fallback children, too.
        var _fallbackChildFragment2 = _primaryChildFragment2.sibling = createFiberFromFragment(_nextFallbackChildren2, mode, renderExpirationTime, null);
        _fallbackChildFragment2.effectTag |= Placement;
        child = _primaryChildFragment2;
        _primaryChildFragment2.childExpirationTime = NoWork;
        // Skip the primary children, and continue working on the
        // fallback children.
        next = _fallbackChildFragment2;
        child.return = next.return = workInProgress;
      } else {
        // Still haven't timed out.  Continue rendering the children, like we
        // normally do.
        var _nextPrimaryChildren2 = nextProps.children;
        next = child = reconcileChildFibers(workInProgress, _currentPrimaryChild, _nextPrimaryChildren2, renderExpirationTime);
      }
    }
  }

  workInProgress.memoizedState = nextState;
  workInProgress.child = child;
  return next;
}

function updatePortalComponent(current$$1, workInProgress, renderExpirationTime) {
  pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo);
  var nextChildren = workInProgress.pendingProps;
  if (current$$1 === null) {
    // Portals are special because we don't append the children during mount
    // but at commit. Therefore we need to track insertions which the normal
    // flow doesn't do during mount. This doesn't happen at the root because
    // the root always starts with a "current" with a null child.
    // TODO: Consider unifying this with how the root works.
    workInProgress.child = reconcileChildFibers(workInProgress, null, nextChildren, renderExpirationTime);
  } else {
    reconcileChildren(current$$1, workInProgress, nextChildren, renderExpirationTime);
  }
  return workInProgress.child;
}

function updateContextProvider(current$$1, workInProgress, renderExpirationTime) {
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
        return bailoutOnAlreadyFinishedWork(current$$1, workInProgress, renderExpirationTime);
      }
    } else {
      // The context value changed. Search for matching consumers and schedule
      // them to update.
      propagateContextChange(workInProgress, context, changedBits, renderExpirationTime);
    }
  }

  var newChildren = newProps.children;
  reconcileChildren(current$$1, workInProgress, newChildren, renderExpirationTime);
  return workInProgress.child;
}

var hasWarnedAboutUsingContextAsConsumer = false;

function updateContextConsumer(current$$1, workInProgress, renderExpirationTime) {
  var context = workInProgress.type;
  // The logic below for Context differs depending on PROD or DEV mode. In
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
          warning$1(false, 'Rendering <Context> directly is not supported and will be removed in ' + 'a future major release. Did you mean to render <Context.Consumer> instead?');
        }
      }
    } else {
      context = context._context;
    }
  }
  var newProps = workInProgress.pendingProps;
  var render = newProps.children;

  {
    !(typeof render === 'function') ? warningWithoutStack$1(false, 'A context consumer was rendered with multiple children, or a child ' + "that isn't a function. A context consumer expects a single child " + 'that is a function. If you did pass a function, make sure there ' + 'is no trailing or leading whitespace around it.') : void 0;
  }

  prepareToReadContext(workInProgress, renderExpirationTime);
  var newValue = readContext(context, newProps.unstable_observedBits);
  var newChildren = void 0;
  {
    ReactCurrentOwner$3.current = workInProgress;
    setCurrentPhase('render');
    newChildren = render(newValue);
    setCurrentPhase(null);
  }

  // React DevTools reads this flag.
  workInProgress.effectTag |= PerformedWork;
  reconcileChildren(current$$1, workInProgress, newChildren, renderExpirationTime);
  return workInProgress.child;
}

/*
  function reuseChildrenEffects(returnFiber : Fiber, firstChild : Fiber) {
    let child = firstChild;
    do {
      // Ensure that the first and last effect of the parent corresponds
      // to the children's first and last effect.
      if (!returnFiber.firstEffect) {
        returnFiber.firstEffect = child.firstEffect;
      }
      if (child.lastEffect) {
        if (returnFiber.lastEffect) {
          returnFiber.lastEffect.nextEffect = child.firstEffect;
        }
        returnFiber.lastEffect = child.lastEffect;
      }
    } while (child = child.sibling);
  }
  */

function bailoutOnAlreadyFinishedWork(current$$1, workInProgress, renderExpirationTime) {
  cancelWorkTimer(workInProgress);

  if (current$$1 !== null) {
    // Reuse previous context list
    workInProgress.firstContextDependency = current$$1.firstContextDependency;
  }

  if (enableProfilerTimer) {
    // Don't update "base" render times for bailouts.
    stopProfilerTimerIfRunning(workInProgress);
  }

  // Check if the children have any pending work.
  var childExpirationTime = workInProgress.childExpirationTime;
  if (childExpirationTime === NoWork || childExpirationTime > renderExpirationTime) {
    // The children don't have any work either. We can skip them.
    // TODO: Once we add back resuming, we should check if the children are
    // a work-in-progress set. If so, we need to transfer their effects.
    return null;
  } else {
    // This fiber doesn't have work, but its subtree does. Clone the child
    // fibers and continue.
    cloneChildFibers(current$$1, workInProgress);
    return workInProgress.child;
  }
}

function beginWork(current$$1, workInProgress, renderExpirationTime) {
  var updateExpirationTime = workInProgress.expirationTime;

  if (current$$1 !== null) {
    var oldProps = current$$1.memoizedProps;
    var newProps = workInProgress.pendingProps;
    if (oldProps === newProps && !hasContextChanged() && (updateExpirationTime === NoWork || updateExpirationTime > renderExpirationTime)) {
      // This fiber does not have any pending work. Bailout without entering
      // the begin phase. There's still some bookkeeping we that needs to be done
      // in this optimized path, mostly pushing stuff onto the stack.
      switch (workInProgress.tag) {
        case HostRoot:
          pushHostRootContext(workInProgress);
          resetHydrationState();
          break;
        case HostComponent:
          pushHostContext(workInProgress);
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
          if (enableProfilerTimer) {
            workInProgress.effectTag |= Update;
          }
          break;
        case SuspenseComponent:
          {
            var state = workInProgress.memoizedState;
            var didTimeout = state !== null && state.didTimeout;
            if (didTimeout) {
              // If this boundary is currently timed out, we need to decide
              // whether to retry the primary children, or to skip over it and
              // go straight to the fallback. Check the priority of the primary
              var primaryChildFragment = workInProgress.child;
              var primaryChildExpirationTime = primaryChildFragment.childExpirationTime;
              if (primaryChildExpirationTime !== NoWork && primaryChildExpirationTime <= renderExpirationTime) {
                // The primary children have pending work. Use the normal path
                // to attempt to render the primary children again.
                return updateSuspenseComponent(current$$1, workInProgress, renderExpirationTime);
              } else {
                // The primary children do not have pending work with sufficient
                // priority. Bailout.
                var child = bailoutOnAlreadyFinishedWork(current$$1, workInProgress, renderExpirationTime);
                if (child !== null) {
                  // The fallback children have pending work. Skip over the
                  // primary children and work on the fallback.
                  return child.sibling;
                } else {
                  return null;
                }
              }
            }
            break;
          }
      }
      return bailoutOnAlreadyFinishedWork(current$$1, workInProgress, renderExpirationTime);
    }
  }

  // Before entering the begin phase, clear the expiration time.
  workInProgress.expirationTime = NoWork;

  switch (workInProgress.tag) {
    case IndeterminateComponent:
      {
        var elementType = workInProgress.elementType;
        return mountIndeterminateComponent(current$$1, workInProgress, elementType, renderExpirationTime);
      }
    case LazyComponent:
      {
        var _elementType = workInProgress.elementType;
        return mountLazyComponent(current$$1, workInProgress, _elementType, updateExpirationTime, renderExpirationTime);
      }
    case FunctionComponent:
      {
        var _Component = workInProgress.type;
        var unresolvedProps = workInProgress.pendingProps;
        var resolvedProps = workInProgress.elementType === _Component ? unresolvedProps : resolveDefaultProps(_Component, unresolvedProps);
        return updateFunctionComponent(current$$1, workInProgress, _Component, resolvedProps, renderExpirationTime);
      }
    case ClassComponent:
      {
        var _Component2 = workInProgress.type;
        var _unresolvedProps = workInProgress.pendingProps;
        var _resolvedProps = workInProgress.elementType === _Component2 ? _unresolvedProps : resolveDefaultProps(_Component2, _unresolvedProps);
        return updateClassComponent(current$$1, workInProgress, _Component2, _resolvedProps, renderExpirationTime);
      }
    case HostRoot:
      return updateHostRoot(current$$1, workInProgress, renderExpirationTime);
    case HostComponent:
      return updateHostComponent(current$$1, workInProgress, renderExpirationTime);
    case HostText:
      return updateHostText(current$$1, workInProgress);
    case SuspenseComponent:
      return updateSuspenseComponent(current$$1, workInProgress, renderExpirationTime);
    case HostPortal:
      return updatePortalComponent(current$$1, workInProgress, renderExpirationTime);
    case ForwardRef:
      {
        var type = workInProgress.type;
        var _unresolvedProps2 = workInProgress.pendingProps;
        var _resolvedProps2 = workInProgress.elementType === type ? _unresolvedProps2 : resolveDefaultProps(type, _unresolvedProps2);
        return updateForwardRef(current$$1, workInProgress, type, _resolvedProps2, renderExpirationTime);
      }
    case Fragment:
      return updateFragment(current$$1, workInProgress, renderExpirationTime);
    case Mode:
      return updateMode(current$$1, workInProgress, renderExpirationTime);
    case Profiler:
      return updateProfiler(current$$1, workInProgress, renderExpirationTime);
    case ContextProvider:
      return updateContextProvider(current$$1, workInProgress, renderExpirationTime);
    case ContextConsumer:
      return updateContextConsumer(current$$1, workInProgress, renderExpirationTime);
    case MemoComponent:
      {
        var _type = workInProgress.type;
        var _unresolvedProps3 = workInProgress.pendingProps;
        var _resolvedProps3 = resolveDefaultProps(_type.type, _unresolvedProps3);
        return updateMemoComponent(current$$1, workInProgress, _type, _resolvedProps3, updateExpirationTime, renderExpirationTime);
      }
    case SimpleMemoComponent:
      {
        return updateSimpleMemoComponent(current$$1, workInProgress, workInProgress.type, workInProgress.pendingProps, updateExpirationTime, renderExpirationTime);
      }
    case IncompleteClassComponent:
      {
        var _Component3 = workInProgress.type;
        var _unresolvedProps4 = workInProgress.pendingProps;
        var _resolvedProps4 = workInProgress.elementType === _Component3 ? _unresolvedProps4 : resolveDefaultProps(_Component3, _unresolvedProps4);
        return mountIncompleteClassComponent(current$$1, workInProgress, _Component3, _resolvedProps4, renderExpirationTime);
      }
    default:
      invariant(false, 'Unknown unit of work tag. This error is likely caused by a bug in React. Please file an issue.');
  }
}

