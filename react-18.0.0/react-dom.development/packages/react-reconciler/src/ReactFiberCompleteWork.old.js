
  function markUpdate(workInProgress) {
    // Tag the fiber with an update effect. This turns a Placement into
    // a PlacementAndUpdate.
    workInProgress.flags |= Update;
  }

  function markRef(workInProgress) {
    workInProgress.flags |= Ref;

    {
      workInProgress.flags |= RefStatic;
    }
  }

  var appendAllChildren;
  var updateHostContainer;
  var updateHostComponent;
  var updateHostText;

  {
    // Mutation mode
    appendAllChildren = function (parent, workInProgress, needsVisibilityToggle, isHidden) {
      // We only have the top Fiber that was created but we need recurse down its
      // children to find all the terminal nodes.
      var node = workInProgress.child;

      while (node !== null) {
        if (node.tag === HostComponent || node.tag === HostText) {
          appendInitialChild(parent, node.stateNode);
        } else if (node.tag === HostPortal) ; else if (node.child !== null) {
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

    updateHostContainer = function (current, workInProgress) {// Noop
    };

    updateHostComponent = function (current, workInProgress, type, newProps, rootContainerInstance) {
      // If we have an alternate, that means this is an update and we need to
      // schedule a side-effect to do the updates.
      var oldProps = current.memoizedProps;

      if (oldProps === newProps) {
        // In mutation mode, this is sufficient for a bailout because
        // we won't touch this node even if children changed.
        return;
      } // If we get updated because one of our children updated, we don't
      // have newProps so we'll have to reuse them.
      // TODO: Split the update API as separate for the props vs. children.
      // Even better would be if children weren't special cased at all tho.


      var instance = workInProgress.stateNode;
      var currentHostContext = getHostContext(); // TODO: Experiencing an error where oldProps is null. Suggests a host
      // component is hitting the resume path. Figure out why. Possibly
      // related to `hidden`.

      var updatePayload = prepareUpdate(instance, type, oldProps, newProps, rootContainerInstance, currentHostContext); // TODO: Type this specific to this type of component.

      workInProgress.updateQueue = updatePayload; // If the update payload indicates that there is a change or if there
      // is a new ref we mark this as an update. All the work is done in commitWork.

      if (updatePayload) {
        markUpdate(workInProgress);
      }
    };

    updateHostText = function (current, workInProgress, oldText, newText) {
      // If the text differs, mark it as an update. All the work in done in commitWork.
      if (oldText !== newText) {
        markUpdate(workInProgress);
      }
    };
  }

  function cutOffTailIfNeeded(renderState, hasRenderedATailFallback) {
    if (getIsHydrating()) {
      // If we're hydrating, we should consume as many items as we can
      // so we don't leave any behind.
      return;
    }

    switch (renderState.tailMode) {
      case 'hidden':
        {
          // Any insertions at the end of the tail list after this point
          // should be invisible. If there are already mounted boundaries
          // anything before them are not considered for collapsing.
          // Therefore we need to go through the whole tail to find if
          // there are any.
          var tailNode = renderState.tail;
          var lastTailNode = null;

          while (tailNode !== null) {
            if (tailNode.alternate !== null) {
              lastTailNode = tailNode;
            }

            tailNode = tailNode.sibling;
          } // Next we're simply going to delete all insertions after the
          // last rendered item.


          if (lastTailNode === null) {
            // All remaining items in the tail are insertions.
            renderState.tail = null;
          } else {
            // Detach the insertion after the last node that was already
            // inserted.
            lastTailNode.sibling = null;
          }

          break;
        }

      case 'collapsed':
        {
          // Any insertions at the end of the tail list after this point
          // should be invisible. If there are already mounted boundaries
          // anything before them are not considered for collapsing.
          // Therefore we need to go through the whole tail to find if
          // there are any.
          var _tailNode = renderState.tail;
          var _lastTailNode = null;

          while (_tailNode !== null) {
            if (_tailNode.alternate !== null) {
              _lastTailNode = _tailNode;
            }

            _tailNode = _tailNode.sibling;
          } // Next we're simply going to delete all insertions after the
          // last rendered item.


          if (_lastTailNode === null) {
            // All remaining items in the tail are insertions.
            if (!hasRenderedATailFallback && renderState.tail !== null) {
              // We suspended during the head. We want to show at least one
              // row at the tail. So we'll keep on and cut off the rest.
              renderState.tail.sibling = null;
            } else {
              renderState.tail = null;
            }
          } else {
            // Detach the insertion after the last node that was already
            // inserted.
            _lastTailNode.sibling = null;
          }

          break;
        }
    }
  }

  function bubbleProperties(completedWork) {
    var didBailout = completedWork.alternate !== null && completedWork.alternate.child === completedWork.child;
    var newChildLanes = NoLanes;
    var subtreeFlags = NoFlags;

    if (!didBailout) {
      // Bubble up the earliest expiration time.
      if ( (completedWork.mode & ProfileMode) !== NoMode) {
        // In profiling mode, resetChildExpirationTime is also used to reset
        // profiler durations.
        var actualDuration = completedWork.actualDuration;
        var treeBaseDuration = completedWork.selfBaseDuration;
        var child = completedWork.child;

        while (child !== null) {
          newChildLanes = mergeLanes(newChildLanes, mergeLanes(child.lanes, child.childLanes));
          subtreeFlags |= child.subtreeFlags;
          subtreeFlags |= child.flags; // When a fiber is cloned, its actualDuration is reset to 0. This value will
          // only be updated if work is done on the fiber (i.e. it doesn't bailout).
          // When work is done, it should bubble to the parent's actualDuration. If
          // the fiber has not been cloned though, (meaning no work was done), then
          // this value will reflect the amount of time spent working on a previous
          // render. In that case it should not bubble. We determine whether it was
          // cloned by comparing the child pointer.

          actualDuration += child.actualDuration;
          treeBaseDuration += child.treeBaseDuration;
          child = child.sibling;
        }

        completedWork.actualDuration = actualDuration;
        completedWork.treeBaseDuration = treeBaseDuration;
      } else {
        var _child = completedWork.child;

        while (_child !== null) {
          newChildLanes = mergeLanes(newChildLanes, mergeLanes(_child.lanes, _child.childLanes));
          subtreeFlags |= _child.subtreeFlags;
          subtreeFlags |= _child.flags; // Update the return pointer so the tree is consistent. This is a code
          // smell because it assumes the commit phase is never concurrent with
          // the render phase. Will address during refactor to alternate model.

          _child.return = completedWork;
          _child = _child.sibling;
        }
      }

      completedWork.subtreeFlags |= subtreeFlags;
    } else {
      // Bubble up the earliest expiration time.
      if ( (completedWork.mode & ProfileMode) !== NoMode) {
        // In profiling mode, resetChildExpirationTime is also used to reset
        // profiler durations.
        var _treeBaseDuration = completedWork.selfBaseDuration;
        var _child2 = completedWork.child;

        while (_child2 !== null) {
          newChildLanes = mergeLanes(newChildLanes, mergeLanes(_child2.lanes, _child2.childLanes)); // "Static" flags share the lifetime of the fiber/hook they belong to,
          // so we should bubble those up even during a bailout. All the other
          // flags have a lifetime only of a single render + commit, so we should
          // ignore them.

          subtreeFlags |= _child2.subtreeFlags & StaticMask;
          subtreeFlags |= _child2.flags & StaticMask;
          _treeBaseDuration += _child2.treeBaseDuration;
          _child2 = _child2.sibling;
        }

        completedWork.treeBaseDuration = _treeBaseDuration;
      } else {
        var _child3 = completedWork.child;

        while (_child3 !== null) {
          newChildLanes = mergeLanes(newChildLanes, mergeLanes(_child3.lanes, _child3.childLanes)); // "Static" flags share the lifetime of the fiber/hook they belong to,
          // so we should bubble those up even during a bailout. All the other
          // flags have a lifetime only of a single render + commit, so we should
          // ignore them.

          subtreeFlags |= _child3.subtreeFlags & StaticMask;
          subtreeFlags |= _child3.flags & StaticMask; // Update the return pointer so the tree is consistent. This is a code
          // smell because it assumes the commit phase is never concurrent with
          // the render phase. Will address during refactor to alternate model.

          _child3.return = completedWork;
          _child3 = _child3.sibling;
        }
      }

      completedWork.subtreeFlags |= subtreeFlags;
    }

    completedWork.childLanes = newChildLanes;
    return didBailout;
  }

  function completeWork(current, workInProgress, renderLanes) {
    var newProps = workInProgress.pendingProps; // Note: This intentionally doesn't check if we're hydrating because comparing
    // to the current tree provider fiber is just as fast and less error-prone.
    // Ideally we would have a special version of the work loop only
    // for hydration.

    popTreeContext(workInProgress);

    switch (workInProgress.tag) {
      case IndeterminateComponent:
      case LazyComponent:
      case SimpleMemoComponent:
      case FunctionComponent:
      case ForwardRef:
      case Fragment:
      case Mode:
      case Profiler:
      case ContextConsumer:
      case MemoComponent:
        bubbleProperties(workInProgress);
        return null;

      case ClassComponent:
        {
          var Component = workInProgress.type;

          if (isContextProvider(Component)) {
            popContext(workInProgress);
          }

          bubbleProperties(workInProgress);
          return null;
        }

      case HostRoot:
        {
          var fiberRoot = workInProgress.stateNode;

          {
            var previousCache = null;

            if (current !== null) {
              previousCache = current.memoizedState.cache;
            }

            var cache = workInProgress.memoizedState.cache;

            if (cache !== previousCache) {
              // Run passive effects to retain/release the cache.
              workInProgress.flags |= Passive;
            }

            popCacheProvider(workInProgress);
          }

          popHostContainer(workInProgress);
          popTopLevelContextObject(workInProgress);
          resetWorkInProgressVersions();

          if (fiberRoot.pendingContext) {
            fiberRoot.context = fiberRoot.pendingContext;
            fiberRoot.pendingContext = null;
          }

          if (current === null || current.child === null) {
            // If we hydrated, pop so that we can delete any remaining children
            // that weren't hydrated.
            var wasHydrated = popHydrationState(workInProgress);

            if (wasHydrated) {
              // If we hydrated, then we'll need to schedule an update for
              // the commit side-effects on the root.
              markUpdate(workInProgress);
            } else {
              if (current !== null) {
                var prevState = current.memoizedState;

                if ( // Check if this is a client root
                !prevState.isDehydrated || // Check if we reverted to client rendering (e.g. due to an error)
                (workInProgress.flags & ForceClientRender) !== NoFlags) {
                  // Schedule an effect to clear this container at the start of the
                  // next commit. This handles the case of React rendering into a
                  // container with previous children. It's also safe to do for
                  // updates too, because current.child would only be null if the
                  // previous render was null (so the container would already
                  // be empty).
                  workInProgress.flags |= Snapshot; // If this was a forced client render, there may have been
                  // recoverable errors during first hydration attempt. If so, add
                  // them to a queue so we can log them in the commit phase.

                  upgradeHydrationErrorsToRecoverable();
                }
              }
            }
          }

          updateHostContainer(current, workInProgress);
          bubbleProperties(workInProgress);
          return null;
        }

      case HostComponent:
        {
          popHostContext(workInProgress);
          var rootContainerInstance = getRootHostContainer();
          var type = workInProgress.type;

          if (current !== null && workInProgress.stateNode != null) {
            updateHostComponent(current, workInProgress, type, newProps, rootContainerInstance);

            if (current.ref !== workInProgress.ref) {
              markRef(workInProgress);
            }
          } else {
            if (!newProps) {
              if (workInProgress.stateNode === null) {
                throw new Error('We must have new props for new mounts. This error is likely ' + 'caused by a bug in React. Please file an issue.');
              } // This can happen when we abort work.


              bubbleProperties(workInProgress);
              return null;
            }

            var currentHostContext = getHostContext(); // TODO: Move createInstance to beginWork and keep it on a context
            // "stack" as the parent. Then append children as we go in beginWork
            // or completeWork depending on whether we want to add them top->down or
            // bottom->up. Top->down is faster in IE11.

            var _wasHydrated = popHydrationState(workInProgress);

            if (_wasHydrated) {
              // TODO: Move this and createInstance step into the beginPhase
              // to consolidate.
              if (prepareToHydrateHostInstance(workInProgress, rootContainerInstance, currentHostContext)) {
                // If changes to the hydrated node need to be applied at the
                // commit-phase we mark this as such.
                markUpdate(workInProgress);
              }
            } else {
              var instance = createInstance(type, newProps, rootContainerInstance, currentHostContext, workInProgress);
              appendAllChildren(instance, workInProgress, false, false);
              workInProgress.stateNode = instance; // Certain renderers require commit-time effects for initial mount.
              // (eg DOM renderer supports auto-focus for certain elements).
              // Make sure such renderers get scheduled for later work.

              if (finalizeInitialChildren(instance, type, newProps, rootContainerInstance)) {
                markUpdate(workInProgress);
              }
            }

            if (workInProgress.ref !== null) {
              // If there is a ref on a host node we need to schedule a callback
              markRef(workInProgress);
            }
          }

          bubbleProperties(workInProgress);
          return null;
        }

      case HostText:
        {
          var newText = newProps;

          if (current && workInProgress.stateNode != null) {
            var oldText = current.memoizedProps; // If we have an alternate, that means this is an update and we need
            // to schedule a side-effect to do the updates.

            updateHostText(current, workInProgress, oldText, newText);
          } else {
            if (typeof newText !== 'string') {
              if (workInProgress.stateNode === null) {
                throw new Error('We must have new props for new mounts. This error is likely ' + 'caused by a bug in React. Please file an issue.');
              } // This can happen when we abort work.

            }

            var _rootContainerInstance = getRootHostContainer();

            var _currentHostContext = getHostContext();

            var _wasHydrated2 = popHydrationState(workInProgress);

            if (_wasHydrated2) {
              if (prepareToHydrateHostTextInstance(workInProgress)) {
                markUpdate(workInProgress);
              }
            } else {
              workInProgress.stateNode = createTextInstance(newText, _rootContainerInstance, _currentHostContext, workInProgress);
            }
          }

          bubbleProperties(workInProgress);
          return null;
        }

      case SuspenseComponent:
        {
          popSuspenseContext(workInProgress);
          var nextState = workInProgress.memoizedState;

          {
            if ( hasUnhydratedTailNodes() && (workInProgress.mode & ConcurrentMode) !== NoMode && (workInProgress.flags & DidCapture) === NoFlags) {
              warnIfUnhydratedTailNodes(workInProgress);
              resetHydrationState();
              workInProgress.flags |= ForceClientRender | Incomplete | ShouldCapture;
              return workInProgress;
            }

            if (nextState !== null && nextState.dehydrated !== null) {
              // We might be inside a hydration state the first time we're picking up this
              // Suspense boundary, and also after we've reentered it for further hydration.
              var _wasHydrated3 = popHydrationState(workInProgress);

              if (current === null) {
                if (!_wasHydrated3) {
                  throw new Error('A dehydrated suspense component was completed without a hydrated node. ' + 'This is probably a bug in React.');
                }

                prepareToHydrateHostSuspenseInstance(workInProgress);
                bubbleProperties(workInProgress);

                {
                  if ((workInProgress.mode & ProfileMode) !== NoMode) {
                    var isTimedOutSuspense = nextState !== null;

                    if (isTimedOutSuspense) {
                      // Don't count time spent in a timed out Suspense subtree as part of the base duration.
                      var primaryChildFragment = workInProgress.child;

                      if (primaryChildFragment !== null) {
                        // $FlowFixMe Flow doesn't support type casting in combination with the -= operator
                        workInProgress.treeBaseDuration -= primaryChildFragment.treeBaseDuration;
                      }
                    }
                  }
                }

                return null;
              } else {
                // We might have reentered this boundary to hydrate it. If so, we need to reset the hydration
                // state since we're now exiting out of it. popHydrationState doesn't do that for us.
                resetHydrationState();

                if ((workInProgress.flags & DidCapture) === NoFlags) {
                  // This boundary did not suspend so it's now hydrated and unsuspended.
                  workInProgress.memoizedState = null;
                } // If nothing suspended, we need to schedule an effect to mark this boundary
                // as having hydrated so events know that they're free to be invoked.
                // It's also a signal to replay events and the suspense callback.
                // If something suspended, schedule an effect to attach retry listeners.
                // So we might as well always mark this.


                workInProgress.flags |= Update;
                bubbleProperties(workInProgress);

                {
                  if ((workInProgress.mode & ProfileMode) !== NoMode) {
                    var _isTimedOutSuspense = nextState !== null;

                    if (_isTimedOutSuspense) {
                      // Don't count time spent in a timed out Suspense subtree as part of the base duration.
                      var _primaryChildFragment = workInProgress.child;

                      if (_primaryChildFragment !== null) {
                        // $FlowFixMe Flow doesn't support type casting in combination with the -= operator
                        workInProgress.treeBaseDuration -= _primaryChildFragment.treeBaseDuration;
                      }
                    }
                  }
                }

                return null;
              }
            } // Successfully completed this tree. If this was a forced client render,
            // there may have been recoverable errors during first hydration
            // attempt. If so, add them to a queue so we can log them in the
            // commit phase.


            upgradeHydrationErrorsToRecoverable();
          }

          if ((workInProgress.flags & DidCapture) !== NoFlags) {
            // Something suspended. Re-render with the fallback children.
            workInProgress.lanes = renderLanes; // Do not reset the effect list.

            if ( (workInProgress.mode & ProfileMode) !== NoMode) {
              transferActualDuration(workInProgress);
            } // Don't bubble properties in this case.


            return workInProgress;
          }

          var nextDidTimeout = nextState !== null;
          var prevDidTimeout = false;

          if (current === null) {
            popHydrationState(workInProgress);
          } else {
            var _prevState = current.memoizedState;
            prevDidTimeout = _prevState !== null;
          }

          if ( nextDidTimeout) {
            var offscreenFiber = workInProgress.child;
            var _previousCache = null;

            if (offscreenFiber.alternate !== null && offscreenFiber.alternate.memoizedState !== null && offscreenFiber.alternate.memoizedState.cachePool !== null) {
              _previousCache = offscreenFiber.alternate.memoizedState.cachePool.pool;
            }

            var _cache = null;

            if (offscreenFiber.memoizedState !== null && offscreenFiber.memoizedState.cachePool !== null) {
              _cache = offscreenFiber.memoizedState.cachePool.pool;
            }

            if (_cache !== _previousCache) {
              // Run passive effects to retain/release the cache.
              offscreenFiber.flags |= Passive;
            }
          } // If the suspended state of the boundary changes, we need to schedule
          // an effect to toggle the subtree's visibility. When we switch from
          // fallback -> primary, the inner Offscreen fiber schedules this effect
          // as part of its normal complete phase. But when we switch from
          // primary -> fallback, the inner Offscreen fiber does not have a complete
          // phase. So we need to schedule its effect here.
          //
          // We also use this flag to connect/disconnect the effects, but the same
          // logic applies: when re-connecting, the Offscreen fiber's complete
          // phase will handle scheduling the effect. It's only when the fallback
          // is active that we have to do anything special.


          if (nextDidTimeout && !prevDidTimeout) {
            var _offscreenFiber = workInProgress.child;
            _offscreenFiber.flags |= Visibility; // TODO: This will still suspend a synchronous tree if anything
            // in the concurrent tree already suspended during this render.
            // This is a known bug.

            if ((workInProgress.mode & ConcurrentMode) !== NoMode) {
              // TODO: Move this back to throwException because this is too late
              // if this is a large tree which is common for initial loads. We
              // don't know if we should restart a render or not until we get
              // this marker, and this is too late.
              // If this render already had a ping or lower pri updates,
              // and this is the first time we know we're going to suspend we
              // should be able to immediately restart from within throwException.
              var hasInvisibleChildContext = current === null && (workInProgress.memoizedProps.unstable_avoidThisFallback !== true || !enableSuspenseAvoidThisFallback);

              if (hasInvisibleChildContext || hasSuspenseContext(suspenseStackCursor.current, InvisibleParentSuspenseContext)) {
                // If this was in an invisible tree or a new render, then showing
                // this boundary is ok.
                renderDidSuspend();
              } else {
                // Otherwise, we're going to have to hide content so we should
                // suspend for longer if possible.
                renderDidSuspendDelayIfPossible();
              }
            }
          }

          var wakeables = workInProgress.updateQueue;

          if (wakeables !== null) {
            // Schedule an effect to attach a retry listener to the promise.
            // TODO: Move to passive phase
            workInProgress.flags |= Update;
          }

          bubbleProperties(workInProgress);

          {
            if ((workInProgress.mode & ProfileMode) !== NoMode) {
              if (nextDidTimeout) {
                // Don't count time spent in a timed out Suspense subtree as part of the base duration.
                var _primaryChildFragment2 = workInProgress.child;

                if (_primaryChildFragment2 !== null) {
                  // $FlowFixMe Flow doesn't support type casting in combination with the -= operator
                  workInProgress.treeBaseDuration -= _primaryChildFragment2.treeBaseDuration;
                }
              }
            }
          }

          return null;
        }

      case HostPortal:
        popHostContainer(workInProgress);
        updateHostContainer(current, workInProgress);

        if (current === null) {
          preparePortalMount(workInProgress.stateNode.containerInfo);
        }

        bubbleProperties(workInProgress);
        return null;

      case ContextProvider:
        // Pop provider fiber
        var context = workInProgress.type._context;
        popProvider(context, workInProgress);
        bubbleProperties(workInProgress);
        return null;

      case IncompleteClassComponent:
        {
          // Same as class component case. I put it down here so that the tags are
          // sequential to ensure this switch is compiled to a jump table.
          var _Component = workInProgress.type;

          if (isContextProvider(_Component)) {
            popContext(workInProgress);
          }

          bubbleProperties(workInProgress);
          return null;
        }

      case SuspenseListComponent:
        {
          popSuspenseContext(workInProgress);
          var renderState = workInProgress.memoizedState;

          if (renderState === null) {
            // We're running in the default, "independent" mode.
            // We don't do anything in this mode.
            bubbleProperties(workInProgress);
            return null;
          }

          var didSuspendAlready = (workInProgress.flags & DidCapture) !== NoFlags;
          var renderedTail = renderState.rendering;

          if (renderedTail === null) {
            // We just rendered the head.
            if (!didSuspendAlready) {
              // This is the first pass. We need to figure out if anything is still
              // suspended in the rendered set.
              // If new content unsuspended, but there's still some content that
              // didn't. Then we need to do a second pass that forces everything
              // to keep showing their fallbacks.
              // We might be suspended if something in this render pass suspended, or
              // something in the previous committed pass suspended. Otherwise,
              // there's no chance so we can skip the expensive call to
              // findFirstSuspended.
              var cannotBeSuspended = renderHasNotSuspendedYet() && (current === null || (current.flags & DidCapture) === NoFlags);

              if (!cannotBeSuspended) {
                var row = workInProgress.child;

                while (row !== null) {
                  var suspended = findFirstSuspended(row);

                  if (suspended !== null) {
                    didSuspendAlready = true;
                    workInProgress.flags |= DidCapture;
                    cutOffTailIfNeeded(renderState, false); // If this is a newly suspended tree, it might not get committed as
                    // part of the second pass. In that case nothing will subscribe to
                    // its thenables. Instead, we'll transfer its thenables to the
                    // SuspenseList so that it can retry if they resolve.
                    // There might be multiple of these in the list but since we're
                    // going to wait for all of them anyway, it doesn't really matter
                    // which ones gets to ping. In theory we could get clever and keep
                    // track of how many dependencies remain but it gets tricky because
                    // in the meantime, we can add/remove/change items and dependencies.
                    // We might bail out of the loop before finding any but that
                    // doesn't matter since that means that the other boundaries that
                    // we did find already has their listeners attached.

                    var newThenables = suspended.updateQueue;

                    if (newThenables !== null) {
                      workInProgress.updateQueue = newThenables;
                      workInProgress.flags |= Update;
                    } // Rerender the whole list, but this time, we'll force fallbacks
                    // to stay in place.
                    // Reset the effect flags before doing the second pass since that's now invalid.
                    // Reset the child fibers to their original state.


                    workInProgress.subtreeFlags = NoFlags;
                    resetChildFibers(workInProgress, renderLanes); // Set up the Suspense Context to force suspense and immediately
                    // rerender the children.

                    pushSuspenseContext(workInProgress, setShallowSuspenseContext(suspenseStackCursor.current, ForceSuspenseFallback)); // Don't bubble properties in this case.

                    return workInProgress.child;
                  }

                  row = row.sibling;
                }
              }

              if (renderState.tail !== null && now() > getRenderTargetTime()) {
                // We have already passed our CPU deadline but we still have rows
                // left in the tail. We'll just give up further attempts to render
                // the main content and only render fallbacks.
                workInProgress.flags |= DidCapture;
                didSuspendAlready = true;
                cutOffTailIfNeeded(renderState, false); // Since nothing actually suspended, there will nothing to ping this
                // to get it started back up to attempt the next item. While in terms
                // of priority this work has the same priority as this current render,
                // it's not part of the same transition once the transition has
                // committed. If it's sync, we still want to yield so that it can be
                // painted. Conceptually, this is really the same as pinging.
                // We can use any RetryLane even if it's the one currently rendering
                // since we're leaving it behind on this node.

                workInProgress.lanes = SomeRetryLane;
              }
            } else {
              cutOffTailIfNeeded(renderState, false);
            } // Next we're going to render the tail.

          } else {
            // Append the rendered row to the child list.
            if (!didSuspendAlready) {
              var _suspended = findFirstSuspended(renderedTail);

              if (_suspended !== null) {
                workInProgress.flags |= DidCapture;
                didSuspendAlready = true; // Ensure we transfer the update queue to the parent so that it doesn't
                // get lost if this row ends up dropped during a second pass.

                var _newThenables = _suspended.updateQueue;

                if (_newThenables !== null) {
                  workInProgress.updateQueue = _newThenables;
                  workInProgress.flags |= Update;
                }

                cutOffTailIfNeeded(renderState, true); // This might have been modified.

                if (renderState.tail === null && renderState.tailMode === 'hidden' && !renderedTail.alternate && !getIsHydrating() // We don't cut it if we're hydrating.
                ) {
                    // We're done.
                    bubbleProperties(workInProgress);
                    return null;
                  }
              } else if ( // The time it took to render last row is greater than the remaining
              // time we have to render. So rendering one more row would likely
              // exceed it.
              now() * 2 - renderState.renderingStartTime > getRenderTargetTime() && renderLanes !== OffscreenLane) {
                // We have now passed our CPU deadline and we'll just give up further
                // attempts to render the main content and only render fallbacks.
                // The assumption is that this is usually faster.
                workInProgress.flags |= DidCapture;
                didSuspendAlready = true;
                cutOffTailIfNeeded(renderState, false); // Since nothing actually suspended, there will nothing to ping this
                // to get it started back up to attempt the next item. While in terms
                // of priority this work has the same priority as this current render,
                // it's not part of the same transition once the transition has
                // committed. If it's sync, we still want to yield so that it can be
                // painted. Conceptually, this is really the same as pinging.
                // We can use any RetryLane even if it's the one currently rendering
                // since we're leaving it behind on this node.

                workInProgress.lanes = SomeRetryLane;
              }
            }

            if (renderState.isBackwards) {
              // The effect list of the backwards tail will have been added
              // to the end. This breaks the guarantee that life-cycles fire in
              // sibling order but that isn't a strong guarantee promised by React.
              // Especially since these might also just pop in during future commits.
              // Append to the beginning of the list.
              renderedTail.sibling = workInProgress.child;
              workInProgress.child = renderedTail;
            } else {
              var previousSibling = renderState.last;

              if (previousSibling !== null) {
                previousSibling.sibling = renderedTail;
              } else {
                workInProgress.child = renderedTail;
              }

              renderState.last = renderedTail;
            }
          }

          if (renderState.tail !== null) {
            // We still have tail rows to render.
            // Pop a row.
            var next = renderState.tail;
            renderState.rendering = next;
            renderState.tail = next.sibling;
            renderState.renderingStartTime = now();
            next.sibling = null; // Restore the context.
            // TODO: We can probably just avoid popping it instead and only
            // setting it the first time we go from not suspended to suspended.

            var suspenseContext = suspenseStackCursor.current;

            if (didSuspendAlready) {
              suspenseContext = setShallowSuspenseContext(suspenseContext, ForceSuspenseFallback);
            } else {
              suspenseContext = setDefaultShallowSuspenseContext(suspenseContext);
            }

            pushSuspenseContext(workInProgress, suspenseContext); // Do a pass over the next row.
            // Don't bubble properties in this case.

            return next;
          }

          bubbleProperties(workInProgress);
          return null;
        }

      case ScopeComponent:
        {

          break;
        }

      case OffscreenComponent:
      case LegacyHiddenComponent:
        {
          popRenderLanes(workInProgress);
          var _nextState = workInProgress.memoizedState;
          var nextIsHidden = _nextState !== null;

          if (current !== null) {
            var _prevState2 = current.memoizedState;
            var prevIsHidden = _prevState2 !== null;

            if (prevIsHidden !== nextIsHidden && ( // LegacyHidden doesn't do any hiding — it only pre-renders.
            !enableLegacyHidden )) {
              workInProgress.flags |= Visibility;
            }
          }

          if (!nextIsHidden || (workInProgress.mode & ConcurrentMode) === NoMode) {
            bubbleProperties(workInProgress);
          } else {
            // Don't bubble properties for hidden children unless we're rendering
            // at offscreen priority.
            if (includesSomeLane(subtreeRenderLanes, OffscreenLane)) {
              bubbleProperties(workInProgress);

              {
                // Check if there was an insertion or update in the hidden subtree.
                // If so, we need to hide those nodes in the commit phase, so
                // schedule a visibility effect.
                if ( workInProgress.subtreeFlags & (Placement | Update)) {
                  workInProgress.flags |= Visibility;
                }
              }
            }
          }

          {
            var _previousCache2 = null;

            if (current !== null && current.memoizedState !== null && current.memoizedState.cachePool !== null) {
              _previousCache2 = current.memoizedState.cachePool.pool;
            }

            var _cache2 = null;

            if (workInProgress.memoizedState !== null && workInProgress.memoizedState.cachePool !== null) {
              _cache2 = workInProgress.memoizedState.cachePool.pool;
            }

            if (_cache2 !== _previousCache2) {
              // Run passive effects to retain/release the cache.
              workInProgress.flags |= Passive;
            }

            if (current !== null) {
              popTransition(workInProgress);
            }
          }

          return null;
        }

      case CacheComponent:
        {
          {
            var _previousCache3 = null;

            if (current !== null) {
              _previousCache3 = current.memoizedState.cache;
            }

            var _cache3 = workInProgress.memoizedState.cache;

            if (_cache3 !== _previousCache3) {
              // Run passive effects to retain/release the cache.
              workInProgress.flags |= Passive;
            }

            popCacheProvider(workInProgress);
            bubbleProperties(workInProgress);
          }

          return null;
        }

      case TracingMarkerComponent:
        {

          return null;
        }
    }

    throw new Error("Unknown unit of work tag (" + workInProgress.tag + "). This error is likely caused by a bug in " + 'React. Please file an issue.');
  }