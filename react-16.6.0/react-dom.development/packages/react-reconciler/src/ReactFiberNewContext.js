var valueCursor = createCursor(null);

var rendererSigil = void 0;
{
  // Use this to detect multiple renderers using the same context
  rendererSigil = {};
}

var currentlyRenderingFiber = null;
var lastContextDependency = null;
var lastContextWithAllBitsObserved = null;

function resetContextDependences() {
  // This is called right before React yields execution, to ensure `readContext`
  // cannot be called outside the render phase.
  currentlyRenderingFiber = null;
  lastContextDependency = null;
  lastContextWithAllBitsObserved = null;
}

function pushProvider(providerFiber, nextValue) {
  var context = providerFiber.type._context;

  if (isPrimaryRenderer) {
    push(valueCursor, context._currentValue, providerFiber);

    context._currentValue = nextValue;
    {
      !(context._currentRenderer === undefined || context._currentRenderer === null || context._currentRenderer === rendererSigil) ? warningWithoutStack$1(false, 'Detected multiple renderers concurrently rendering the ' + 'same context provider. This is currently unsupported.') : void 0;
      context._currentRenderer = rendererSigil;
    }
  } else {
    push(valueCursor, context._currentValue2, providerFiber);

    context._currentValue2 = nextValue;
    {
      !(context._currentRenderer2 === undefined || context._currentRenderer2 === null || context._currentRenderer2 === rendererSigil) ? warningWithoutStack$1(false, 'Detected multiple renderers concurrently rendering the ' + 'same context provider. This is currently unsupported.') : void 0;
      context._currentRenderer2 = rendererSigil;
    }
  }
}

function popProvider(providerFiber) {
  var currentValue = valueCursor.current;

  pop(valueCursor, providerFiber);

  var context = providerFiber.type._context;
  if (isPrimaryRenderer) {
    context._currentValue = currentValue;
  } else {
    context._currentValue2 = currentValue;
  }
}

function calculateChangedBits(context, newValue, oldValue) {
  // Use Object.is to compare the new context value to the old value. Inlined
  // Object.is polyfill.
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
  if (oldValue === newValue && (oldValue !== 0 || 1 / oldValue === 1 / newValue) || oldValue !== oldValue && newValue !== newValue // eslint-disable-line no-self-compare
  ) {
      // No change
      return 0;
    } else {
    var changedBits = typeof context._calculateChangedBits === 'function' ? context._calculateChangedBits(oldValue, newValue) : maxSigned31BitInt;

    {
      !((changedBits & maxSigned31BitInt) === changedBits) ? warning$1(false, 'calculateChangedBits: Expected the return value to be a ' + '31-bit integer. Instead received: %s', changedBits) : void 0;
    }
    return changedBits | 0;
  }
}

function propagateContextChange(workInProgress, context, changedBits, renderExpirationTime) {
  var fiber = workInProgress.child;
  if (fiber !== null) {
    // Set the return pointer of the child to the work-in-progress fiber.
    fiber.return = workInProgress;
  }
  while (fiber !== null) {
    var nextFiber = void 0;

    // Visit this fiber.
    var dependency = fiber.firstContextDependency;
    if (dependency !== null) {
      do {
        // Check if the context matches.
        if (dependency.context === context && (dependency.observedBits & changedBits) !== 0) {
          // Match! Schedule an update on this fiber.

          if (fiber.tag === ClassComponent) {
            // Schedule a force update on the work-in-progress.
            var update = createUpdate(renderExpirationTime);
            update.tag = ForceUpdate;
            // TODO: Because we don't have a work-in-progress, this will add the
            // update to the current fiber, too, which means it will persist even if
            // this render is thrown away. Since it's a race condition, not sure it's
            // worth fixing.
            enqueueUpdate(fiber, update);
          }

          if (fiber.expirationTime === NoWork || fiber.expirationTime > renderExpirationTime) {
            fiber.expirationTime = renderExpirationTime;
          }
          var alternate = fiber.alternate;
          if (alternate !== null && (alternate.expirationTime === NoWork || alternate.expirationTime > renderExpirationTime)) {
            alternate.expirationTime = renderExpirationTime;
          }
          // Update the child expiration time of all the ancestors, including
          // the alternates.
          var node = fiber.return;
          while (node !== null) {
            alternate = node.alternate;
            if (node.childExpirationTime === NoWork || node.childExpirationTime > renderExpirationTime) {
              node.childExpirationTime = renderExpirationTime;
              if (alternate !== null && (alternate.childExpirationTime === NoWork || alternate.childExpirationTime > renderExpirationTime)) {
                alternate.childExpirationTime = renderExpirationTime;
              }
            } else if (alternate !== null && (alternate.childExpirationTime === NoWork || alternate.childExpirationTime > renderExpirationTime)) {
              alternate.childExpirationTime = renderExpirationTime;
            } else {
              // Neither alternate was updated, which means the rest of the
              // ancestor path already has sufficient priority.
              break;
            }
            node = node.return;
          }
        }
        nextFiber = fiber.child;
        dependency = dependency.next;
      } while (dependency !== null);
    } else if (fiber.tag === ContextProvider) {
      // Don't scan deeper if this is a matching provider
      nextFiber = fiber.type === workInProgress.type ? null : fiber.child;
    } else {
      // Traverse down.
      nextFiber = fiber.child;
    }

    if (nextFiber !== null) {
      // Set the return pointer of the child to the work-in-progress fiber.
      nextFiber.return = fiber;
    } else {
      // No child. Traverse to next sibling.
      nextFiber = fiber;
      while (nextFiber !== null) {
        if (nextFiber === workInProgress) {
          // We're back to the root of this subtree. Exit.
          nextFiber = null;
          break;
        }
        var sibling = nextFiber.sibling;
        if (sibling !== null) {
          // Set the return pointer of the sibling to the work-in-progress fiber.
          sibling.return = nextFiber.return;
          nextFiber = sibling;
          break;
        }
        // No more siblings. Traverse up.
        nextFiber = nextFiber.return;
      }
    }
    fiber = nextFiber;
  }
}

function prepareToReadContext(workInProgress, renderExpirationTime) {
  currentlyRenderingFiber = workInProgress;
  lastContextDependency = null;
  lastContextWithAllBitsObserved = null;

  // Reset the work-in-progress list
  workInProgress.firstContextDependency = null;
}

function readContext(context, observedBits) {
  if (lastContextWithAllBitsObserved === context) {
    // Nothing to do. We already observe everything in this context.
  } else if (observedBits === false || observedBits === 0) {
    // Do not observe any updates.
  } else {
    var resolvedObservedBits = void 0; // Avoid deopting on observable arguments or heterogeneous types.
    if (typeof observedBits !== 'number' || observedBits === maxSigned31BitInt) {
      // Observe all updates.
      lastContextWithAllBitsObserved = context;
      resolvedObservedBits = maxSigned31BitInt;
    } else {
      resolvedObservedBits = observedBits;
    }

    var contextItem = {
      context: context,
      observedBits: resolvedObservedBits,
      next: null
    };

    if (lastContextDependency === null) {
      !(currentlyRenderingFiber !== null) ? invariant(false, 'Context can only be read while React is rendering, e.g. inside the render method or getDerivedStateFromProps.') : void 0;
      // This is the first dependency in the list
      currentlyRenderingFiber.firstContextDependency = lastContextDependency = contextItem;
    } else {
      // Append a new context item.
      lastContextDependency = lastContextDependency.next = contextItem;
    }
  }
  return isPrimaryRenderer ? context._currentValue : context._currentValue2;
}