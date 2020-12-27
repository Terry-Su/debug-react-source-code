
  function markUpdate(workInProgress) {
    // Tag the fiber with an update effect. This turns a Placement into
    // a PlacementAndUpdate.
    workInProgress.flags |= Update;
  }

  function markRef$1(workInProgress) {
    workInProgress.flags |= Ref;
  }

  var appendAllChildren;
  var updateHostContainer;
  var updateHostComponent$1;
  var updateHostText$1;

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

    updateHostContainer = function (workInProgress) {// Noop
    };

    updateHostComponent$1 = function (current, workInProgress, type, newProps, rootContainerInstance) {
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

    updateHostText$1 = function (current, workInProgress, oldText, newText) {
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

  function completeWork(current, workInProgress, renderLanes) {
    var newProps = workInProgress.pendingProps;

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
        return null;

      case ClassComponent:
        {
          var Component = workInProgress.type;

          if (isContextProvider(Component)) {
            popContext(workInProgress);
          }

          return null;
        }

      case HostRoot:
        {
          popHostContainer(workInProgress);
          popTopLevelContextObject(workInProgress);
          resetWorkInProgressVersions();
          var fiberRoot = workInProgress.stateNode;

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
            } else if (!fiberRoot.hydrate) {
              // Schedule an effect to clear this container at the start of the next commit.
              // This handles the case of React rendering into a container with previous children.
              // It's also safe to do for updates too, because current.child would only be null
              // if the previous render was null (so the the container would already be empty).
              workInProgress.flags |= Snapshot;
            }
          }

          updateHostContainer(workInProgress);
          return null;
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
              if (!(workInProgress.stateNode !== null)) {
                {
                  throw Error( "We must have new props for new mounts. This error is likely caused by a bug in React. Please file an issue." );
                }
              } // This can happen when we abort work.


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
              markRef$1(workInProgress);
            }
          }

          return null;
        }

      case HostText:
        {
          var newText = newProps;

          if (current && workInProgress.stateNode != null) {
            var oldText = current.memoizedProps; // If we have an alternate, that means this is an update and we need
            // to schedule a side-effect to do the updates.

            updateHostText$1(current, workInProgress, oldText, newText);
          } else {
            if (typeof newText !== 'string') {
              if (!(workInProgress.stateNode !== null)) {
                {
                  throw Error( "We must have new props for new mounts. This error is likely caused by a bug in React. Please file an issue." );
                }
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

          return null;
        }

      case SuspenseComponent:
        {
          popSuspenseContext(workInProgress);
          var nextState = workInProgress.memoizedState;

          {
            if (nextState !== null && nextState.dehydrated !== null) {
              if (current === null) {
                var _wasHydrated3 = popHydrationState(workInProgress);

                if (!_wasHydrated3) {
                  {
                    throw Error( "A dehydrated suspense component was completed without a hydrated node. This is probably a bug in React." );
                  }
                }

                prepareToHydrateHostSuspenseInstance(workInProgress);

                {
                  markSpawnedWork(OffscreenLane);
                }

                return null;
              } else {
                // We should never have been in a hydration state if we didn't have a current.
                // However, in some of those paths, we might have reentered a hydration state
                // and then we might be inside a hydration state. In that case, we'll need to exit out of it.
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
                return null;
              }
            }
          }

          if ((workInProgress.flags & DidCapture) !== NoFlags) {
            // Something suspended. Re-render with the fallback children.
            workInProgress.lanes = renderLanes; // Do not reset the effect list.

            if ( (workInProgress.mode & ProfileMode) !== NoMode) {
              transferActualDuration(workInProgress);
            }

            return workInProgress;
          }

          var nextDidTimeout = nextState !== null;
          var prevDidTimeout = false;

          if (current === null) {
            if (workInProgress.memoizedProps.fallback !== undefined) {
              popHydrationState(workInProgress);
            }
          } else {
            var prevState = current.memoizedState;
            prevDidTimeout = prevState !== null;
          }

          if (nextDidTimeout && !prevDidTimeout) {
            // If this subtreee is running in blocking mode we can suspend,
            // otherwise we won't suspend.
            // TODO: This will still suspend a synchronous tree if anything
            // in the concurrent tree already suspended during this render.
            // This is a known bug.
            if ((workInProgress.mode & BlockingMode) !== NoMode) {
              // TODO: Move this back to throwException because this is too late
              // if this is a large tree which is common for initial loads. We
              // don't know if we should restart a render or not until we get
              // this marker, and this is too late.
              // If this render already had a ping or lower pri updates,
              // and this is the first time we know we're going to suspend we
              // should be able to immediately restart from within throwException.
              var hasInvisibleChildContext = current === null && workInProgress.memoizedProps.unstable_avoidThisFallback !== true;

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

          {
            // TODO: Only schedule updates if these values are non equal, i.e. it changed.
            if (nextDidTimeout || prevDidTimeout) {
              // If this boundary just timed out, schedule an effect to attach a
              // retry listener to the promise. This flag is also used to hide the
              // primary children. In mutation mode, we also need the flag to
              // *unhide* children that were previously hidden, so check if this
              // is currently timed out, too.
              workInProgress.flags |= Update;
            }
          }

          return null;
        }

      case HostPortal:
        popHostContainer(workInProgress);
        updateHostContainer(workInProgress);

        if (current === null) {
          preparePortalMount(workInProgress.stateNode.containerInfo);
        }

        return null;

      case ContextProvider:
        // Pop provider fiber
        popProvider(workInProgress);
        return null;

      case IncompleteClassComponent:
        {
          // Same as class component case. I put it down here so that the tags are
          // sequential to ensure this switch is compiled to a jump table.
          var _Component = workInProgress.type;

          if (isContextProvider(_Component)) {
            popContext(workInProgress);
          }

          return null;
        }

      case SuspenseListComponent:
        {
          popSuspenseContext(workInProgress);
          var renderState = workInProgress.memoizedState;

          if (renderState === null) {
            // We're running in the default, "independent" mode.
            // We don't do anything in this mode.
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
                    // its thennables. Instead, we'll transfer its thennables to the
                    // SuspenseList so that it can retry if they resolve.
                    // There might be multiple of these in the list but since we're
                    // going to wait for all of them anyway, it doesn't really matter
                    // which ones gets to ping. In theory we could get clever and keep
                    // track of how many dependencies remain but it gets tricky because
                    // in the meantime, we can add/remove/change items and dependencies.
                    // We might bail out of the loop before finding any but that
                    // doesn't matter since that means that the other boundaries that
                    // we did find already has their listeners attached.

                    var newThennables = suspended.updateQueue;

                    if (newThennables !== null) {
                      workInProgress.updateQueue = newThennables;
                      workInProgress.flags |= Update;
                    } // Rerender the whole list, but this time, we'll force fallbacks
                    // to stay in place.
                    // Reset the effect list before doing the second pass since that's now invalid.


                    if (renderState.lastEffect === null) {
                      workInProgress.firstEffect = null;
                    }

                    workInProgress.lastEffect = renderState.lastEffect; // Reset the child fibers to their original state.

                    resetChildFibers(workInProgress, renderLanes); // Set up the Suspense Context to force suspense and immediately
                    // rerender the children.

                    pushSuspenseContext(workInProgress, setShallowSuspenseContext(suspenseStackCursor.current, ForceSuspenseFallback));
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

                {
                  markSpawnedWork(SomeRetryLane);
                }
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

                var _newThennables = _suspended.updateQueue;

                if (_newThennables !== null) {
                  workInProgress.updateQueue = _newThennables;
                  workInProgress.flags |= Update;
                }

                cutOffTailIfNeeded(renderState, true); // This might have been modified.

                if (renderState.tail === null && renderState.tailMode === 'hidden' && !renderedTail.alternate && !getIsHydrating() // We don't cut it if we're hydrating.
                ) {
                    // We need to delete the row we just rendered.
                    // Reset the effect list to what it was before we rendered this
                    // child. The nested children have already appended themselves.
                    var lastEffect = workInProgress.lastEffect = renderState.lastEffect; // Remove any effects that were appended after this point.

                    if (lastEffect !== null) {
                      lastEffect.nextEffect = null;
                    } // We're done.


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

                {
                  markSpawnedWork(SomeRetryLane);
                }
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
            renderState.lastEffect = workInProgress.lastEffect;
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

            return next;
          }

          return null;
        }

      case FundamentalComponent:
        {

          break;
        }

      case ScopeComponent:
        {

          break;
        }

      case Block:
        {
          return null;
        }

      case OffscreenComponent:
      case LegacyHiddenComponent:
        {
          popRenderLanes(workInProgress);

          if (current !== null) {
            var _nextState = workInProgress.memoizedState;
            var _prevState = current.memoizedState;
            var prevIsHidden = _prevState !== null;
            var nextIsHidden = _nextState !== null;

            if (prevIsHidden !== nextIsHidden && newProps.mode !== 'unstable-defer-without-hiding') {
              workInProgress.flags |= Update;
            }
          }

          return null;
        }
    }

    {
      {
        throw Error( "Unknown unit of work tag (" + workInProgress.tag + "). This error is likely caused by a bug in React. Please file an issue." );
      }
    }
  }