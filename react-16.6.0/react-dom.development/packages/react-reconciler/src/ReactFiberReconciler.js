// 0 is PROD, 1 is DEV.
// Might add PROFILE later.


var didWarnAboutNestedUpdates = void 0;
var didWarnAboutFindNodeInStrictMode = void 0;

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

function scheduleRootUpdate(current$$1, element, expirationTime, callback) {
  {
    if (phase === 'render' && current !== null && !didWarnAboutNestedUpdates) {
      didWarnAboutNestedUpdates = true;
      warningWithoutStack$1(false, 'Render methods should be a pure function of props and state; ' + 'triggering nested component updates from render is not allowed. ' + 'If necessary, trigger nested updates in componentDidUpdate.\n\n' + 'Check the render method of %s.', getComponentName(current.type) || 'Unknown');
    }
  }

  var update = createUpdate(expirationTime);
  // Caution: React DevTools currently depends on this property
  // being called "element".
  update.payload = { element: element };

  callback = callback === undefined ? null : callback;
  if (callback !== null) {
    !(typeof callback === 'function') ? warningWithoutStack$1(false, 'render(...): Expected the last optional `callback` argument to be a ' + 'function. Instead received: %s.', callback) : void 0;
    update.callback = callback;
  }
  enqueueUpdate(current$$1, update);

  scheduleWork(current$$1, expirationTime);
  return expirationTime;
}

function updateContainerAtExpirationTime(element, container, parentComponent, expirationTime, callback) {
  // TODO: If this is a nested container, this won't be the root.
  var current$$1 = container.current;

  {
    if (ReactFiberInstrumentation_1.debugTool) {
      if (current$$1.alternate === null) {
        ReactFiberInstrumentation_1.debugTool.onMountContainer(container);
      } else if (element === null) {
        ReactFiberInstrumentation_1.debugTool.onUnmountContainer(container);
      } else {
        ReactFiberInstrumentation_1.debugTool.onUpdateContainer(container);
      }
    }
  }

  var context = getContextForSubtree(parentComponent);
  if (container.context === null) {
    container.context = context;
  } else {
    container.pendingContext = context;
  }

  return scheduleRootUpdate(current$$1, element, expirationTime, callback);
}

function findHostInstance(component) {
  var fiber = get(component);
  if (fiber === undefined) {
    if (typeof component.render === 'function') {
      invariant(false, 'Unable to find node on an unmounted component.');
    } else {
      invariant(false, 'Argument appears to not be a ReactComponent. Keys: %s', Object.keys(component));
    }
  }
  var hostFiber = findCurrentHostFiber(fiber);
  if (hostFiber === null) {
    return null;
  }
  return hostFiber.stateNode;
}

function findHostInstanceWithWarning(component, methodName) {
  {
    var fiber = get(component);
    if (fiber === undefined) {
      if (typeof component.render === 'function') {
        invariant(false, 'Unable to find node on an unmounted component.');
      } else {
        invariant(false, 'Argument appears to not be a ReactComponent. Keys: %s', Object.keys(component));
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
        if (fiber.mode & StrictMode) {
          warningWithoutStack$1(false, '%s is deprecated in StrictMode. ' + '%s was passed an instance of %s which is inside StrictMode. ' + 'Instead, add a ref directly to the element you want to reference.' + '\n%s' + '\n\nLearn more about using refs safely here:' + '\nhttps://fb.me/react-strict-mode-find-node', methodName, methodName, componentName, getStackByFiberInDevAndProd(hostFiber));
        } else {
          warningWithoutStack$1(false, '%s is deprecated in StrictMode. ' + '%s was passed an instance of %s which renders StrictMode children. ' + 'Instead, add a ref directly to the element you want to reference.' + '\n%s' + '\n\nLearn more about using refs safely here:' + '\nhttps://fb.me/react-strict-mode-find-node', methodName, methodName, componentName, getStackByFiberInDevAndProd(hostFiber));
        }
      }
    }
    return hostFiber.stateNode;
  }
  return findHostInstance(component);
}

function createContainer(containerInfo, isConcurrent, hydrate) {
  return createFiberRoot(containerInfo, isConcurrent, hydrate);
}

function updateContainer(element, container, parentComponent, callback) {
  var current$$1 = container.current;
  var currentTime = requestCurrentTime();
  var expirationTime = computeExpirationForFiber(currentTime, current$$1);
  return updateContainerAtExpirationTime(element, container, parentComponent, expirationTime, callback);
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

function findHostInstanceWithNoPortals(fiber) {
  var hostFiber = findCurrentHostFiberWithNoPortals(fiber);
  if (hostFiber === null) {
    return null;
  }
  return hostFiber.stateNode;
}

function injectIntoDevTools(devToolsConfig) {
  var findFiberByHostInstance = devToolsConfig.findFiberByHostInstance;

  return injectInternals(_assign({}, devToolsConfig, {
    findHostInstanceByFiber: function (fiber) {
      var hostFiber = findCurrentHostFiber(fiber);
      if (hostFiber === null) {
        return null;
      }
      return hostFiber.stateNode;
    },
    findFiberByHostInstance: function (instance) {
      if (!findFiberByHostInstance) {
        // Might not be implemented by the renderer.
        return null;
      }
      return findFiberByHostInstance(instance);
    }
  }));
}