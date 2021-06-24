  // This may have been an insertion or a hydration.

  var hydrationParentFiber = null;
  var nextHydratableInstance = null;
  var isHydrating = false;

  function warnIfHydrating() {
    {
      if (isHydrating) {
        error('We should not be hydrating here. This is a bug in React. Please file a bug.');
      }
    }
  }

  function enterHydrationState(fiber) {

    var parentInstance = fiber.stateNode.containerInfo;
    nextHydratableInstance = getFirstHydratableChild(parentInstance);
    hydrationParentFiber = fiber;
    isHydrating = true;
    return true;
  }

  function reenterHydrationStateFromDehydratedSuspenseInstance(fiber, suspenseInstance) {

    nextHydratableInstance = getNextHydratableSibling(suspenseInstance);
    popToNextHostParent(fiber);
    isHydrating = true;
    return true;
  }

  function deleteHydratableInstance(returnFiber, instance) {
    {
      switch (returnFiber.tag) {
        case HostRoot:
          didNotHydrateContainerInstance(returnFiber.stateNode.containerInfo, instance);
          break;

        case HostComponent:
          didNotHydrateInstance(returnFiber.type, returnFiber.memoizedProps, returnFiber.stateNode, instance);
          break;
      }
    }

    var childToDelete = createFiberFromHostInstanceForDeletion();
    childToDelete.stateNode = instance;
    childToDelete.return = returnFiber;
    childToDelete.flags = Deletion; // This might seem like it belongs on progressedFirstDeletion. However,
    // these children are not part of the reconciliation list of children.
    // Even if we abort and rereconcile the children, that will try to hydrate
    // again and the nodes are still in the host tree so these will be
    // recreated.

    if (returnFiber.lastEffect !== null) {
      returnFiber.lastEffect.nextEffect = childToDelete;
      returnFiber.lastEffect = childToDelete;
    } else {
      returnFiber.firstEffect = returnFiber.lastEffect = childToDelete;
    }
  }

  function insertNonHydratedInstance(returnFiber, fiber) {
    fiber.flags = fiber.flags & ~Hydrating | Placement;

    {
      switch (returnFiber.tag) {
        case HostRoot:
          {
            var parentContainer = returnFiber.stateNode.containerInfo;

            switch (fiber.tag) {
              case HostComponent:
                var type = fiber.type;
                var props = fiber.pendingProps;
                didNotFindHydratableContainerInstance(parentContainer, type);
                break;

              case HostText:
                var text = fiber.pendingProps;
                didNotFindHydratableContainerTextInstance(parentContainer, text);
                break;
            }

            break;
          }

        case HostComponent:
          {
            var parentType = returnFiber.type;
            var parentProps = returnFiber.memoizedProps;
            var parentInstance = returnFiber.stateNode;

            switch (fiber.tag) {
              case HostComponent:
                var _type = fiber.type;
                var _props = fiber.pendingProps;
                didNotFindHydratableInstance(parentType, parentProps, parentInstance, _type);
                break;

              case HostText:
                var _text = fiber.pendingProps;
                didNotFindHydratableTextInstance(parentType, parentProps, parentInstance, _text);
                break;

              case SuspenseComponent:
                didNotFindHydratableSuspenseInstance(parentType, parentProps);
                break;
            }

            break;
          }

        default:
          return;
      }
    }
  }

  function tryHydrate(fiber, nextInstance) {
    switch (fiber.tag) {
      case HostComponent:
        {
          var type = fiber.type;
          var props = fiber.pendingProps;
          var instance = canHydrateInstance(nextInstance, type);

          if (instance !== null) {
            fiber.stateNode = instance;
            return true;
          }

          return false;
        }

      case HostText:
        {
          var text = fiber.pendingProps;
          var textInstance = canHydrateTextInstance(nextInstance, text);

          if (textInstance !== null) {
            fiber.stateNode = textInstance;
            return true;
          }

          return false;
        }

      case SuspenseComponent:
        {
          {
            var suspenseInstance = canHydrateSuspenseInstance(nextInstance);

            if (suspenseInstance !== null) {
              var suspenseState = {
                dehydrated: suspenseInstance,
                retryLane: OffscreenLane
              };
              fiber.memoizedState = suspenseState; // Store the dehydrated fragment as a child fiber.
              // This simplifies the code for getHostSibling and deleting nodes,
              // since it doesn't have to consider all Suspense boundaries and
              // check if they're dehydrated ones or not.

              var dehydratedFragment = createFiberFromDehydratedFragment(suspenseInstance);
              dehydratedFragment.return = fiber;
              fiber.child = dehydratedFragment;
              return true;
            }
          }

          return false;
        }

      default:
        return false;
    }
  }

  function tryToClaimNextHydratableInstance(fiber) {
    if (!isHydrating) {
      return;
    }

    var nextInstance = nextHydratableInstance;

    if (!nextInstance) {
      // Nothing to hydrate. Make it an insertion.
      insertNonHydratedInstance(hydrationParentFiber, fiber);
      isHydrating = false;
      hydrationParentFiber = fiber;
      return;
    }

    var firstAttemptedInstance = nextInstance;

    if (!tryHydrate(fiber, nextInstance)) {
      // If we can't hydrate this instance let's try the next one.
      // We use this as a heuristic. It's based on intuition and not data so it
      // might be flawed or unnecessary.
      nextInstance = getNextHydratableSibling(firstAttemptedInstance);

      if (!nextInstance || !tryHydrate(fiber, nextInstance)) {
        // Nothing to hydrate. Make it an insertion.
        insertNonHydratedInstance(hydrationParentFiber, fiber);
        isHydrating = false;
        hydrationParentFiber = fiber;
        return;
      } // We matched the next one, we'll now assume that the first one was
      // superfluous and we'll delete it. Since we can't eagerly delete it
      // we'll have to schedule a deletion. To do that, this node needs a dummy
      // fiber associated with it.


      deleteHydratableInstance(hydrationParentFiber, firstAttemptedInstance);
    }

    hydrationParentFiber = fiber;
    nextHydratableInstance = getFirstHydratableChild(nextInstance);
  }

  function prepareToHydrateHostInstance(fiber, rootContainerInstance, hostContext) {

    var instance = fiber.stateNode;
    var updatePayload = hydrateInstance(instance, fiber.type, fiber.memoizedProps, rootContainerInstance, hostContext, fiber); // TODO: Type this specific to this type of component.

    fiber.updateQueue = updatePayload; // If the update payload indicates that there is a change or if there
    // is a new ref we mark this as an update.

    if (updatePayload !== null) {
      return true;
    }

    return false;
  }

  function prepareToHydrateHostTextInstance(fiber) {

    var textInstance = fiber.stateNode;
    var textContent = fiber.memoizedProps;
    var shouldUpdate = hydrateTextInstance(textInstance, textContent, fiber);

    {
      if (shouldUpdate) {
        // We assume that prepareToHydrateHostTextInstance is called in a context where the
        // hydration parent is the parent host component of this host text.
        var returnFiber = hydrationParentFiber;

        if (returnFiber !== null) {
          switch (returnFiber.tag) {
            case HostRoot:
              {
                var parentContainer = returnFiber.stateNode.containerInfo;
                didNotMatchHydratedContainerTextInstance(parentContainer, textInstance, textContent);
                break;
              }

            case HostComponent:
              {
                var parentType = returnFiber.type;
                var parentProps = returnFiber.memoizedProps;
                var parentInstance = returnFiber.stateNode;
                didNotMatchHydratedTextInstance(parentType, parentProps, parentInstance, textInstance, textContent);
                break;
              }
          }
        }
      }
    }

    return shouldUpdate;
  }

  function prepareToHydrateHostSuspenseInstance(fiber) {

    var suspenseState = fiber.memoizedState;
    var suspenseInstance = suspenseState !== null ? suspenseState.dehydrated : null;

    if (!suspenseInstance) {
      {
        throw Error( "Expected to have a hydrated suspense instance. This error is likely caused by a bug in React. Please file an issue." );
      }
    }

    hydrateSuspenseInstance(suspenseInstance, fiber);
  }

  function skipPastDehydratedSuspenseInstance(fiber) {

    var suspenseState = fiber.memoizedState;
    var suspenseInstance = suspenseState !== null ? suspenseState.dehydrated : null;

    if (!suspenseInstance) {
      {
        throw Error( "Expected to have a hydrated suspense instance. This error is likely caused by a bug in React. Please file an issue." );
      }
    }

    return getNextHydratableInstanceAfterSuspenseInstance(suspenseInstance);
  }

  function popToNextHostParent(fiber) {
    var parent = fiber.return;

    while (parent !== null && parent.tag !== HostComponent && parent.tag !== HostRoot && parent.tag !== SuspenseComponent) {
      parent = parent.return;
    }

    hydrationParentFiber = parent;
  }

  function popHydrationState(fiber) {

    if (fiber !== hydrationParentFiber) {
      // We're deeper than the current hydration context, inside an inserted
      // tree.
      return false;
    }

    if (!isHydrating) {
      // If we're not currently hydrating but we're in a hydration context, then
      // we were an insertion and now need to pop up reenter hydration of our
      // siblings.
      popToNextHostParent(fiber);
      isHydrating = true;
      return false;
    }

    var type = fiber.type; // If we have any remaining hydratable nodes, we need to delete them now.
    // We only do this deeper than head and body since they tend to have random
    // other nodes in them. We also ignore components with pure text content in
    // side of them.
    // TODO: Better heuristic.

    if (fiber.tag !== HostComponent || type !== 'head' && type !== 'body' && !shouldSetTextContent(type, fiber.memoizedProps)) {
      var nextInstance = nextHydratableInstance;

      while (nextInstance) {
        deleteHydratableInstance(fiber, nextInstance);
        nextInstance = getNextHydratableSibling(nextInstance);
      }
    }

    popToNextHostParent(fiber);

    if (fiber.tag === SuspenseComponent) {
      nextHydratableInstance = skipPastDehydratedSuspenseInstance(fiber);
    } else {
      nextHydratableInstance = hydrationParentFiber ? getNextHydratableSibling(fiber.stateNode) : null;
    }

    return true;
  }

  function resetHydrationState() {

    hydrationParentFiber = null;
    nextHydratableInstance = null;
    isHydrating = false;
  }

  function getIsHydrating() {
    return isHydrating;
  }