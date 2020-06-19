var ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;

function describeFiber(fiber) {
  switch (fiber.tag) {
    case IndeterminateComponent:
    case LazyComponent:
    case FunctionComponent:
    case ClassComponent:
    case HostComponent:
    case Mode:
      var owner = fiber._debugOwner;
      var source = fiber._debugSource;
      var name = getComponentName(fiber.type);
      var ownerName = null;
      if (owner) {
        ownerName = getComponentName(owner.type);
      }
      return describeComponentFrame(name, source, ownerName);
    default:
      return '';
  }
}

function getStackByFiberInDevAndProd(workInProgress) {
  var info = '';
  var node = workInProgress;
  do {
    info += describeFiber(node);
    node = node.return;
  } while (node);
  return info;
}

var current = null;
var phase = null;

function getCurrentFiberOwnerNameInDevOrNull() {
  {
    if (current === null) {
      return null;
    }
    var owner = current._debugOwner;
    if (owner !== null && typeof owner !== 'undefined') {
      return getComponentName(owner.type);
    }
  }
  return null;
}

function getCurrentFiberStackInDev() {
  {
    if (current === null) {
      return '';
    }
    // Safe because if current fiber exists, we are reconciling,
    // and it is guaranteed to be the work-in-progress version.
    return getStackByFiberInDevAndProd(current);
  }
  return '';
}

function resetCurrentFiber() {
  {
    ReactDebugCurrentFrame.getCurrentStack = null;
    current = null;
    phase = null;
  }
}

function setCurrentFiber(fiber) {
  {
    ReactDebugCurrentFrame.getCurrentStack = getCurrentFiberStackInDev;
    current = fiber;
    phase = null;
  }
}

function setCurrentPhase(lifeCyclePhase) {
  {
    phase = lifeCyclePhase;
  }
}