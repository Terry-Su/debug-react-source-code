  var didWarnAboutUndefinedSnapshotBeforeUpdate = null;

  {
    didWarnAboutUndefinedSnapshotBeforeUpdate = new Set();
  }

  var PossiblyWeakSet = typeof WeakSet === 'function' ? WeakSet : Set;

  var callComponentWillUnmountWithTimer = function (current, instance) {
    instance.props = current.memoizedProps;
    instance.state = current.memoizedState;

    {
      instance.componentWillUnmount();
    }
  }; // Capture errors so they don't interrupt unmounting.


  function safelyCallComponentWillUnmount(current, instance) {
    {
      invokeGuardedCallback(null, callComponentWillUnmountWithTimer, null, current, instance);

      if (hasCaughtError()) {
        var unmountError = clearCaughtError();
        captureCommitPhaseError(current, unmountError);
      }
    }
  }

  function safelyDetachRef(current) {
    var ref = current.ref;

    if (ref !== null) {
      if (typeof ref === 'function') {
        {
          invokeGuardedCallback(null, ref, null, null);

          if (hasCaughtError()) {
            var refError = clearCaughtError();
            captureCommitPhaseError(current, refError);
          }
        }
      } else {
        ref.current = null;
      }
    }
  }

  function safelyCallDestroy(current, destroy) {
    {
      invokeGuardedCallback(null, destroy, null);

      if (hasCaughtError()) {
        var error = clearCaughtError();
        captureCommitPhaseError(current, error);
      }
    }
  }

  function commitBeforeMutationLifeCycles(current, finishedWork) {
    switch (finishedWork.tag) {
      case FunctionComponent:
      case ForwardRef:
      case SimpleMemoComponent:
      case Block:
        {
          return;
        }

      case ClassComponent:
        {
          if (finishedWork.flags & Snapshot) {
            if (current !== null) {
              var prevProps = current.memoizedProps;
              var prevState = current.memoizedState;
              var instance = finishedWork.stateNode; // We could update instance props and state here,
              // but instead we rely on them being set during last render.
              // TODO: revisit this when we implement resuming.

              {
                if (finishedWork.type === finishedWork.elementType && !didWarnAboutReassigningProps) {
                  if (instance.props !== finishedWork.memoizedProps) {
                    error('Expected %s props to match memoized props before ' + 'getSnapshotBeforeUpdate. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.props`. ' + 'Please file an issue.', getComponentName(finishedWork.type) || 'instance');
                  }

                  if (instance.state !== finishedWork.memoizedState) {
                    error('Expected %s state to match memoized state before ' + 'getSnapshotBeforeUpdate. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.state`. ' + 'Please file an issue.', getComponentName(finishedWork.type) || 'instance');
                  }
                }
              }

              var snapshot = instance.getSnapshotBeforeUpdate(finishedWork.elementType === finishedWork.type ? prevProps : resolveDefaultProps(finishedWork.type, prevProps), prevState);

              {
                var didWarnSet = didWarnAboutUndefinedSnapshotBeforeUpdate;

                if (snapshot === undefined && !didWarnSet.has(finishedWork.type)) {
                  didWarnSet.add(finishedWork.type);

                  error('%s.getSnapshotBeforeUpdate(): A snapshot value (or null) ' + 'must be returned. You have returned undefined.', getComponentName(finishedWork.type));
                }
              }

              instance.__reactInternalSnapshotBeforeUpdate = snapshot;
            }
          }

          return;
        }

      case HostRoot:
        {
          {
            if (finishedWork.flags & Snapshot) {
              var root = finishedWork.stateNode;
              clearContainer(root.containerInfo);
            }
          }

          return;
        }

      case HostComponent:
      case HostText:
      case HostPortal:
      case IncompleteClassComponent:
        // Nothing to do for these component types
        return;
    }

    {
      {
        throw Error( "This unit of work tag should not have side-effects. This error is likely caused by a bug in React. Please file an issue." );
      }
    }
  }

  function commitHookEffectListUnmount(tag, finishedWork) {
    var updateQueue = finishedWork.updateQueue;
    var lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;

    if (lastEffect !== null) {
      var firstEffect = lastEffect.next;
      var effect = firstEffect;

      do {
        if ((effect.tag & tag) === tag) {
          // Unmount
          var destroy = effect.destroy;
          effect.destroy = undefined;

          if (destroy !== undefined) {
            destroy();
          }
        }

        effect = effect.next;
      } while (effect !== firstEffect);
    }
  }

  function commitHookEffectListMount(tag, finishedWork) {
    var updateQueue = finishedWork.updateQueue;
    var lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;

    if (lastEffect !== null) {
      var firstEffect = lastEffect.next;
      var effect = firstEffect;

      do {
        if ((effect.tag & tag) === tag) {
          // Mount
          var create = effect.create;
          effect.destroy = create();

          {
            var destroy = effect.destroy;

            if (destroy !== undefined && typeof destroy !== 'function') {
              var addendum = void 0;

              if (destroy === null) {
                addendum = ' You returned null. If your effect does not require clean ' + 'up, return undefined (or nothing).';
              } else if (typeof destroy.then === 'function') {
                addendum = '\n\nIt looks like you wrote useEffect(async () => ...) or returned a Promise. ' + 'Instead, write the async function inside your effect ' + 'and call it immediately:\n\n' + 'useEffect(() => {\n' + '  async function fetchData() {\n' + '    // You can await here\n' + '    const response = await MyAPI.getData(someId);\n' + '    // ...\n' + '  }\n' + '  fetchData();\n' + "}, [someId]); // Or [] if effect doesn't need props or state\n\n" + 'Learn more about data fetching with Hooks: https://reactjs.org/link/hooks-data-fetching';
              } else {
                addendum = ' You returned: ' + destroy;
              }

              error('An effect function must not return anything besides a function, ' + 'which is used for clean-up.%s', addendum);
            }
          }
        }

        effect = effect.next;
      } while (effect !== firstEffect);
    }
  }

  function schedulePassiveEffects(finishedWork) {
    var updateQueue = finishedWork.updateQueue;
    var lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;

    if (lastEffect !== null) {
      var firstEffect = lastEffect.next;
      var effect = firstEffect;

      do {
        var _effect = effect,
            next = _effect.next,
            tag = _effect.tag;

        if ((tag & Passive$1) !== NoFlags$1 && (tag & HasEffect) !== NoFlags$1) {
          enqueuePendingPassiveHookEffectUnmount(finishedWork, effect);
          enqueuePendingPassiveHookEffectMount(finishedWork, effect);
        }

        effect = next;
      } while (effect !== firstEffect);
    }
  }

  function commitLifeCycles(finishedRoot, current, finishedWork, committedLanes) {
    switch (finishedWork.tag) {
      case FunctionComponent:
      case ForwardRef:
      case SimpleMemoComponent:
      case Block:
        {
          // At this point layout effects have already been destroyed (during mutation phase).
          // This is done to prevent sibling component effects from interfering with each other,
          // e.g. a destroy function in one component should never override a ref set
          // by a create function in another component during the same commit.
          {
            commitHookEffectListMount(Layout | HasEffect, finishedWork);
          }

          schedulePassiveEffects(finishedWork);
          return;
        }

      case ClassComponent:
        {
          var instance = finishedWork.stateNode;

          if (finishedWork.flags & Update) {
            if (current === null) {
              // We could update instance props and state here,
              // but instead we rely on them being set during last render.
              // TODO: revisit this when we implement resuming.
              {
                if (finishedWork.type === finishedWork.elementType && !didWarnAboutReassigningProps) {
                  if (instance.props !== finishedWork.memoizedProps) {
                    error('Expected %s props to match memoized props before ' + 'componentDidMount. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.props`. ' + 'Please file an issue.', getComponentName(finishedWork.type) || 'instance');
                  }

                  if (instance.state !== finishedWork.memoizedState) {
                    error('Expected %s state to match memoized state before ' + 'componentDidMount. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.state`. ' + 'Please file an issue.', getComponentName(finishedWork.type) || 'instance');
                  }
                }
              }

              {
                instance.componentDidMount();
              }
            } else {
              var prevProps = finishedWork.elementType === finishedWork.type ? current.memoizedProps : resolveDefaultProps(finishedWork.type, current.memoizedProps);
              var prevState = current.memoizedState; // We could update instance props and state here,
              // but instead we rely on them being set during last render.
              // TODO: revisit this when we implement resuming.

              {
                if (finishedWork.type === finishedWork.elementType && !didWarnAboutReassigningProps) {
                  if (instance.props !== finishedWork.memoizedProps) {
                    error('Expected %s props to match memoized props before ' + 'componentDidUpdate. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.props`. ' + 'Please file an issue.', getComponentName(finishedWork.type) || 'instance');
                  }

                  if (instance.state !== finishedWork.memoizedState) {
                    error('Expected %s state to match memoized state before ' + 'componentDidUpdate. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.state`. ' + 'Please file an issue.', getComponentName(finishedWork.type) || 'instance');
                  }
                }
              }

              {
                instance.componentDidUpdate(prevProps, prevState, instance.__reactInternalSnapshotBeforeUpdate);
              }
            }
          } // TODO: I think this is now always non-null by the time it reaches the
          // commit phase. Consider removing the type check.


          var updateQueue = finishedWork.updateQueue;

          if (updateQueue !== null) {
            {
              if (finishedWork.type === finishedWork.elementType && !didWarnAboutReassigningProps) {
                if (instance.props !== finishedWork.memoizedProps) {
                  error('Expected %s props to match memoized props before ' + 'processing the update queue. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.props`. ' + 'Please file an issue.', getComponentName(finishedWork.type) || 'instance');
                }

                if (instance.state !== finishedWork.memoizedState) {
                  error('Expected %s state to match memoized state before ' + 'processing the update queue. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.state`. ' + 'Please file an issue.', getComponentName(finishedWork.type) || 'instance');
                }
              }
            } // We could update instance props and state here,
            // but instead we rely on them being set during last render.
            // TODO: revisit this when we implement resuming.


            commitUpdateQueue(finishedWork, updateQueue, instance);
          }

          return;
        }

      case HostRoot:
        {
          // TODO: I think this is now always non-null by the time it reaches the
          // commit phase. Consider removing the type check.
          var _updateQueue = finishedWork.updateQueue;

          if (_updateQueue !== null) {
            var _instance = null;

            if (finishedWork.child !== null) {
              switch (finishedWork.child.tag) {
                case HostComponent:
                  _instance = getPublicInstance(finishedWork.child.stateNode);
                  break;

                case ClassComponent:
                  _instance = finishedWork.child.stateNode;
                  break;
              }
            }

            commitUpdateQueue(finishedWork, _updateQueue, _instance);
          }

          return;
        }

      case HostComponent:
        {
          var _instance2 = finishedWork.stateNode; // Renderers may schedule work to be done after host components are mounted
          // (eg DOM renderer may schedule auto-focus for inputs and form controls).
          // These effects should only be committed when components are first mounted,
          // aka when there is no current/alternate.

          if (current === null && finishedWork.flags & Update) {
            var type = finishedWork.type;
            var props = finishedWork.memoizedProps;
            commitMount(_instance2, type, props);
          }

          return;
        }

      case HostText:
        {
          // We have no life-cycles associated with text.
          return;
        }

      case HostPortal:
        {
          // We have no life-cycles associated with portals.
          return;
        }

      case Profiler:
        {
          {
            var _finishedWork$memoize2 = finishedWork.memoizedProps,
                onCommit = _finishedWork$memoize2.onCommit,
                onRender = _finishedWork$memoize2.onRender;
            var effectDuration = finishedWork.stateNode.effectDuration;
            var commitTime = getCommitTime();

            if (typeof onRender === 'function') {
              {
                onRender(finishedWork.memoizedProps.id, current === null ? 'mount' : 'update', finishedWork.actualDuration, finishedWork.treeBaseDuration, finishedWork.actualStartTime, commitTime, finishedRoot.memoizedInteractions);
              }
            }
          }

          return;
        }

      case SuspenseComponent:
        {
          commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
          return;
        }

      case SuspenseListComponent:
      case IncompleteClassComponent:
      case FundamentalComponent:
      case ScopeComponent:
      case OffscreenComponent:
      case LegacyHiddenComponent:
        return;
    }

    {
      {
        throw Error( "This unit of work tag should not have side-effects. This error is likely caused by a bug in React. Please file an issue." );
      }
    }
  }

  function hideOrUnhideAllChildren(finishedWork, isHidden) {
    {
      // We only have the top Fiber that was inserted but we need to recurse down its
      // children to find all the terminal nodes.
      var node = finishedWork;

      while (true) {
        if (node.tag === HostComponent) {
          var instance = node.stateNode;

          if (isHidden) {
            hideInstance(instance);
          } else {
            unhideInstance(node.stateNode, node.memoizedProps);
          }
        } else if (node.tag === HostText) {
          var _instance3 = node.stateNode;

          if (isHidden) {
            hideTextInstance(_instance3);
          } else {
            unhideTextInstance(_instance3, node.memoizedProps);
          }
        } else if ((node.tag === OffscreenComponent || node.tag === LegacyHiddenComponent) && node.memoizedState !== null && node !== finishedWork) ; else if (node.child !== null) {
          node.child.return = node;
          node = node.child;
          continue;
        }

        if (node === finishedWork) {
          return;
        }

        while (node.sibling === null) {
          if (node.return === null || node.return === finishedWork) {
            return;
          }

          node = node.return;
        }

        node.sibling.return = node.return;
        node = node.sibling;
      }
    }
  }

  function commitAttachRef(finishedWork) {
    var ref = finishedWork.ref;

    if (ref !== null) {
      var instance = finishedWork.stateNode;
      var instanceToUse;

      switch (finishedWork.tag) {
        case HostComponent:
          instanceToUse = getPublicInstance(instance);
          break;

        default:
          instanceToUse = instance;
      } // Moved outside to ensure DCE works with this flag

      if (typeof ref === 'function') {
        ref(instanceToUse);
      } else {
        {
          if (!ref.hasOwnProperty('current')) {
            error('Unexpected ref object provided for %s. ' + 'Use either a ref-setter function or React.createRef().', getComponentName(finishedWork.type));
          }
        }

        ref.current = instanceToUse;
      }
    }
  }

  function commitDetachRef(current) {
    var currentRef = current.ref;

    if (currentRef !== null) {
      if (typeof currentRef === 'function') {
        currentRef(null);
      } else {
        currentRef.current = null;
      }
    }
  } // User-originating errors (lifecycles and refs) should not interrupt
  // deletion, so don't let them throw. Host-originating errors should
  // interrupt deletion, so it's okay


  function commitUnmount(finishedRoot, current, renderPriorityLevel) {
    onCommitUnmount(current);

    switch (current.tag) {
      case FunctionComponent:
      case ForwardRef:
      case MemoComponent:
      case SimpleMemoComponent:
      case Block:
        {
          var updateQueue = current.updateQueue;

          if (updateQueue !== null) {
            var lastEffect = updateQueue.lastEffect;

            if (lastEffect !== null) {
              var firstEffect = lastEffect.next;
              var effect = firstEffect;

              do {
                var _effect2 = effect,
                    destroy = _effect2.destroy,
                    tag = _effect2.tag;

                if (destroy !== undefined) {
                  if ((tag & Passive$1) !== NoFlags$1) {
                    enqueuePendingPassiveHookEffectUnmount(current, effect);
                  } else {
                    {
                      safelyCallDestroy(current, destroy);
                    }
                  }
                }

                effect = effect.next;
              } while (effect !== firstEffect);
            }
          }

          return;
        }

      case ClassComponent:
        {
          safelyDetachRef(current);
          var instance = current.stateNode;

          if (typeof instance.componentWillUnmount === 'function') {
            safelyCallComponentWillUnmount(current, instance);
          }

          return;
        }

      case HostComponent:
        {
          safelyDetachRef(current);
          return;
        }

      case HostPortal:
        {
          // TODO: this is recursive.
          // We are also not using this parent because
          // the portal will get pushed immediately.
          {
            unmountHostComponents(finishedRoot, current);
          }

          return;
        }

      case FundamentalComponent:
        {

          return;
        }

      case DehydratedFragment:
        {

          return;
        }

      case ScopeComponent:
        {

          return;
        }
    }
  }

  function commitNestedUnmounts(finishedRoot, root, renderPriorityLevel) {
    // While we're inside a removed host node we don't want to call
    // removeChild on the inner nodes because they're removed by the top
    // call anyway. We also want to call componentWillUnmount on all
    // composites before this host node is removed from the tree. Therefore
    // we do an inner loop while we're still inside the host node.
    var node = root;

    while (true) {
      commitUnmount(finishedRoot, node); // Visit children because they may contain more composite or host nodes.
      // Skip portals because commitUnmount() currently visits them recursively.

      if (node.child !== null && ( // If we use mutation we drill down into portals using commitUnmount above.
      // If we don't use mutation we drill down into portals here instead.
       node.tag !== HostPortal)) {
        node.child.return = node;
        node = node.child;
        continue;
      }

      if (node === root) {
        return;
      }

      while (node.sibling === null) {
        if (node.return === null || node.return === root) {
          return;
        }

        node = node.return;
      }

      node.sibling.return = node.return;
      node = node.sibling;
    }
  }

  function detachFiberMutation(fiber) {
    // Cut off the return pointers to disconnect it from the tree. Ideally, we
    // should clear the child pointer of the parent alternate to let this
    // get GC:ed but we don't know which for sure which parent is the current
    // one so we'll settle for GC:ing the subtree of this child. This child
    // itself will be GC:ed when the parent updates the next time.
    // Note: we cannot null out sibling here, otherwise it can cause issues
    // with findDOMNode and how it requires the sibling field to carry out
    // traversal in a later effect. See PR #16820. We now clear the sibling
    // field after effects, see: detachFiberAfterEffects.
    //
    // Don't disconnect stateNode now; it will be detached in detachFiberAfterEffects.
    // It may be required if the current component is an error boundary,
    // and one of its descendants throws while unmounting a passive effect.
    fiber.alternate = null;
    fiber.child = null;
    fiber.dependencies = null;
    fiber.firstEffect = null;
    fiber.lastEffect = null;
    fiber.memoizedProps = null;
    fiber.memoizedState = null;
    fiber.pendingProps = null;
    fiber.return = null;
    fiber.updateQueue = null;

    {
      fiber._debugOwner = null;
    }
  }

  function getHostParentFiber(fiber) {
    var parent = fiber.return;

    while (parent !== null) {
      if (isHostParent(parent)) {
        return parent;
      }

      parent = parent.return;
    }

    {
      {
        throw Error( "Expected to find a host parent. This error is likely caused by a bug in React. Please file an issue." );
      }
    }
  }

  function isHostParent(fiber) {
    return fiber.tag === HostComponent || fiber.tag === HostRoot || fiber.tag === HostPortal;
  }

  function getHostSibling(fiber) {
    // We're going to search forward into the tree until we find a sibling host
    // node. Unfortunately, if multiple insertions are done in a row we have to
    // search past them. This leads to exponential search for the next sibling.
    // TODO: Find a more efficient way to do this.
    var node = fiber;

    siblings: while (true) {
      // If we didn't find anything, let's try the next sibling.
      while (node.sibling === null) {
        if (node.return === null || isHostParent(node.return)) {
          // If we pop out of the root or hit the parent the fiber we are the
          // last sibling.
          return null;
        }

        node = node.return;
      }

      node.sibling.return = node.return;
      node = node.sibling;

      while (node.tag !== HostComponent && node.tag !== HostText && node.tag !== DehydratedFragment) {
        // If it is not host node and, we might have a host node inside it.
        // Try to search down until we find one.
        if (node.flags & Placement) {
          // If we don't have a child, try the siblings instead.
          continue siblings;
        } // If we don't have a child, try the siblings instead.
        // We also skip portals because they are not part of this host tree.


        if (node.child === null || node.tag === HostPortal) {
          continue siblings;
        } else {
          node.child.return = node;
          node = node.child;
        }
      } // Check if this host node is stable or about to be placed.


      if (!(node.flags & Placement)) {
        // Found it!
        return node.stateNode;
      }
    }
  }

  function commitPlacement(finishedWork) {


    var parentFiber = getHostParentFiber(finishedWork); // Note: these two variables *must* always be updated together.

    var parent;
    var isContainer;
    var parentStateNode = parentFiber.stateNode;

    switch (parentFiber.tag) {
      case HostComponent:
        parent = parentStateNode;
        isContainer = false;
        break;

      case HostRoot:
        parent = parentStateNode.containerInfo;
        isContainer = true;
        break;

      case HostPortal:
        parent = parentStateNode.containerInfo;
        isContainer = true;
        break;

      case FundamentalComponent:

      // eslint-disable-next-line-no-fallthrough

      default:
        {
          {
            throw Error( "Invalid host parent fiber. This error is likely caused by a bug in React. Please file an issue." );
          }
        }

    }

    if (parentFiber.flags & ContentReset) {
      // Reset the text content of the parent before doing any insertions
      resetTextContent(parent); // Clear ContentReset from the effect tag

      parentFiber.flags &= ~ContentReset;
    }

    var before = getHostSibling(finishedWork); // We only have the top Fiber that was inserted but we need to recurse down its
    // children to find all the terminal nodes.

    if (isContainer) {
      insertOrAppendPlacementNodeIntoContainer(finishedWork, before, parent);
    } else {
      insertOrAppendPlacementNode(finishedWork, before, parent);
    }
  }

  function insertOrAppendPlacementNodeIntoContainer(node, before, parent) {
    var tag = node.tag;
    var isHost = tag === HostComponent || tag === HostText;

    if (isHost || enableFundamentalAPI ) {
      var stateNode = isHost ? node.stateNode : node.stateNode.instance;

      if (before) {
        insertInContainerBefore(parent, stateNode, before);
      } else {
        appendChildToContainer(parent, stateNode);
      }
    } else if (tag === HostPortal) ; else {
      var child = node.child;

      if (child !== null) {
        insertOrAppendPlacementNodeIntoContainer(child, before, parent);
        var sibling = child.sibling;

        while (sibling !== null) {
          insertOrAppendPlacementNodeIntoContainer(sibling, before, parent);
          sibling = sibling.sibling;
        }
      }
    }
  }

  function insertOrAppendPlacementNode(node, before, parent) {
    var tag = node.tag;
    var isHost = tag === HostComponent || tag === HostText;

    if (isHost || enableFundamentalAPI ) {
      var stateNode = isHost ? node.stateNode : node.stateNode.instance;

      if (before) {
        insertBefore(parent, stateNode, before);
      } else {
        appendChild(parent, stateNode);
      }
    } else if (tag === HostPortal) ; else {
      var child = node.child;

      if (child !== null) {
        insertOrAppendPlacementNode(child, before, parent);
        var sibling = child.sibling;

        while (sibling !== null) {
          insertOrAppendPlacementNode(sibling, before, parent);
          sibling = sibling.sibling;
        }
      }
    }
  }

  function unmountHostComponents(finishedRoot, current, renderPriorityLevel) {
    // We only have the top Fiber that was deleted but we need to recurse down its
    // children to find all the terminal nodes.
    var node = current; // Each iteration, currentParent is populated with node's host parent if not
    // currentParentIsValid.

    var currentParentIsValid = false; // Note: these two variables *must* always be updated together.

    var currentParent;
    var currentParentIsContainer;

    while (true) {
      if (!currentParentIsValid) {
        var parent = node.return;

        findParent: while (true) {
          if (!(parent !== null)) {
            {
              throw Error( "Expected to find a host parent. This error is likely caused by a bug in React. Please file an issue." );
            }
          }

          var parentStateNode = parent.stateNode;

          switch (parent.tag) {
            case HostComponent:
              currentParent = parentStateNode;
              currentParentIsContainer = false;
              break findParent;

            case HostRoot:
              currentParent = parentStateNode.containerInfo;
              currentParentIsContainer = true;
              break findParent;

            case HostPortal:
              currentParent = parentStateNode.containerInfo;
              currentParentIsContainer = true;
              break findParent;

          }

          parent = parent.return;
        }

        currentParentIsValid = true;
      }

      if (node.tag === HostComponent || node.tag === HostText) {
        commitNestedUnmounts(finishedRoot, node); // After all the children have unmounted, it is now safe to remove the
        // node from the tree.

        if (currentParentIsContainer) {
          removeChildFromContainer(currentParent, node.stateNode);
        } else {
          removeChild(currentParent, node.stateNode);
        } // Don't visit children because we already visited them.

      } else if ( node.tag === DehydratedFragment) {


        if (currentParentIsContainer) {
          clearSuspenseBoundaryFromContainer(currentParent, node.stateNode);
        } else {
          clearSuspenseBoundary(currentParent, node.stateNode);
        }
      } else if (node.tag === HostPortal) {
        if (node.child !== null) {
          // When we go into a portal, it becomes the parent to remove from.
          // We will reassign it back when we pop the portal on the way up.
          currentParent = node.stateNode.containerInfo;
          currentParentIsContainer = true; // Visit children because portals might contain host components.

          node.child.return = node;
          node = node.child;
          continue;
        }
      } else {
        commitUnmount(finishedRoot, node); // Visit children because we may find more host components below.

        if (node.child !== null) {
          node.child.return = node;
          node = node.child;
          continue;
        }
      }

      if (node === current) {
        return;
      }

      while (node.sibling === null) {
        if (node.return === null || node.return === current) {
          return;
        }

        node = node.return;

        if (node.tag === HostPortal) {
          // When we go out of the portal, we need to restore the parent.
          // Since we don't keep a stack of them, we will search for it.
          currentParentIsValid = false;
        }
      }

      node.sibling.return = node.return;
      node = node.sibling;
    }
  }

  function commitDeletion(finishedRoot, current, renderPriorityLevel) {
    {
      // Recursively delete all host nodes from the parent.
      // Detach refs and call componentWillUnmount() on the whole subtree.
      unmountHostComponents(finishedRoot, current);
    }

    var alternate = current.alternate;
    detachFiberMutation(current);

    if (alternate !== null) {
      detachFiberMutation(alternate);
    }
  }

  function commitWork(current, finishedWork) {

    switch (finishedWork.tag) {
      case FunctionComponent:
      case ForwardRef:
      case MemoComponent:
      case SimpleMemoComponent:
      case Block:
        {
          // Layout effects are destroyed during the mutation phase so that all
          // destroy functions for all fibers are called before any create functions.
          // This prevents sibling component effects from interfering with each other,
          // e.g. a destroy function in one component should never override a ref set
          // by a create function in another component during the same commit.
          {
            commitHookEffectListUnmount(Layout | HasEffect, finishedWork);
          }

          return;
        }

      case ClassComponent:
        {
          return;
        }

      case HostComponent:
        {
          var instance = finishedWork.stateNode;

          if (instance != null) {
            // Commit the work prepared earlier.
            var newProps = finishedWork.memoizedProps; // For hydration we reuse the update path but we treat the oldProps
            // as the newProps. The updatePayload will contain the real change in
            // this case.

            var oldProps = current !== null ? current.memoizedProps : newProps;
            var type = finishedWork.type; // TODO: Type the updateQueue to be specific to host components.

            var updatePayload = finishedWork.updateQueue;
            finishedWork.updateQueue = null;

            if (updatePayload !== null) {
              commitUpdate(instance, updatePayload, type, oldProps, newProps);
            }
          }

          return;
        }

      case HostText:
        {
          if (!(finishedWork.stateNode !== null)) {
            {
              throw Error( "This should have a text node initialized. This error is likely caused by a bug in React. Please file an issue." );
            }
          }

          var textInstance = finishedWork.stateNode;
          var newText = finishedWork.memoizedProps; // For hydration we reuse the update path but we treat the oldProps
          // as the newProps. The updatePayload will contain the real change in
          // this case.

          var oldText = current !== null ? current.memoizedProps : newText;
          commitTextUpdate(textInstance, oldText, newText);
          return;
        }

      case HostRoot:
        {
          {
            var _root = finishedWork.stateNode;

            if (_root.hydrate) {
              // We've just hydrated. No need to hydrate again.
              _root.hydrate = false;
              commitHydratedContainer(_root.containerInfo);
            }
          }

          return;
        }

      case Profiler:
        {
          return;
        }

      case SuspenseComponent:
        {
          commitSuspenseComponent(finishedWork);
          attachSuspenseRetryListeners(finishedWork);
          return;
        }

      case SuspenseListComponent:
        {
          attachSuspenseRetryListeners(finishedWork);
          return;
        }

      case IncompleteClassComponent:
        {
          return;
        }

      case FundamentalComponent:
        {

          break;
        }

      case ScopeComponent:
        {

          break;
        }

      case OffscreenComponent:
      case LegacyHiddenComponent:
        {
          var newState = finishedWork.memoizedState;
          var isHidden = newState !== null;
          hideOrUnhideAllChildren(finishedWork, isHidden);
          return;
        }
    }

    {
      {
        throw Error( "This unit of work tag should not have side-effects. This error is likely caused by a bug in React. Please file an issue." );
      }
    }
  }

  function commitSuspenseComponent(finishedWork) {
    var newState = finishedWork.memoizedState;

    if (newState !== null) {
      markCommitTimeOfFallback();

      {
        // Hide the Offscreen component that contains the primary children. TODO:
        // Ideally, this effect would have been scheduled on the Offscreen fiber
        // itself. That's how unhiding works: the Offscreen component schedules an
        // effect on itself. However, in this case, the component didn't complete,
        // so the fiber was never added to the effect list in the normal path. We
        // could have appended it to the effect list in the Suspense component's
        // second pass, but doing it this way is less complicated. This would be
        // simpler if we got rid of the effect list and traversed the tree, like
        // we're planning to do.
        var primaryChildParent = finishedWork.child;
        hideOrUnhideAllChildren(primaryChildParent, true);
      }
    }
  }

  function commitSuspenseHydrationCallbacks(finishedRoot, finishedWork) {

    var newState = finishedWork.memoizedState;

    if (newState === null) {
      var current = finishedWork.alternate;

      if (current !== null) {
        var prevState = current.memoizedState;

        if (prevState !== null) {
          var suspenseInstance = prevState.dehydrated;

          if (suspenseInstance !== null) {
            commitHydratedSuspenseInstance(suspenseInstance);
          }
        }
      }
    }
  }

  function attachSuspenseRetryListeners(finishedWork) {
    // If this boundary just timed out, then it will have a set of wakeables.
    // For each wakeable, attach a listener so that when it resolves, React
    // attempts to re-render the boundary in the primary (pre-timeout) state.
    var wakeables = finishedWork.updateQueue;

    if (wakeables !== null) {
      finishedWork.updateQueue = null;
      var retryCache = finishedWork.stateNode;

      if (retryCache === null) {
        retryCache = finishedWork.stateNode = new PossiblyWeakSet();
      }

      wakeables.forEach(function (wakeable) {
        // Memoize using the boundary fiber to prevent redundant listeners.
        var retry = resolveRetryWakeable.bind(null, finishedWork, wakeable);

        if (!retryCache.has(wakeable)) {
          {
            if (wakeable.__reactDoNotTraceInteractions !== true) {
              retry = unstable_wrap(retry);
            }
          }

          retryCache.add(wakeable);
          wakeable.then(retry, retry);
        }
      });
    }
  } // This function detects when a Suspense boundary goes from visible to hidden.
  // It returns false if the boundary is already hidden.
  // TODO: Use an effect tag.


  function isSuspenseBoundaryBeingHidden(current, finishedWork) {
    if (current !== null) {
      var oldState = current.memoizedState;

      if (oldState === null || oldState.dehydrated !== null) {
        var newState = finishedWork.memoizedState;
        return newState !== null && newState.dehydrated === null;
      }
    }

    return false;
  }

  function commitResetTextContent(current) {

    resetTextContent(current.stateNode);
  }