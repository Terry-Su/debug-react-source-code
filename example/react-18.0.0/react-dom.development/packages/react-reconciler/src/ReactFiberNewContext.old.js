  var valueCursor = createCursor(null);
  var rendererSigil;

  {
    // Use this to detect multiple renderers using the same context
    rendererSigil = {};
  }

  var currentlyRenderingFiber = null;
  var lastContextDependency = null;
  var lastFullyObservedContext = null;
  var isDisallowedContextReadInDEV = false;
  function resetContextDependencies() {
    // This is called right before React yields execution, to ensure `readContext`
    // cannot be called outside the render phase.
    currentlyRenderingFiber = null;
    lastContextDependency = null;
    lastFullyObservedContext = null;

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
  function pushProvider(providerFiber, context, nextValue) {
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
  function popProvider(context, providerFiber) {
    var currentValue = valueCursor.current;
    pop(valueCursor, providerFiber);

    {
      if ( currentValue === REACT_SERVER_CONTEXT_DEFAULT_VALUE_NOT_LOADED) {
        context._currentValue = context._defaultValue;
      } else {
        context._currentValue = currentValue;
      }
    }
  }
  function scheduleContextWorkOnParentPath(parent, renderLanes, propagationRoot) {
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
      }

      if (node === propagationRoot) {
        break;
      }

      node = node.return;
    }

    {
      if (node !== propagationRoot) {
        error('Expected to find the propagation root when scheduling context work. ' + 'This error is likely caused by a bug in React. Please file an issue.');
      }
    }
  }
  function propagateContextChange(workInProgress, context, renderLanes) {
    {
      propagateContextChange_eager(workInProgress, context, renderLanes);
    }
  }

  function propagateContextChange_eager(workInProgress, context, renderLanes) {

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
          if (dependency.context === context) {
            // Match! Schedule an update on this fiber.
            if (fiber.tag === ClassComponent) {
              // Schedule a force update on the work-in-progress.
              var lane = pickArbitraryLane(renderLanes);
              var update = createUpdate(NoTimestamp, lane);
              update.tag = ForceUpdate; // TODO: Because we don't have a work-in-progress, this will add the
              // update to the current fiber, too, which means it will persist even if
              // this render is thrown away. Since it's a race condition, not sure it's
              // worth fixing.
              // Inlined `enqueueUpdate` to remove interleaved update check

              var updateQueue = fiber.updateQueue;

              if (updateQueue === null) ; else {
                var sharedQueue = updateQueue.shared;
                var pending = sharedQueue.pending;

                if (pending === null) {
                  // This is the first update. Create a circular list.
                  update.next = update;
                } else {
                  update.next = pending.next;
                  pending.next = update;
                }

                sharedQueue.pending = update;
              }
            }

            fiber.lanes = mergeLanes(fiber.lanes, renderLanes);
            var alternate = fiber.alternate;

            if (alternate !== null) {
              alternate.lanes = mergeLanes(alternate.lanes, renderLanes);
            }

            scheduleContextWorkOnParentPath(fiber.return, renderLanes, workInProgress); // Mark the updated lanes on the list, too.

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

        if (parentSuspense === null) {
          throw new Error('We just came from a parent so we must have had a parent. This is a bug in React.');
        }

        parentSuspense.lanes = mergeLanes(parentSuspense.lanes, renderLanes);
        var _alternate = parentSuspense.alternate;

        if (_alternate !== null) {
          _alternate.lanes = mergeLanes(_alternate.lanes, renderLanes);
        } // This is intentionally passing this fiber as the parent
        // because we want to schedule this fiber as having work
        // on its children. We'll use the childLanes on
        // this fiber to indicate that a context has changed.


        scheduleContextWorkOnParentPath(parentSuspense, renderLanes, workInProgress);
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
    lastFullyObservedContext = null;
    var dependencies = workInProgress.dependencies;

    if (dependencies !== null) {
      {
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
  }
  function readContext(context) {
    {
      // This warning would fire if you read context inside a Hook like useMemo.
      // Unlike the class check below, it's not enforced in production for perf.
      if (isDisallowedContextReadInDEV) {
        error('Context can only be read while React is rendering. ' + 'In classes, you can read it in the render method or getDerivedStateFromProps. ' + 'In function components, you can read it directly in the function body, but not ' + 'inside Hooks like useReducer() or useMemo().');
      }
    }

    var value =  context._currentValue ;

    if (lastFullyObservedContext === context) ; else {
      var contextItem = {
        context: context,
        memoizedValue: value,
        next: null
      };

      if (lastContextDependency === null) {
        if (currentlyRenderingFiber === null) {
          throw new Error('Context can only be read while React is rendering. ' + 'In classes, you can read it in the render method or getDerivedStateFromProps. ' + 'In function components, you can read it directly in the function body, but not ' + 'inside Hooks like useReducer() or useMemo().');
        } // This is the first dependency for this component. Create a new list.


        lastContextDependency = contextItem;
        currentlyRenderingFiber.dependencies = {
          lanes: NoLanes,
          firstContext: contextItem
        };
      } else {
        // Append a new context item.
        lastContextDependency = lastContextDependency.next = contextItem;
      }
    }

    return value;
  }