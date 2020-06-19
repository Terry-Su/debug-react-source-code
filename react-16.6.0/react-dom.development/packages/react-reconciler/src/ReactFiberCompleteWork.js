function markUpdate(workInProgress) {
  // Tag the fiber with an update effect. This turns a Placement into
  // a PlacementAndUpdate.
  workInProgress.effectTag |= Update;
}

function markRef$1(workInProgress) {
  workInProgress.effectTag |= Ref;
}

var appendAllChildren = void 0;
var updateHostContainer = void 0;
var updateHostComponent$1 = void 0;
var updateHostText$1 = void 0;
if (supportsMutation) {
  // Mutation mode

  appendAllChildren = function (parent, workInProgress, needsVisibilityToggle, isHidden) {
    // We only have the top Fiber that was created but we need recurse down its
    // children to find all the terminal nodes.
    var node = workInProgress.child;
    while (node !== null) {
      if (node.tag === HostComponent || node.tag === HostText) {
        appendInitialChild(parent, node.stateNode);
      } else if (node.tag === HostPortal) {
        // If we have a portal child, then we don't want to traverse
        // down its children. Instead, we'll get insertions from each child in
        // the portal directly.
      } else if (node.child !== null) {
        node.child.return = node;
        node = node.child;
        continue;
      }
      if (node === workInProgress) {
        return;
      }
      while (node.sibling === null) {
        if (node.return === null || node.return === workInProgress) {
          return;
        }
        node = node.return;
      }
      node.sibling.return = node.return;
      node = node.sibling;
    }
  };

  updateHostContainer = function (workInProgress) {
    // Noop
  };
  updateHostComponent$1 = function (current, workInProgress, type, newProps, rootContainerInstance) {
    // If we have an alternate, that means this is an update and we need to
    // schedule a side-effect to do the updates.
    var oldProps = current.memoizedProps;
    if (oldProps === newProps) {
      // In mutation mode, this is sufficient for a bailout because
      // we won't touch this node even if children changed.
      return;
    }

    // If we get updated because one of our children updated, we don't
    // have newProps so we'll have to reuse them.
    // TODO: Split the update API as separate for the props vs. children.
    // Even better would be if children weren't special cased at all tho.
    var instance = workInProgress.stateNode;
    var currentHostContext = getHostContext();
    // TODO: Experiencing an error where oldProps is null. Suggests a host
    // component is hitting the resume path. Figure out why. Possibly
    // related to `hidden`.
    var updatePayload = prepareUpdate(instance, type, oldProps, newProps, rootContainerInstance, currentHostContext);
    // TODO: Type this specific to this type of component.
    workInProgress.updateQueue = updatePayload;
    // If the update payload indicates that there is a change or if there
    // is a new ref we mark this as an update. All the work is done in commitWork.
    if (updatePayload) {
      markUpdate(workInProgress);
    }
  };
  updateHostText$1 = function (current, workInProgress, oldText, newText) {
    // If the text differs, mark it as an update. All the work in done in commitWork.
    if (oldText !== newText) {
      markUpdate(workInProgress);
    }
  };
} else if (supportsPersistence) {
  // Persistent host tree mode

  appendAllChildren = function (parent, workInProgress, needsVisibilityToggle, isHidden) {
    // We only have the top Fiber that was created but we need recurse down its
    // children to find all the terminal nodes.
    var node = workInProgress.child;
    while (node !== null) {
      // eslint-disable-next-line no-labels
      branches: if (node.tag === HostComponent) {
        var instance = node.stateNode;
        if (needsVisibilityToggle) {
          var props = node.memoizedProps;
          var type = node.type;
          if (isHidden) {
            // This child is inside a timed out tree. Hide it.
            instance = cloneHiddenInstance(instance, type, props, node);
          } else {
            // This child was previously inside a timed out tree. If it was not
            // updated during this render, it may need to be unhidden. Clone
            // again to be sure.
            instance = cloneUnhiddenInstance(instance, type, props, node);
          }
          node.stateNode = instance;
        }
        appendInitialChild(parent, instance);
      } else if (node.tag === HostText) {
        var _instance = node.stateNode;
        if (needsVisibilityToggle) {
          var text = node.memoizedProps;
          var rootContainerInstance = getRootHostContainer();
          var currentHostContext = getHostContext();
          if (isHidden) {
            _instance = createHiddenTextInstance(text, rootContainerInstance, currentHostContext, workInProgress);
          } else {
            _instance = createTextInstance(text, rootContainerInstance, currentHostContext, workInProgress);
          }
          node.stateNode = _instance;
        }
        appendInitialChild(parent, _instance);
      } else if (node.tag === HostPortal) {
        // If we have a portal child, then we don't want to traverse
        // down its children. Instead, we'll get insertions from each child in
        // the portal directly.
      } else if (node.tag === SuspenseComponent) {
        var current = node.alternate;
        if (current !== null) {
          var oldState = current.memoizedState;
          var newState = node.memoizedState;
          var oldIsHidden = oldState !== null && oldState.didTimeout;
          var newIsHidden = newState !== null && newState.didTimeout;
          if (oldIsHidden !== newIsHidden) {
            // The placeholder either just timed out or switched back to the normal
            // children after having previously timed out. Toggle the visibility of
            // the direct host children.
            var primaryChildParent = newIsHidden ? node.child : node;
            if (primaryChildParent !== null) {
              appendAllChildren(parent, primaryChildParent, true, newIsHidden);
            }
            // eslint-disable-next-line no-labels
            break branches;
          }
        }
        if (node.child !== null) {
          // Continue traversing like normal
          node.child.return = node;
          node = node.child;
          continue;
        }
      } else if (node.child !== null) {
        node.child.return = node;
        node = node.child;
        continue;
      }
      // $FlowFixMe This is correct but Flow is confused by the labeled break.
      node = node;
      if (node === workInProgress) {
        return;
      }
      while (node.sibling === null) {
        if (node.return === null || node.return === workInProgress) {
          return;
        }
        node = node.return;
      }
      node.sibling.return = node.return;
      node = node.sibling;
    }
  };

  // An unfortunate fork of appendAllChildren because we have two different parent types.
  var appendAllChildrenToContainer = function (containerChildSet, workInProgress, needsVisibilityToggle, isHidden) {
    // We only have the top Fiber that was created but we need recurse down its
    // children to find all the terminal nodes.
    var node = workInProgress.child;
    while (node !== null) {
      // eslint-disable-next-line no-labels
      branches: if (node.tag === HostComponent) {
        var instance = node.stateNode;
        if (needsVisibilityToggle) {
          var props = node.memoizedProps;
          var type = node.type;
          if (isHidden) {
            // This child is inside a timed out tree. Hide it.
            instance = cloneHiddenInstance(instance, type, props, node);
          } else {
            // This child was previously inside a timed out tree. If it was not
            // updated during this render, it may need to be unhidden. Clone
            // again to be sure.
            instance = cloneUnhiddenInstance(instance, type, props, node);
          }
          node.stateNode = instance;
        }
        appendChildToContainerChildSet(containerChildSet, instance);
      } else if (node.tag === HostText) {
        var _instance2 = node.stateNode;
        if (needsVisibilityToggle) {
          var text = node.memoizedProps;
          var rootContainerInstance = getRootHostContainer();
          var currentHostContext = getHostContext();
          if (isHidden) {
            _instance2 = createHiddenTextInstance(text, rootContainerInstance, currentHostContext, workInProgress);
          } else {
            _instance2 = createTextInstance(text, rootContainerInstance, currentHostContext, workInProgress);
          }
          node.stateNode = _instance2;
        }
        appendChildToContainerChildSet(containerChildSet, _instance2);
      } else if (node.tag === HostPortal) {
        // If we have a portal child, then we don't want to traverse
        // down its children. Instead, we'll get insertions from each child in
        // the portal directly.
      } else if (node.tag === SuspenseComponent) {
        var current = node.alternate;
        if (current !== null) {
          var oldState = current.memoizedState;
          var newState = node.memoizedState;
          var oldIsHidden = oldState !== null && oldState.didTimeout;
          var newIsHidden = newState !== null && newState.didTimeout;
          if (oldIsHidden !== newIsHidden) {
            // The placeholder either just timed out or switched back to the normal
            // children after having previously timed out. Toggle the visibility of
            // the direct host children.
            var primaryChildParent = newIsHidden ? node.child : node;
            if (primaryChildParent !== null) {
              appendAllChildrenToContainer(containerChildSet, primaryChildParent, true, newIsHidden);
            }
            // eslint-disable-next-line no-labels
            break branches;
          }
        }
        if (node.child !== null) {
          // Continue traversing like normal
          node.child.return = node;
          node = node.child;
          continue;
        }
      } else if (node.child !== null) {
        node.child.return = node;
        node = node.child;
        continue;
      }
      // $FlowFixMe This is correct but Flow is confused by the labeled break.
      node = node;
      if (node === workInProgress) {
        return;
      }
      while (node.sibling === null) {
        if (node.return === null || node.return === workInProgress) {
          return;
        }
        node = node.return;
      }
      node.sibling.return = node.return;
      node = node.sibling;
    }
  };
  updateHostContainer = function (workInProgress) {
    var portalOrRoot = workInProgress.stateNode;
    var childrenUnchanged = workInProgress.firstEffect === null;
    if (childrenUnchanged) {
      // No changes, just reuse the existing instance.
    } else {
      var container = portalOrRoot.containerInfo;
      var newChildSet = createContainerChildSet(container);
      // If children might have changed, we have to add them all to the set.
      appendAllChildrenToContainer(newChildSet, workInProgress, false, false);
      portalOrRoot.pendingChildren = newChildSet;
      // Schedule an update on the container to swap out the container.
      markUpdate(workInProgress);
      finalizeContainerChildren(container, newChildSet);
    }
  };
  updateHostComponent$1 = function (current, workInProgress, type, newProps, rootContainerInstance) {
    var currentInstance = current.stateNode;
    var oldProps = current.memoizedProps;
    // If there are no effects associated with this node, then none of our children had any updates.
    // This guarantees that we can reuse all of them.
    var childrenUnchanged = workInProgress.firstEffect === null;
    if (childrenUnchanged && oldProps === newProps) {
      // No changes, just reuse the existing instance.
      // Note that this might release a previous clone.
      workInProgress.stateNode = currentInstance;
      return;
    }
    var recyclableInstance = workInProgress.stateNode;
    var currentHostContext = getHostContext();
    var updatePayload = null;
    if (oldProps !== newProps) {
      updatePayload = prepareUpdate(recyclableInstance, type, oldProps, newProps, rootContainerInstance, currentHostContext);
    }
    if (childrenUnchanged && updatePayload === null) {
      // No changes, just reuse the existing instance.
      // Note that this might release a previous clone.
      workInProgress.stateNode = currentInstance;
      return;
    }
    var newInstance = cloneInstance(currentInstance, updatePayload, type, oldProps, newProps, workInProgress, childrenUnchanged, recyclableInstance);
    if (finalizeInitialChildren(newInstance, type, newProps, rootContainerInstance, currentHostContext)) {
      markUpdate(workInProgress);
    }
    workInProgress.stateNode = newInstance;
    if (childrenUnchanged) {
      // If there are no other effects in this tree, we need to flag this node as having one.
      // Even though we're not going to use it for anything.
      // Otherwise parents won't know that there are new children to propagate upwards.
      markUpdate(workInProgress);
    } else {
      // If children might have changed, we have to add them all to the set.
      appendAllChildren(newInstance, workInProgress, false, false);
    }
  };
  updateHostText$1 = function (current, workInProgress, oldText, newText) {
    if (oldText !== newText) {
      // If the text content differs, we'll create a new text instance for it.
      var rootContainerInstance = getRootHostContainer();
      var currentHostContext = getHostContext();
      workInProgress.stateNode = createTextInstance(newText, rootContainerInstance, currentHostContext, workInProgress);
      // We'll have to mark it as having an effect, even though we won't use the effect for anything.
      // This lets the parents know that at least one of their children has changed.
      markUpdate(workInProgress);
    }
  };
} else {
  // No host operations
  updateHostContainer = function (workInProgress) {
    // Noop
  };
  updateHostComponent$1 = function (current, workInProgress, type, newProps, rootContainerInstance) {
    // Noop
  };
  updateHostText$1 = function (current, workInProgress, oldText, newText) {
    // Noop
  };
}

