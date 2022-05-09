  var hasBadMapPolyfill;

  {
    hasBadMapPolyfill = false;

    try {
      var nonExtensibleObject = Object.preventExtensions({});
      /* eslint-disable no-new */

      new Map([[nonExtensibleObject, null]]);
      new Set([nonExtensibleObject]);
      /* eslint-enable no-new */
    } catch (e) {
      // TODO: Consider warning about bad polyfills
      hasBadMapPolyfill = true;
    }
  }

  function FiberNode(tag, pendingProps, key, mode) {
    // Instance
    this.tag = tag;
    this.key = key;
    this.elementType = null;
    this.type = null;
    this.stateNode = null; // Fiber

    this.return = null;
    this.child = null;
    this.sibling = null;
    this.index = 0;
    this.ref = null;
    this.pendingProps = pendingProps;
    this.memoizedProps = null;
    this.updateQueue = null;
    this.memoizedState = null;
    this.dependencies = null;
    this.mode = mode; // Effects

    this.flags = NoFlags;
    this.subtreeFlags = NoFlags;
    this.deletions = null;
    this.lanes = NoLanes;
    this.childLanes = NoLanes;
    this.alternate = null;

    {
      // Note: The following is done to avoid a v8 performance cliff.
      //
      // Initializing the fields below to smis and later updating them with
      // double values will cause Fibers to end up having separate shapes.
      // This behavior/bug has something to do with Object.preventExtension().
      // Fortunately this only impacts DEV builds.
      // Unfortunately it makes React unusably slow for some applications.
      // To work around this, initialize the fields below with doubles.
      //
      // Learn more about this here:
      // https://github.com/facebook/react/issues/14365
      // https://bugs.chromium.org/p/v8/issues/detail?id=8538
      this.actualDuration = Number.NaN;
      this.actualStartTime = Number.NaN;
      this.selfBaseDuration = Number.NaN;
      this.treeBaseDuration = Number.NaN; // It's okay to replace the initial doubles with smis after initialization.
      // This won't trigger the performance cliff mentioned above,
      // and it simplifies other profiler code (including DevTools).

      this.actualDuration = 0;
      this.actualStartTime = -1;
      this.selfBaseDuration = 0;
      this.treeBaseDuration = 0;
    }

    {
      // This isn't directly used but is handy for debugging internals:
      this._debugSource = null;
      this._debugOwner = null;
      this._debugNeedsRemount = false;
      this._debugHookTypes = null;

      if (!hasBadMapPolyfill && typeof Object.preventExtensions === 'function') {
        Object.preventExtensions(this);
      }
    }
  } // This is a constructor function, rather than a POJO constructor, still
  // please ensure we do the following:
  // 1) Nobody should add any instance methods on this. Instance methods can be
  //    more difficult to predict when they get optimized and they are almost
  //    never inlined properly in static compilers.
  // 2) Nobody should rely on `instanceof Fiber` for type testing. We should
  //    always know when it is a fiber.
  // 3) We might want to experiment with using numeric keys since they are easier
  //    to optimize in a non-JIT environment.
  // 4) We can easily go from a constructor to a createFiber object literal if that
  //    is faster.
  // 5) It should be easy to port this to a C struct and keep a C implementation
  //    compatible.


  var createFiber = function (tag, pendingProps, key, mode) {
    // $FlowFixMe: the shapes are exact here but Flow doesn't like constructors
    return new FiberNode(tag, pendingProps, key, mode);
  };

  function shouldConstruct$1(Component) {
    var prototype = Component.prototype;
    return !!(prototype && prototype.isReactComponent);
  }

  function isSimpleFunctionComponent(type) {
    return typeof type === 'function' && !shouldConstruct$1(type) && type.defaultProps === undefined;
  }
  function resolveLazyComponentTag(Component) {
    if (typeof Component === 'function') {
      return shouldConstruct$1(Component) ? ClassComponent : FunctionComponent;
    } else if (Component !== undefined && Component !== null) {
      var $$typeof = Component.$$typeof;

      if ($$typeof === REACT_FORWARD_REF_TYPE) {
        return ForwardRef;
      }

      if ($$typeof === REACT_MEMO_TYPE) {
        return MemoComponent;
      }
    }

    return IndeterminateComponent;
  } // This is used to create an alternate fiber to do work on.

  function createWorkInProgress(current, pendingProps) {
    var workInProgress = current.alternate;

    if (workInProgress === null) {
      // We use a double buffering pooling technique because we know that we'll
      // only ever need at most two versions of a tree. We pool the "other" unused
      // node that we're free to reuse. This is lazily created to avoid allocating
      // extra objects for things that are never updated. It also allow us to
      // reclaim the extra memory if needed.
      workInProgress = createFiber(current.tag, pendingProps, current.key, current.mode);
      workInProgress.elementType = current.elementType;
      workInProgress.type = current.type;
      workInProgress.stateNode = current.stateNode;

      {
        // DEV-only fields
        workInProgress._debugSource = current._debugSource;
        workInProgress._debugOwner = current._debugOwner;
        workInProgress._debugHookTypes = current._debugHookTypes;
      }

      workInProgress.alternate = current;
      current.alternate = workInProgress;
    } else {
      workInProgress.pendingProps = pendingProps; // Needed because Blocks store data on type.

      workInProgress.type = current.type; // We already have an alternate.
      // Reset the effect tag.

      workInProgress.flags = NoFlags; // The effects are no longer valid.

      workInProgress.subtreeFlags = NoFlags;
      workInProgress.deletions = null;

      {
        // We intentionally reset, rather than copy, actualDuration & actualStartTime.
        // This prevents time from endlessly accumulating in new commits.
        // This has the downside of resetting values for different priority renders,
        // But works for yielding (the common case) and should support resuming.
        workInProgress.actualDuration = 0;
        workInProgress.actualStartTime = -1;
      }
    } // Reset all effects except static ones.
    // Static effects are not specific to a render.


    workInProgress.flags = current.flags & StaticMask;
    workInProgress.childLanes = current.childLanes;
    workInProgress.lanes = current.lanes;
    workInProgress.child = current.child;
    workInProgress.memoizedProps = current.memoizedProps;
    workInProgress.memoizedState = current.memoizedState;
    workInProgress.updateQueue = current.updateQueue; // Clone the dependencies object. This is mutated during the render phase, so
    // it cannot be shared with the current fiber.

    var currentDependencies = current.dependencies;
    workInProgress.dependencies = currentDependencies === null ? null : {
      lanes: currentDependencies.lanes,
      firstContext: currentDependencies.firstContext
    }; // These will be overridden during the parent's reconciliation

    workInProgress.sibling = current.sibling;
    workInProgress.index = current.index;
    workInProgress.ref = current.ref;

    {
      workInProgress.selfBaseDuration = current.selfBaseDuration;
      workInProgress.treeBaseDuration = current.treeBaseDuration;
    }

    {
      workInProgress._debugNeedsRemount = current._debugNeedsRemount;

      switch (workInProgress.tag) {
        case IndeterminateComponent:
        case FunctionComponent:
        case SimpleMemoComponent:
          workInProgress.type = resolveFunctionForHotReloading(current.type);
          break;

        case ClassComponent:
          workInProgress.type = resolveClassForHotReloading(current.type);
          break;

        case ForwardRef:
          workInProgress.type = resolveForwardRefForHotReloading(current.type);
          break;
      }
    }

    return workInProgress;
  } // Used to reuse a Fiber for a second pass.

  function resetWorkInProgress(workInProgress, renderLanes) {
    // This resets the Fiber to what createFiber or createWorkInProgress would
    // have set the values to before during the first pass. Ideally this wouldn't
    // be necessary but unfortunately many code paths reads from the workInProgress
    // when they should be reading from current and writing to workInProgress.
    // We assume pendingProps, index, key, ref, return are still untouched to
    // avoid doing another reconciliation.
    // Reset the effect flags but keep any Placement tags, since that's something
    // that child fiber is setting, not the reconciliation.
    workInProgress.flags &= StaticMask | Placement; // The effects are no longer valid.

    var current = workInProgress.alternate;

    if (current === null) {
      // Reset to createFiber's initial values.
      workInProgress.childLanes = NoLanes;
      workInProgress.lanes = renderLanes;
      workInProgress.child = null;
      workInProgress.subtreeFlags = NoFlags;
      workInProgress.memoizedProps = null;
      workInProgress.memoizedState = null;
      workInProgress.updateQueue = null;
      workInProgress.dependencies = null;
      workInProgress.stateNode = null;

      {
        // Note: We don't reset the actualTime counts. It's useful to accumulate
        // actual time across multiple render passes.
        workInProgress.selfBaseDuration = 0;
        workInProgress.treeBaseDuration = 0;
      }
    } else {
      // Reset to the cloned values that createWorkInProgress would've.
      workInProgress.childLanes = current.childLanes;
      workInProgress.lanes = current.lanes;
      workInProgress.child = current.child;
      workInProgress.subtreeFlags = NoFlags;
      workInProgress.deletions = null;
      workInProgress.memoizedProps = current.memoizedProps;
      workInProgress.memoizedState = current.memoizedState;
      workInProgress.updateQueue = current.updateQueue; // Needed because Blocks store data on type.

      workInProgress.type = current.type; // Clone the dependencies object. This is mutated during the render phase, so
      // it cannot be shared with the current fiber.

      var currentDependencies = current.dependencies;
      workInProgress.dependencies = currentDependencies === null ? null : {
        lanes: currentDependencies.lanes,
        firstContext: currentDependencies.firstContext
      };

      {
        // Note: We don't reset the actualTime counts. It's useful to accumulate
        // actual time across multiple render passes.
        workInProgress.selfBaseDuration = current.selfBaseDuration;
        workInProgress.treeBaseDuration = current.treeBaseDuration;
      }
    }

    return workInProgress;
  }
  function createHostRootFiber(tag, isStrictMode, concurrentUpdatesByDefaultOverride) {
    var mode;

    if (tag === ConcurrentRoot) {
      mode = ConcurrentMode;

      if (isStrictMode === true) {
        mode |= StrictLegacyMode;

        {
          mode |= StrictEffectsMode;
        }
      }
    } else {
      mode = NoMode;
    }

    if ( isDevToolsPresent) {
      // Always collect profile timings when DevTools are present.
      // This enables DevTools to start capturing timing at any point–
      // Without some nodes in the tree having empty base times.
      mode |= ProfileMode;
    }

    return createFiber(HostRoot, null, null, mode);
  }
  function createFiberFromTypeAndProps(type, // React$ElementType
  key, pendingProps, owner, mode, lanes) {
    var fiberTag = IndeterminateComponent; // The resolved type is set if we know what the final type will be. I.e. it's not lazy.

    var resolvedType = type;

    if (typeof type === 'function') {
      if (shouldConstruct$1(type)) {
        fiberTag = ClassComponent;

        {
          resolvedType = resolveClassForHotReloading(resolvedType);
        }
      } else {
        {
          resolvedType = resolveFunctionForHotReloading(resolvedType);
        }
      }
    } else if (typeof type === 'string') {
      fiberTag = HostComponent;
    } else {
      getTag: switch (type) {
        case REACT_FRAGMENT_TYPE:
          return createFiberFromFragment(pendingProps.children, mode, lanes, key);

        case REACT_STRICT_MODE_TYPE:
          fiberTag = Mode;
          mode |= StrictLegacyMode;

          if ( (mode & ConcurrentMode) !== NoMode) {
            // Strict effects should never run on legacy roots
            mode |= StrictEffectsMode;
          }

          break;

        case REACT_PROFILER_TYPE:
          return createFiberFromProfiler(pendingProps, mode, lanes, key);

        case REACT_SUSPENSE_TYPE:
          return createFiberFromSuspense(pendingProps, mode, lanes, key);

        case REACT_SUSPENSE_LIST_TYPE:
          return createFiberFromSuspenseList(pendingProps, mode, lanes, key);

        case REACT_OFFSCREEN_TYPE:
          return createFiberFromOffscreen(pendingProps, mode, lanes, key);

        case REACT_LEGACY_HIDDEN_TYPE:

        // eslint-disable-next-line no-fallthrough

        case REACT_SCOPE_TYPE:

        // eslint-disable-next-line no-fallthrough

        case REACT_CACHE_TYPE:
          {
            return createFiberFromCache(pendingProps, mode, lanes, key);
          }

        // eslint-disable-next-line no-fallthrough

        case REACT_TRACING_MARKER_TYPE:

        // eslint-disable-next-line no-fallthrough

        case REACT_DEBUG_TRACING_MODE_TYPE:

        // eslint-disable-next-line no-fallthrough

        default:
          {
            if (typeof type === 'object' && type !== null) {
              switch (type.$$typeof) {
                case REACT_PROVIDER_TYPE:
                  fiberTag = ContextProvider;
                  break getTag;

                case REACT_CONTEXT_TYPE:
                  // This is a consumer
                  fiberTag = ContextConsumer;
                  break getTag;

                case REACT_FORWARD_REF_TYPE:
                  fiberTag = ForwardRef;

                  {
                    resolvedType = resolveForwardRefForHotReloading(resolvedType);
                  }

                  break getTag;

                case REACT_MEMO_TYPE:
                  fiberTag = MemoComponent;
                  break getTag;

                case REACT_LAZY_TYPE:
                  fiberTag = LazyComponent;
                  resolvedType = null;
                  break getTag;
              }
            }

            var info = '';

            {
              if (type === undefined || typeof type === 'object' && type !== null && Object.keys(type).length === 0) {
                info += ' You likely forgot to export your component from the file ' + "it's defined in, or you might have mixed up default and " + 'named imports.';
              }

              var ownerName = owner ? getComponentNameFromFiber(owner) : null;

              if (ownerName) {
                info += '\n\nCheck the render method of `' + ownerName + '`.';
              }
            }

            throw new Error('Element type is invalid: expected a string (for built-in ' + 'components) or a class/function (for composite components) ' + ("but got: " + (type == null ? type : typeof type) + "." + info));
          }
      }
    }

    var fiber = createFiber(fiberTag, pendingProps, key, mode);
    fiber.elementType = type;
    fiber.type = resolvedType;
    fiber.lanes = lanes;

    {
      fiber._debugOwner = owner;
    }

    return fiber;
  }
  function createFiberFromElement(element, mode, lanes) {
    var owner = null;

    {
      owner = element._owner;
    }

    var type = element.type;
    var key = element.key;
    var pendingProps = element.props;
    var fiber = createFiberFromTypeAndProps(type, key, pendingProps, owner, mode, lanes);

    {
      fiber._debugSource = element._source;
      fiber._debugOwner = element._owner;
    }

    return fiber;
  }
  function createFiberFromFragment(elements, mode, lanes, key) {
    var fiber = createFiber(Fragment, elements, key, mode);
    fiber.lanes = lanes;
    return fiber;
  }

  function createFiberFromProfiler(pendingProps, mode, lanes, key) {
    {
      if (typeof pendingProps.id !== 'string') {
        error('Profiler must specify an "id" of type `string` as a prop. Received the type `%s` instead.', typeof pendingProps.id);
      }
    }

    var fiber = createFiber(Profiler, pendingProps, key, mode | ProfileMode);
    fiber.elementType = REACT_PROFILER_TYPE;
    fiber.lanes = lanes;

    {
      fiber.stateNode = {
        effectDuration: 0,
        passiveEffectDuration: 0
      };
    }

    return fiber;
  }

  function createFiberFromSuspense(pendingProps, mode, lanes, key) {
    var fiber = createFiber(SuspenseComponent, pendingProps, key, mode);
    fiber.elementType = REACT_SUSPENSE_TYPE;
    fiber.lanes = lanes;
    return fiber;
  }
  function createFiberFromSuspenseList(pendingProps, mode, lanes, key) {
    var fiber = createFiber(SuspenseListComponent, pendingProps, key, mode);
    fiber.elementType = REACT_SUSPENSE_LIST_TYPE;
    fiber.lanes = lanes;
    return fiber;
  }
  function createFiberFromOffscreen(pendingProps, mode, lanes, key) {
    var fiber = createFiber(OffscreenComponent, pendingProps, key, mode);
    fiber.elementType = REACT_OFFSCREEN_TYPE;
    fiber.lanes = lanes;
    var primaryChildInstance = {};
    fiber.stateNode = primaryChildInstance;
    return fiber;
  }
  function createFiberFromCache(pendingProps, mode, lanes, key) {
    var fiber = createFiber(CacheComponent, pendingProps, key, mode);
    fiber.elementType = REACT_CACHE_TYPE;
    fiber.lanes = lanes;
    return fiber;
  }
  function createFiberFromText(content, mode, lanes) {
    var fiber = createFiber(HostText, content, null, mode);
    fiber.lanes = lanes;
    return fiber;
  }
  function createFiberFromHostInstanceForDeletion() {
    var fiber = createFiber(HostComponent, null, null, NoMode);
    fiber.elementType = 'DELETED';
    return fiber;
  }
  function createFiberFromDehydratedFragment(dehydratedNode) {
    var fiber = createFiber(DehydratedFragment, null, null, NoMode);
    fiber.stateNode = dehydratedNode;
    return fiber;
  }
  function createFiberFromPortal(portal, mode, lanes) {
    var pendingProps = portal.children !== null ? portal.children : [];
    var fiber = createFiber(HostPortal, pendingProps, portal.key, mode);
    fiber.lanes = lanes;
    fiber.stateNode = {
      containerInfo: portal.containerInfo,
      pendingChildren: null,
      // Used by persistent updates
      implementation: portal.implementation
    };
    return fiber;
  } // Used for stashing WIP properties to replay failed work in DEV.

  function assignFiberPropertiesInDEV(target, source) {
    if (target === null) {
      // This Fiber's initial properties will always be overwritten.
      // We only use a Fiber to ensure the same hidden class so DEV isn't slow.
      target = createFiber(IndeterminateComponent, null, null, NoMode);
    } // This is intentionally written as a list of all properties.
    // We tried to use Object.assign() instead but this is called in
    // the hottest path, and Object.assign() was too slow:
    // https://github.com/facebook/react/issues/12502
    // This code is DEV-only so size is not a concern.


    target.tag = source.tag;
    target.key = source.key;
    target.elementType = source.elementType;
    target.type = source.type;
    target.stateNode = source.stateNode;
    target.return = source.return;
    target.child = source.child;
    target.sibling = source.sibling;
    target.index = source.index;
    target.ref = source.ref;
    target.pendingProps = source.pendingProps;
    target.memoizedProps = source.memoizedProps;
    target.updateQueue = source.updateQueue;
    target.memoizedState = source.memoizedState;
    target.dependencies = source.dependencies;
    target.mode = source.mode;
    target.flags = source.flags;
    target.subtreeFlags = source.subtreeFlags;
    target.deletions = source.deletions;
    target.lanes = source.lanes;
    target.childLanes = source.childLanes;
    target.alternate = source.alternate;

    {
      target.actualDuration = source.actualDuration;
      target.actualStartTime = source.actualStartTime;
      target.selfBaseDuration = source.selfBaseDuration;
      target.treeBaseDuration = source.treeBaseDuration;
    }

    target._debugSource = source._debugSource;
    target._debugOwner = source._debugOwner;
    target._debugNeedsRemount = source._debugNeedsRemount;
    target._debugHookTypes = source._debugHookTypes;
    return target;
  }