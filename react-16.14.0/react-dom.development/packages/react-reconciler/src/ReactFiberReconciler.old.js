  var didWarnAboutNestedUpdates;
  var didWarnAboutFindNodeInStrictMode;

  {
    didWarnAboutNestedUpdates = false;
    didWarnAboutFindNodeInStrictMode = {};
  }

  function getContextForSubtree(parentComponent) {
    if (!parentComponent) {
      return emptyContextObject;
    }

    var fiber = get(parentComponent);
    var parentContext = findCurrentUnmaskedContext(fiber);

    if (fiber.tag === ClassComponent) {
      var Component = fiber.type;

      if (isContextProvider(Component)) {
        return processChildContext(fiber, Component, parentContext);
      }
    }

    return parentContext;
  }

  function findHostInstanceWithWarning(component, methodName) {
    {
      var fiber = get(component);

      if (fiber === undefined) {
        if (typeof component.render === 'function') {
          {
            {
              throw Error( "Unable to find node on an unmounted component." );
            }
          }
        } else {
          {
            {
              throw Error( "Argument appears to not be a ReactComponent. Keys: " + Object.keys(component) );
            }
          }
        }
      }

      var hostFiber = findCurrentHostFiber(fiber);

      if (hostFiber === null) {
        return null;
      }

      if (hostFiber.mode & StrictMode) {
        var componentName = getComponentName(fiber.type) || 'Component';

        if (!didWarnAboutFindNodeInStrictMode[componentName]) {
          didWarnAboutFindNodeInStrictMode[componentName] = true;
          var previousFiber = current;

          try {
            setCurrentFiber(hostFiber);

            if (fiber.mode & StrictMode) {
              error('%s is deprecated in StrictMode. ' + '%s was passed an instance of %s which is inside StrictMode. ' + 'Instead, add a ref directly to the element you want to reference. ' + 'Learn more about using refs safely here: ' + 'https://reactjs.org/link/strict-mode-find-node', methodName, methodName, componentName);
            } else {
              error('%s is deprecated in StrictMode. ' + '%s was passed an instance of %s which renders StrictMode children. ' + 'Instead, add a ref directly to the element you want to reference. ' + 'Learn more about using refs safely here: ' + 'https://reactjs.org/link/strict-mode-find-node', methodName, methodName, componentName);
            }
          } finally {
            // Ideally this should reset to previous but this shouldn't be called in
            // render and there's another warning for that anyway.
            if (previousFiber) {
              setCurrentFiber(previousFiber);
            } else {
              resetCurrentFiber();
            }
          }
        }
      }

      return hostFiber.stateNode;
    }
  }

  function createContainer(containerInfo, tag, hydrate, hydrationCallbacks) {
    return createFiberRoot(containerInfo, tag, hydrate);
  }
  function updateContainer(element, container, parentComponent, callback) {
    {
      onScheduleRoot(container, element);
    }

    var current$1 = container.current;
    var eventTime = requestEventTime();

    {
      // $FlowExpectedError - jest isn't a global, and isn't recognized outside of tests
      if ('undefined' !== typeof jest) {
        warnIfUnmockedScheduler(current$1);
        warnIfNotScopedWithMatchingAct(current$1);
      }
    }

    var lane = requestUpdateLane(current$1);

    {
      markRenderScheduled(lane);
    }

    var context = getContextForSubtree(parentComponent);

    if (container.context === null) {
      container.context = context;
    } else {
      container.pendingContext = context;
    }

    {
      if (isRendering && current !== null && !didWarnAboutNestedUpdates) {
        didWarnAboutNestedUpdates = true;

        error('Render methods should be a pure function of props and state; ' + 'triggering nested component updates from render is not allowed. ' + 'If necessary, trigger nested updates in componentDidUpdate.\n\n' + 'Check the render method of %s.', getComponentName(current.type) || 'Unknown');
      }
    }

    var update = createUpdate(eventTime, lane); // Caution: React DevTools currently depends on this property
    // being called "element".

    update.payload = {
      element: element
    };
    callback = callback === undefined ? null : callback;

    if (callback !== null) {
      {
        if (typeof callback !== 'function') {
          error('render(...): Expected the last optional `callback` argument to be a ' + 'function. Instead received: %s.', callback);
        }
      }

      update.callback = callback;
    }

    enqueueUpdate(current$1, update);
    scheduleUpdateOnFiber(current$1, lane, eventTime);
    return lane;
  }
  function getPublicRootInstance(container) {
    var containerFiber = container.current;

    if (!containerFiber.child) {
      return null;
    }

    switch (containerFiber.child.tag) {
      case HostComponent:
        return getPublicInstance(containerFiber.child.stateNode);

      default:
        return containerFiber.child.stateNode;
    }
  }
  function attemptSynchronousHydration$1(fiber) {
    switch (fiber.tag) {
      case HostRoot:
        var root = fiber.stateNode;

        if (root.hydrate) {
          // Flush the first scheduled "update".
          var lanes = getHighestPriorityPendingLanes(root);
          flushRoot(root, lanes);
        }

        break;

      case SuspenseComponent:
        var eventTime = requestEventTime();
        flushSync(function () {
          return scheduleUpdateOnFiber(fiber, SyncLane, eventTime);
        }); // If we're still blocked after this, we need to increase
        // the priority of any promises resolving within this
        // boundary so that they next attempt also has higher pri.

        var retryLane = InputDiscreteHydrationLane;
        markRetryLaneIfNotHydrated(fiber, retryLane);
        break;
    }
  }

  function markRetryLaneImpl(fiber, retryLane) {
    var suspenseState = fiber.memoizedState;

    if (suspenseState !== null && suspenseState.dehydrated !== null) {
      suspenseState.retryLane = higherPriorityLane(suspenseState.retryLane, retryLane);
    }
  } // Increases the priority of thennables when they resolve within this boundary.


  function markRetryLaneIfNotHydrated(fiber, retryLane) {
    markRetryLaneImpl(fiber, retryLane);
    var alternate = fiber.alternate;

    if (alternate) {
      markRetryLaneImpl(alternate, retryLane);
    }
  }

  function attemptUserBlockingHydration$1(fiber) {
    if (fiber.tag !== SuspenseComponent) {
      // We ignore HostRoots here because we can't increase
      // their priority and they should not suspend on I/O,
      // since you have to wrap anything that might suspend in
      // Suspense.
      return;
    }

    var eventTime = requestEventTime();
    var lane = InputDiscreteHydrationLane;
    scheduleUpdateOnFiber(fiber, lane, eventTime);
    markRetryLaneIfNotHydrated(fiber, lane);
  }
  function attemptContinuousHydration$1(fiber) {
    if (fiber.tag !== SuspenseComponent) {
      // We ignore HostRoots here because we can't increase
      // their priority and they should not suspend on I/O,
      // since you have to wrap anything that might suspend in
      // Suspense.
      return;
    }

    var eventTime = requestEventTime();
    var lane = SelectiveHydrationLane;
    scheduleUpdateOnFiber(fiber, lane, eventTime);
    markRetryLaneIfNotHydrated(fiber, lane);
  }
  function attemptHydrationAtCurrentPriority$1(fiber) {
    if (fiber.tag !== SuspenseComponent) {
      // We ignore HostRoots here because we can't increase
      // their priority other than synchronously flush it.
      return;
    }

    var eventTime = requestEventTime();
    var lane = requestUpdateLane(fiber);
    scheduleUpdateOnFiber(fiber, lane, eventTime);
    markRetryLaneIfNotHydrated(fiber, lane);
  }
  function runWithPriority$2(priority, fn) {
    var previousPriority = getCurrentUpdateLanePriority();

    try {
      setCurrentUpdateLanePriority(priority);
      return fn();
    } finally {
      setCurrentUpdateLanePriority(previousPriority);
    }
  }
  function findHostInstanceWithNoPortals(fiber) {
    var hostFiber = findCurrentHostFiberWithNoPortals(fiber);

    if (hostFiber === null) {
      return null;
    }

    if (hostFiber.tag === FundamentalComponent) {
      return hostFiber.stateNode.instance;
    }

    return hostFiber.stateNode;
  }

  var shouldSuspendImpl = function (fiber) {
    return false;
  };

  function shouldSuspend(fiber) {
    return shouldSuspendImpl(fiber);
  }
  var overrideHookState = null;
  var overrideHookStateDeletePath = null;
  var overrideHookStateRenamePath = null;
  var overrideProps = null;
  var overridePropsDeletePath = null;
  var overridePropsRenamePath = null;
  var scheduleUpdate = null;
  var setSuspenseHandler = null;

  {
    var copyWithDeleteImpl = function (obj, path, index) {
      var key = path[index];
      var updated = Array.isArray(obj) ? obj.slice() : _assign({}, obj);

      if (index + 1 === path.length) {
        if (Array.isArray(updated)) {
          updated.splice(key, 1);
        } else {
          delete updated[key];
        }

        return updated;
      } // $FlowFixMe number or string is fine here


      updated[key] = copyWithDeleteImpl(obj[key], path, index + 1);
      return updated;
    };

    var copyWithDelete = function (obj, path) {
      return copyWithDeleteImpl(obj, path, 0);
    };

    var copyWithRenameImpl = function (obj, oldPath, newPath, index) {
      var oldKey = oldPath[index];
      var updated = Array.isArray(obj) ? obj.slice() : _assign({}, obj);

      if (index + 1 === oldPath.length) {
        var newKey = newPath[index]; // $FlowFixMe number or string is fine here

        updated[newKey] = updated[oldKey];

        if (Array.isArray(updated)) {
          updated.splice(oldKey, 1);
        } else {
          delete updated[oldKey];
        }
      } else {
        // $FlowFixMe number or string is fine here
        updated[oldKey] = copyWithRenameImpl( // $FlowFixMe number or string is fine here
        obj[oldKey], oldPath, newPath, index + 1);
      }

      return updated;
    };

    var copyWithRename = function (obj, oldPath, newPath) {
      if (oldPath.length !== newPath.length) {
        warn('copyWithRename() expects paths of the same length');

        return;
      } else {
        for (var i = 0; i < newPath.length - 1; i++) {
          if (oldPath[i] !== newPath[i]) {
            warn('copyWithRename() expects paths to be the same except for the deepest key');

            return;
          }
        }
      }

      return copyWithRenameImpl(obj, oldPath, newPath, 0);
    };

    var copyWithSetImpl = function (obj, path, index, value) {
      if (index >= path.length) {
        return value;
      }

      var key = path[index];
      var updated = Array.isArray(obj) ? obj.slice() : _assign({}, obj); // $FlowFixMe number or string is fine here

      updated[key] = copyWithSetImpl(obj[key], path, index + 1, value);
      return updated;
    };

    var copyWithSet = function (obj, path, value) {
      return copyWithSetImpl(obj, path, 0, value);
    };

    var findHook = function (fiber, id) {
      // For now, the "id" of stateful hooks is just the stateful hook index.
      // This may change in the future with e.g. nested hooks.
      var currentHook = fiber.memoizedState;

      while (currentHook !== null && id > 0) {
        currentHook = currentHook.next;
        id--;
      }

      return currentHook;
    }; // Support DevTools editable values for useState and useReducer.


    overrideHookState = function (fiber, id, path, value) {
      var hook = findHook(fiber, id);

      if (hook !== null) {
        var newState = copyWithSet(hook.memoizedState, path, value);
        hook.memoizedState = newState;
        hook.baseState = newState; // We aren't actually adding an update to the queue,
        // because there is no update we can add for useReducer hooks that won't trigger an error.
        // (There's no appropriate action type for DevTools overrides.)
        // As a result though, React will see the scheduled update as a noop and bailout.
        // Shallow cloning props works as a workaround for now to bypass the bailout check.

        fiber.memoizedProps = _assign({}, fiber.memoizedProps);
        scheduleUpdateOnFiber(fiber, SyncLane, NoTimestamp);
      }
    };

    overrideHookStateDeletePath = function (fiber, id, path) {
      var hook = findHook(fiber, id);

      if (hook !== null) {
        var newState = copyWithDelete(hook.memoizedState, path);
        hook.memoizedState = newState;
        hook.baseState = newState; // We aren't actually adding an update to the queue,
        // because there is no update we can add for useReducer hooks that won't trigger an error.
        // (There's no appropriate action type for DevTools overrides.)
        // As a result though, React will see the scheduled update as a noop and bailout.
        // Shallow cloning props works as a workaround for now to bypass the bailout check.

        fiber.memoizedProps = _assign({}, fiber.memoizedProps);
        scheduleUpdateOnFiber(fiber, SyncLane, NoTimestamp);
      }
    };

    overrideHookStateRenamePath = function (fiber, id, oldPath, newPath) {
      var hook = findHook(fiber, id);

      if (hook !== null) {
        var newState = copyWithRename(hook.memoizedState, oldPath, newPath);
        hook.memoizedState = newState;
        hook.baseState = newState; // We aren't actually adding an update to the queue,
        // because there is no update we can add for useReducer hooks that won't trigger an error.
        // (There's no appropriate action type for DevTools overrides.)
        // As a result though, React will see the scheduled update as a noop and bailout.
        // Shallow cloning props works as a workaround for now to bypass the bailout check.

        fiber.memoizedProps = _assign({}, fiber.memoizedProps);
        scheduleUpdateOnFiber(fiber, SyncLane, NoTimestamp);
      }
    }; // Support DevTools props for function components, forwardRef, memo, host components, etc.


    overrideProps = function (fiber, path, value) {
      fiber.pendingProps = copyWithSet(fiber.memoizedProps, path, value);

      if (fiber.alternate) {
        fiber.alternate.pendingProps = fiber.pendingProps;
      }

      scheduleUpdateOnFiber(fiber, SyncLane, NoTimestamp);
    };

    overridePropsDeletePath = function (fiber, path) {
      fiber.pendingProps = copyWithDelete(fiber.memoizedProps, path);

      if (fiber.alternate) {
        fiber.alternate.pendingProps = fiber.pendingProps;
      }

      scheduleUpdateOnFiber(fiber, SyncLane, NoTimestamp);
    };

    overridePropsRenamePath = function (fiber, oldPath, newPath) {
      fiber.pendingProps = copyWithRename(fiber.memoizedProps, oldPath, newPath);

      if (fiber.alternate) {
        fiber.alternate.pendingProps = fiber.pendingProps;
      }

      scheduleUpdateOnFiber(fiber, SyncLane, NoTimestamp);
    };

    scheduleUpdate = function (fiber) {
      scheduleUpdateOnFiber(fiber, SyncLane, NoTimestamp);
    };

    setSuspenseHandler = function (newShouldSuspendImpl) {
      shouldSuspendImpl = newShouldSuspendImpl;
    };
  }

  function findHostInstanceByFiber(fiber) {
    var hostFiber = findCurrentHostFiber(fiber);

    if (hostFiber === null) {
      return null;
    }

    return hostFiber.stateNode;
  }

  function emptyFindFiberByHostInstance(instance) {
    return null;
  }

  function getCurrentFiberForDevTools() {
    return current;
  }

  function injectIntoDevTools(devToolsConfig) {
    var findFiberByHostInstance = devToolsConfig.findFiberByHostInstance;
    var ReactCurrentDispatcher = ReactSharedInternals.ReactCurrentDispatcher;
    return injectInternals({
      bundleType: devToolsConfig.bundleType,
      version: devToolsConfig.version,
      rendererPackageName: devToolsConfig.rendererPackageName,
      rendererConfig: devToolsConfig.rendererConfig,
      overrideHookState: overrideHookState,
      overrideHookStateDeletePath: overrideHookStateDeletePath,
      overrideHookStateRenamePath: overrideHookStateRenamePath,
      overrideProps: overrideProps,
      overridePropsDeletePath: overridePropsDeletePath,
      overridePropsRenamePath: overridePropsRenamePath,
      setSuspenseHandler: setSuspenseHandler,
      scheduleUpdate: scheduleUpdate,
      currentDispatcherRef: ReactCurrentDispatcher,
      findHostInstanceByFiber: findHostInstanceByFiber,
      findFiberByHostInstance: findFiberByHostInstance || emptyFindFiberByHostInstance,
      // React Refresh
      findHostInstancesForRefresh:  findHostInstancesForRefresh ,
      scheduleRefresh:  scheduleRefresh ,
      scheduleRoot:  scheduleRoot ,
      setRefreshHandler:  setRefreshHandler ,
      // Enables DevTools to append owner stacks to error messages in DEV mode.
      getCurrentFiber:  getCurrentFiberForDevTools 
    });
  }