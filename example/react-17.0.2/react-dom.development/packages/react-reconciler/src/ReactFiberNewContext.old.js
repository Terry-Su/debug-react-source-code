  var valueCursor = createCursor(null);
  var rendererSigil;

  {
    // Use this to detect multiple renderers using the same context
    rendererSigil = {};
  }

  var currentlyRenderingFiber = null;
  var lastContextDependency = null;
  var lastContextWithAllBitsObserved = null;
  var isDisallowedContextReadInDEV = false;
  function resetContextDependencies() {
    // This is called right before React yields execution, to ensure `readContext`
    // cannot be called outside the render phase.
    currentlyRenderingFiber = null;
    lastContextDependency = null;
    lastContextWithAllBitsObserved = null;

    {
      isDisallowedContextReadInDEV = false;
    }
  }
  function enterDisallowedContextReadInDEV() {
    {
      isDisallowedContextReadInDEV = true;
    }
  }
  function exitDisallowedContextReadInDEV() {
    {
      isDisallowedContextReadInDEV = false;
    }
  }
  function pushProvider(providerFiber, nextValue) {
    var context = providerFiber.type._context;

    {
      push(valueCursor, context._currentValue, providerFiber);
      context._currentValue = nextValue;

      {
        if (context._currentRenderer !== undefined && context._currentRenderer !== null && context._currentRenderer !== rendererSigil) {
          error('Detected multiple renderers concurrently rendering the ' + 'same context provider. This is currently unsupported.');
        }

        context._currentRenderer = rendererSigil;
      }
    }
  }
  function popProvider(providerFiber) {
    var currentValue = valueCursor.current;
    pop(valueCursor, providerFiber);
    var context = providerFiber.type._context;

    {
      context._currentValue = currentValue;
    }
  }
  function calculateChangedBits(context, newValue, oldValue) {
    if (objectIs(oldValue, newValue)) {
      // No change
      return 0;
    } else {
      var changedBits = typeof context._calculateChangedBits === 'function' ? context._calculateChangedBits(oldValue, newValue) : MAX_SIGNED_31_BIT_INT;

      {
        if ((changedBits & MAX_SIGNED_31_BIT_INT) !== changedBits) {
          error('calculateChangedBits: Expected the return value to be a ' + '31-bit integer. Instead received: %s', changedBits);
        }
      }

      return changedBits | 0;
    }
  }
  function scheduleWorkOnParentPath(parent, renderLanes) {
    // Update the child lanes of all the ancestors, including the alternates.
    var node = parent;

    while (node !== null) {
      var alternate = node.alternate;

      if (!isSubsetOfLanes(node.childLanes, renderLanes)) {
        node.childLanes = mergeLanes(node.childLanes, renderLanes);

        if (alternate !== null) {
          alternate.childLanes = mergeLanes(alternate.childLanes, renderLanes);
        }
      } else if (alternate !== null && !isSubsetOfLanes(alternate.childLanes, renderLanes)) {
        alternate.childLanes = mergeLanes(alternate.childLanes, renderLanes);
      } else {
        // Neither alternate was updated, which means the rest of the
        // ancestor path already has sufficient priority.
        break;
      }

      node = node.return;
    }
  }
  function propagateContextChange(workInProgress, context, changedBits, renderLanes) {
    var fiber = workInProgress.child;

    if (fiber !== null) {
      // Set the return pointer of the child to the work-in-progress fiber.
      fiber.return = workInProgress;
    }

    while (fiber !== null) {
      var nextFiber = void 0; // Visit this fiber.

      var list = fiber.dependencies;

      if (list !== null) {
        nextFiber = fiber.child;
        var dependency = list.firstContext;

        while (dependency !== null) {
          // Check if the context matches.
          if (dependency.context === context && (dependency.observedBits & changedBits) !== 0) {
            // Match! Schedule an update on this fiber.
            if (fiber.tag === ClassComponent) {
              // Schedule a force update on the work-in-progress.
              var update = createUpdate(NoTimestamp, pickArbitraryLane(renderLanes));
              update.tag = ForceUpdate; // TODO: Because we don't have a work-in-progress, this will add the
              // update to the current fiber, too, which means it will persist even if
              // this render is thrown away. Since it's a race condition, not sure it's
              // worth fixing.

              enqueueUpdate(fiber, update);
            }

            fiber.lanes = mergeLanes(fiber.lanes, renderLanes);
            var alternate = fiber.alternate;

            if (alternate !== null) {
              alternate.lanes = mergeLanes(alternate.lanes, renderLanes);
            }

            scheduleWorkOnParentPath(fiber.return, renderLanes); // Mark the updated lanes on the list, too.

            list.lanes = mergeLanes(list.lanes, renderLanes); // Since we already found a match, we can stop traversing the
            // dependency list.

            break;
          }

          dependency = dependency.next;
        }
      } else if (fiber.tag === ContextProvider) {
        // Don't scan deeper if this is a matching provider
        nextFiber = fiber.type === workInProgress.type ? null : fiber.child;
      } else if ( fiber.tag === DehydratedFragment) {
        // If a dehydrated suspense boundary is in this subtree, we don't know
        // if it will have any context consumers in it. The best we can do is
        // mark it as having updates.
        var parentSuspense = fiber.return;

        if (!(parentSuspense !== null)) {
          {
            throw Error( "We just came from a parent so we must have had a parent. This is a bug in React." );
          }
        }

        parentSuspense.lanes = mergeLanes(parentSuspense.lanes, renderLanes);
        var _alternate = parentSuspense.alternate;

        if (_alternate !== null) {
          _alternate.lanes = mergeLanes(_alternate.lanes, renderLanes);
        } // This is intentionally passing this fiber as the parent
        // because we want to schedule this fiber as having work
        // on its children. We'll use the childLanes on
        // this fiber to indicate that a context has changed.


        scheduleWorkOnParentPath(parentSuspense, renderLanes);
        nextFiber = fiber.sibling;
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
          } // No more siblings. Traverse up.


          nextFiber = nextFiber.return;
        }
      }

      fiber = nextFiber;
    }
  }
  function prepareToReadContext(workInProgress, renderLanes) {
    currentlyRenderingFiber = workInProgress;
    lastContextDependency = null;
    lastContextWithAllBitsObserved = null;
    var dependencies = workInProgress.dependencies;

    if (dependencies !== null) {
      var firstContext = dependencies.firstContext;

      if (firstContext !== null) {
        if (includesSomeLane(dependencies.lanes, renderLanes)) {
          // Context list has a pending update. Mark that this fiber performed work.
          markWorkInProgressReceivedUpdate();
        } // Reset the work-in-progress list


        dependencies.firstContext = null;
      }
    }
  }
  function readContext(context, observedBits) {
    {
      // This warning would fire if you read context inside a Hook like useMemo.
      // Unlike the class check below, it's not enforced in production for perf.
      if (isDisallowedContextReadInDEV) {
        error('Context can only be read while React is rendering. ' + 'In classes, you can read it in the render method or getDerivedStateFromProps. ' + 'In function components, you can read it directly in the function body, but not ' + 'inside Hooks like useReducer() or useMemo().');
      }
    }

    if (lastContextWithAllBitsObserved === context) ; else if (observedBits === false || observedBits === 0) ; else {
      var resolvedObservedBits; // Avoid deopting on observable arguments or heterogeneous types.

      if (typeof observedBits !== 'number' || observedBits === MAX_SIGNED_31_BIT_INT) {
        // Observe all updates.
        lastContextWithAllBitsObserved = context;
        resolvedObservedBits = MAX_SIGNED_31_BIT_INT;
      } else {
        resolvedObservedBits = observedBits;
      }

      var contextItem = {
        context: context,
        observedBits: resolvedObservedBits,
        next: null
      };

      if (lastContextDependency === null) {
        if (!(currentlyRenderingFiber !== null)) {
          {
            throw Error( "Context can only be read while React is rendering. In classes, you can read it in the render method or getDerivedStateFromProps. In function components, you can read it directly in the function body, but not inside Hooks like useReducer() or useMemo()." );
          }
        } // This is the first dependency for this component. Create a new list.


        lastContextDependency = contextItem;
        currentlyRenderingFiber.dependencies = {
          lanes: NoLanes,
          firstContext: contextItem,
          responders: null
        };
      } else {
        // Append a new context item.
        lastContextDependency = lastContextDependency.next = contextItem;
      }
    }

    return  context._currentValue ;
  }