function completeWork(current, workInProgress, renderExpirationTime) {
  var newProps = workInProgress.pendingProps;

  switch (workInProgress.tag) {
    case IndeterminateComponent:
      break;
    case LazyComponent:
      break;
    case SimpleMemoComponent:
    case FunctionComponent:
      break;
    case ClassComponent:
      {
        var Component = workInProgress.type;
        if (isContextProvider(Component)) {
          popContext(workInProgress);
        }
        break;
      }
    case HostRoot:
      {
        popHostContainer(workInProgress);
        popTopLevelContextObject(workInProgress);
        var fiberRoot = workInProgress.stateNode;
        if (fiberRoot.pendingContext) {
          fiberRoot.context = fiberRoot.pendingContext;
          fiberRoot.pendingContext = null;
        }
        if (current === null || current.child === null) {
          // If we hydrated, pop so that we can delete any remaining children
          // that weren't hydrated.
          popHydrationState(workInProgress);
          // This resets the hacky state to fix isMounted before committing.
          // TODO: Delete this when we delete isMounted and findDOMNode.
          workInProgress.effectTag &= ~Placement;
        }
        updateHostContainer(workInProgress);
        break;
      }
    case HostComponent:
      {
        popHostContext(workInProgress);
        var rootContainerInstance = getRootHostContainer();
        var type = workInProgress.type;
        if (current !== null && workInProgress.stateNode != null) {
          updateHostComponent$1(current, workInProgress, type, newProps, rootContainerInstance);

          if (current.ref !== workInProgress.ref) {
            markRef$1(workInProgress);
          }
        } else {
          if (!newProps) {
            !(workInProgress.stateNode !== null) ? invariant(false, 'We must have new props for new mounts. This error is likely caused by a bug in React. Please file an issue.') : void 0;
            // This can happen when we abort work.
            break;
          }

          var currentHostContext = getHostContext();
          // TODO: Move createInstance to beginWork and keep it on a context
          // "stack" as the parent. Then append children as we go in beginWork
          // or completeWork depending on we want to add then top->down or
          // bottom->up. Top->down is faster in IE11.
          var wasHydrated = popHydrationState(workInProgress);
          if (wasHydrated) {
            // TODO: Move this and createInstance step into the beginPhase
            // to consolidate.
            if (prepareToHydrateHostInstance(workInProgress, rootContainerInstance, currentHostContext)) {
              // If changes to the hydrated node needs to be applied at the
              // commit-phase we mark this as such.
              markUpdate(workInProgress);
            }
          } else {
            var instance = createInstance(type, newProps, rootContainerInstance, currentHostContext, workInProgress);

            appendAllChildren(instance, workInProgress, false, false);

            // Certain renderers require commit-time effects for initial mount.
            // (eg DOM renderer supports auto-focus for certain elements).
            // Make sure such renderers get scheduled for later work.
            if (finalizeInitialChildren(instance, type, newProps, rootContainerInstance, currentHostContext)) {
              markUpdate(workInProgress);
            }
            workInProgress.stateNode = instance;
          }

          if (workInProgress.ref !== null) {
            // If there is a ref on a host node we need to schedule a callback
            markRef$1(workInProgress);
          }
        }
        break;
      }
    case HostText:
      {
        var newText = newProps;
        if (current && workInProgress.stateNode != null) {
          var oldText = current.memoizedProps;
          // If we have an alternate, that means this is an update and we need
          // to schedule a side-effect to do the updates.
          updateHostText$1(current, workInProgress, oldText, newText);
        } else {
          if (typeof newText !== 'string') {
            !(workInProgress.stateNode !== null) ? invariant(false, 'We must have new props for new mounts. This error is likely caused by a bug in React. Please file an issue.') : void 0;
            // This can happen when we abort work.
          }
          var _rootContainerInstance = getRootHostContainer();
          var _currentHostContext = getHostContext();
          var _wasHydrated = popHydrationState(workInProgress);
          if (_wasHydrated) {
            if (prepareToHydrateHostTextInstance(workInProgress)) {
              markUpdate(workInProgress);
            }
          } else {
            workInProgress.stateNode = createTextInstance(newText, _rootContainerInstance, _currentHostContext, workInProgress);
          }
        }
        break;
      }
    case ForwardRef:
      break;
    case SuspenseComponent:
      {
        var nextState = workInProgress.memoizedState;
        var prevState = current !== null ? current.memoizedState : null;
        var nextDidTimeout = nextState !== null && nextState.didTimeout;
        var prevDidTimeout = prevState !== null && prevState.didTimeout;
        if (nextDidTimeout !== prevDidTimeout) {
          // If this render commits, and it switches between the normal state
          // and the timed-out state, schedule an effect.
          workInProgress.effectTag |= Update;
        }
        break;
      }
    case Fragment:
      break;
    case Mode:
      break;
    case Profiler:
      break;
    case HostPortal:
      popHostContainer(workInProgress);
      updateHostContainer(workInProgress);
      break;
    case ContextProvider:
      // Pop provider fiber
      popProvider(workInProgress);
      break;
    case ContextConsumer:
      break;
    case MemoComponent:
      break;
    case IncompleteClassComponent:
      {
        // Same as class component case. I put it down here so that the tags are
        // sequential to ensure this switch is compiled to a jump table.
        var _Component = workInProgress.type;
        if (isContextProvider(_Component)) {
          popContext(workInProgress);
        }
        break;
      }
    default:
      invariant(false, 'Unknown unit of work tag. This error is likely caused by a bug in React. Please file an issue.');
  }

  return null;
}

