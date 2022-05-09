  var didWarnAboutUndefinedSnapshotBeforeUpdate = null;

  {
    didWarnAboutUndefinedSnapshotBeforeUpdate = new Set();
  } // Used during the commit phase to track the state of the Offscreen component stack.
  // Allows us to avoid traversing the return path to find the nearest Offscreen ancestor.
  // Only used when enableSuspenseLayoutEffectSemantics is enabled.


  var offscreenSubtreeIsHidden = false;
  var offscreenSubtreeWasHidden = false;
  var PossiblyWeakSet = typeof WeakSet === 'function' ? WeakSet : Set;
  var nextEffect = null; // Used for Profiling builds to track updaters.

  var inProgressLanes = null;
  var inProgressRoot = null;

  function reportUncaughtErrorInDEV(error) {
    // Wrapping each small part of the commit phase into a guarded
    // callback is a bit too slow (https://github.com/facebook/react/pull/21666).
    // But we rely on it to surface errors to DEV tools like overlays
    // (https://github.com/facebook/react/issues/21712).
    // As a compromise, rethrow only caught errors in a guard.
    {
      invokeGuardedCallback(null, function () {
        throw error;
      });
      clearCaughtError();
    }
  }

  var callComponentWillUnmountWithTimer = function (current, instance) {
    instance.props = current.memoizedProps;
    instance.state = current.memoizedState;

    if ( current.mode & ProfileMode) {
      try {
        startLayoutEffectTimer();
        instance.componentWillUnmount();
      } finally {
        recordLayoutEffectDuration(current);
      }
    } else {
      instance.componentWillUnmount();
    }
  }; // Capture errors so they don't interrupt mounting.


  function safelyCallCommitHookLayoutEffectListMount(current, nearestMountedAncestor) {
    try {
      commitHookEffectListMount(Layout, current);
    } catch (error) {
      reportUncaughtErrorInDEV(error);
      captureCommitPhaseError(current, nearestMountedAncestor, error);
    }
  } // Capture errors so they don't interrupt unmounting.


  function safelyCallComponentWillUnmount(current, nearestMountedAncestor, instance) {
    try {
      callComponentWillUnmountWithTimer(current, instance);
    } catch (error) {
      reportUncaughtErrorInDEV(error);
      captureCommitPhaseError(current, nearestMountedAncestor, error);
    }
  } // Capture errors so they don't interrupt mounting.


  function safelyCallComponentDidMount(current, nearestMountedAncestor, instance) {
    try {
      instance.componentDidMount();
    } catch (error) {
      reportUncaughtErrorInDEV(error);
      captureCommitPhaseError(current, nearestMountedAncestor, error);
    }
  } // Capture errors so they don't interrupt mounting.


  function safelyAttachRef(current, nearestMountedAncestor) {
    try {
      commitAttachRef(current);
    } catch (error) {
      reportUncaughtErrorInDEV(error);
      captureCommitPhaseError(current, nearestMountedAncestor, error);
    }
  }

  function safelyDetachRef(current, nearestMountedAncestor) {
    var ref = current.ref;

    if (ref !== null) {
      if (typeof ref === 'function') {
        var retVal;

        try {
          if (enableProfilerTimer && enableProfilerCommitHooks && current.mode & ProfileMode) {
            try {
              startLayoutEffectTimer();
              retVal = ref(null);
            } finally {
              recordLayoutEffectDuration(current);
            }
          } else {
            retVal = ref(null);
          }
        } catch (error) {
          reportUncaughtErrorInDEV(error);
          captureCommitPhaseError(current, nearestMountedAncestor, error);
        }

        {
          if (typeof retVal === 'function') {
            error('Unexpected return value from a callback ref in %s. ' + 'A callback ref should not return a function.', getComponentNameFromFiber(current));
          }
        }
      } else {
        ref.current = null;
      }
    }
  }

  function safelyCallDestroy(current, nearestMountedAncestor, destroy) {
    try {
      destroy();
    } catch (error) {
      reportUncaughtErrorInDEV(error);
      captureCommitPhaseError(current, nearestMountedAncestor, error);
    }
  }

  var focusedInstanceHandle = null;
  var shouldFireAfterActiveInstanceBlur = false;
  function commitBeforeMutationEffects(root, firstChild) {
    focusedInstanceHandle = prepareForCommit(root.containerInfo);
    nextEffect = firstChild;
    commitBeforeMutationEffects_begin(); // We no longer need to track the active instance fiber

    var shouldFire = shouldFireAfterActiveInstanceBlur;
    shouldFireAfterActiveInstanceBlur = false;
    focusedInstanceHandle = null;
    return shouldFire;
  }

  function commitBeforeMutationEffects_begin() {
    while (nextEffect !== null) {
      var fiber = nextEffect; // This phase is only used for beforeActiveInstanceBlur.

      var child = fiber.child;

      if ((fiber.subtreeFlags & BeforeMutationMask) !== NoFlags && child !== null) {
        ensureCorrectReturnPointer(child, fiber);
        nextEffect = child;
      } else {
        commitBeforeMutationEffects_complete();
      }
    }
  }

  function commitBeforeMutationEffects_complete() {
    while (nextEffect !== null) {
      var fiber = nextEffect;
      setCurrentFiber(fiber);

      try {
        commitBeforeMutationEffectsOnFiber(fiber);
      } catch (error) {
        reportUncaughtErrorInDEV(error);
        captureCommitPhaseError(fiber, fiber.return, error);
      }

      resetCurrentFiber();
      var sibling = fiber.sibling;

      if (sibling !== null) {
        ensureCorrectReturnPointer(sibling, fiber.return);
        nextEffect = sibling;
        return;
      }

      nextEffect = fiber.return;
    }
  }

  function commitBeforeMutationEffectsOnFiber(finishedWork) {
    var current = finishedWork.alternate;
    var flags = finishedWork.flags;

    if ((flags & Snapshot) !== NoFlags) {
      setCurrentFiber(finishedWork);

      switch (finishedWork.tag) {
        case FunctionComponent:
        case ForwardRef:
        case SimpleMemoComponent:
          {
            break;
          }

        case ClassComponent:
          {
            if (current !== null) {
              var prevProps = current.memoizedProps;
              var prevState = current.memoizedState;
              var instance = finishedWork.stateNode; // We could update instance props and state here,
              // but instead we rely on them being set during last render.
              // TODO: revisit this when we implement resuming.

              {
                if (finishedWork.type === finishedWork.elementType && !didWarnAboutReassigningProps) {
                  if (instance.props !== finishedWork.memoizedProps) {
                    error('Expected %s props to match memoized props before ' + 'getSnapshotBeforeUpdate. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.props`. ' + 'Please file an issue.', getComponentNameFromFiber(finishedWork) || 'instance');
                  }

                  if (instance.state !== finishedWork.memoizedState) {
                    error('Expected %s state to match memoized state before ' + 'getSnapshotBeforeUpdate. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.state`. ' + 'Please file an issue.', getComponentNameFromFiber(finishedWork) || 'instance');
                  }
                }
              }

              var snapshot = instance.getSnapshotBeforeUpdate(finishedWork.elementType === finishedWork.type ? prevProps : resolveDefaultProps(finishedWork.type, prevProps), prevState);

              {
                var didWarnSet = didWarnAboutUndefinedSnapshotBeforeUpdate;

                if (snapshot === undefined && !didWarnSet.has(finishedWork.type)) {
                  didWarnSet.add(finishedWork.type);

                  error('%s.getSnapshotBeforeUpdate(): A snapshot value (or null) ' + 'must be returned. You have returned undefined.', getComponentNameFromFiber(finishedWork));
                }
              }

              instance.__reactInternalSnapshotBeforeUpdate = snapshot;
            }

            break;
          }

        case HostRoot:
          {
            {
              var root = finishedWork.stateNode;
              clearContainer(root.containerInfo);
            }

            break;
          }

        case HostComponent:
        case HostText:
        case HostPortal:
        case IncompleteClassComponent:
          // Nothing to do for these component types
          break;

        default:
          {
            throw new Error('This unit of work tag should not have side-effects. This error is ' + 'likely caused by a bug in React. Please file an issue.');
          }
      }

      resetCurrentFiber();
    }
  }

  function commitHookEffectListUnmount(flags, finishedWork, nearestMountedAncestor) {
    var updateQueue = finishedWork.updateQueue;
    var lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;

    if (lastEffect !== null) {
      var firstEffect = lastEffect.next;
      var effect = firstEffect;

      do {
        if ((effect.tag & flags) === flags) {
          // Unmount
          var destroy = effect.destroy;
          effect.destroy = undefined;

          if (destroy !== undefined) {
            {
              if ((flags & Passive$1) !== NoFlags$1) {
                markComponentPassiveEffectUnmountStarted(finishedWork);
              } else if ((flags & Layout) !== NoFlags$1) {
                markComponentLayoutEffectUnmountStarted(finishedWork);
              }
            }

            safelyCallDestroy(finishedWork, nearestMountedAncestor, destroy);

            {
              if ((flags & Passive$1) !== NoFlags$1) {
                markComponentPassiveEffectUnmountStopped();
              } else if ((flags & Layout) !== NoFlags$1) {
                markComponentLayoutEffectUnmountStopped();
              }
            }
          }
        }

        effect = effect.next;
      } while (effect !== firstEffect);
    }
  }

  function commitHookEffectListMount(flags, finishedWork) {
    var updateQueue = finishedWork.updateQueue;
    var lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;

    if (lastEffect !== null) {
      var firstEffect = lastEffect.next;
      var effect = firstEffect;

      do {
        if ((effect.tag & flags) === flags) {
          {
            if ((flags & Passive$1) !== NoFlags$1) {
              markComponentPassiveEffectMountStarted(finishedWork);
            } else if ((flags & Layout) !== NoFlags$1) {
              markComponentLayoutEffectMountStarted(finishedWork);
            }
          } // Mount


          var create = effect.create;
          effect.destroy = create();

          {
            if ((flags & Passive$1) !== NoFlags$1) {
              markComponentPassiveEffectMountStopped();
            } else if ((flags & Layout) !== NoFlags$1) {
              markComponentLayoutEffectMountStopped();
            }
          }

          {
            var destroy = effect.destroy;

            if (destroy !== undefined && typeof destroy !== 'function') {
              var hookName = void 0;

              if ((effect.tag & Layout) !== NoFlags) {
                hookName = 'useLayoutEffect';
              } else if ((effect.tag & Insertion) !== NoFlags) {
                hookName = 'useInsertionEffect';
              } else {
                hookName = 'useEffect';
              }

              var addendum = void 0;

              if (destroy === null) {
                addendum = ' You returned null. If your effect does not require clean ' + 'up, return undefined (or nothing).';
              } else if (typeof destroy.then === 'function') {
                addendum = '\n\nIt looks like you wrote ' + hookName + '(async () => ...) or returned a Promise. ' + 'Instead, write the async function inside your effect ' + 'and call it immediately:\n\n' + hookName + '(() => {\n' + '  async function fetchData() {\n' + '    // You can await here\n' + '    const response = await MyAPI.getData(someId);\n' + '    // ...\n' + '  }\n' + '  fetchData();\n' + "}, [someId]); // Or [] if effect doesn't need props or state\n\n" + 'Learn more about data fetching with Hooks: https://reactjs.org/link/hooks-data-fetching';
              } else {
                addendum = ' You returned: ' + destroy;
              }

              error('%s must not return anything besides a function, ' + 'which is used for clean-up.%s', hookName, addendum);
            }
          }
        }

        effect = effect.next;
      } while (effect !== firstEffect);
    }
  }

  function commitPassiveEffectDurations(finishedRoot, finishedWork) {
    {
      // Only Profilers with work in their subtree will have an Update effect scheduled.
      if ((finishedWork.flags & Update) !== NoFlags) {
        switch (finishedWork.tag) {
          case Profiler:
            {
              var passiveEffectDuration = finishedWork.stateNode.passiveEffectDuration;
              var _finishedWork$memoize = finishedWork.memoizedProps,
                  id = _finishedWork$memoize.id,
                  onPostCommit = _finishedWork$memoize.onPostCommit; // This value will still reflect the previous commit phase.
              // It does not get reset until the start of the next commit phase.

              var commitTime = getCommitTime();
              var phase = finishedWork.alternate === null ? 'mount' : 'update';

              {
                if (isCurrentUpdateNested()) {
                  phase = 'nested-update';
                }
              }

              if (typeof onPostCommit === 'function') {
                onPostCommit(id, phase, passiveEffectDuration, commitTime);
              } // Bubble times to the next nearest ancestor Profiler.
              // After we process that Profiler, we'll bubble further up.


              var parentFiber = finishedWork.return;

              outer: while (parentFiber !== null) {
                switch (parentFiber.tag) {
                  case HostRoot:
                    var root = parentFiber.stateNode;
                    root.passiveEffectDuration += passiveEffectDuration;
                    break outer;

                  case Profiler:
                    var parentStateNode = parentFiber.stateNode;
                    parentStateNode.passiveEffectDuration += passiveEffectDuration;
                    break outer;
                }

                parentFiber = parentFiber.return;
              }

              break;
            }
        }
      }
    }
  }

  function commitLayoutEffectOnFiber(finishedRoot, current, finishedWork, committedLanes) {
    if ((finishedWork.flags & LayoutMask) !== NoFlags) {
      switch (finishedWork.tag) {
        case FunctionComponent:
        case ForwardRef:
        case SimpleMemoComponent:
          {
            if ( !offscreenSubtreeWasHidden) {
              // At this point layout effects have already been destroyed (during mutation phase).
              // This is done to prevent sibling component effects from interfering with each other,
              // e.g. a destroy function in one component should never override a ref set
              // by a create function in another component during the same commit.
              if ( finishedWork.mode & ProfileMode) {
                try {
                  startLayoutEffectTimer();
                  commitHookEffectListMount(Layout | HasEffect, finishedWork);
                } finally {
                  recordLayoutEffectDuration(finishedWork);
                }
              } else {
                commitHookEffectListMount(Layout | HasEffect, finishedWork);
              }
            }

            break;
          }

        case ClassComponent:
          {
            var instance = finishedWork.stateNode;

            if (finishedWork.flags & Update) {
              if (!offscreenSubtreeWasHidden) {
                if (current === null) {
                  // We could update instance props and state here,
                  // but instead we rely on them being set during last render.
                  // TODO: revisit this when we implement resuming.
                  {
                    if (finishedWork.type === finishedWork.elementType && !didWarnAboutReassigningProps) {
                      if (instance.props !== finishedWork.memoizedProps) {
                        error('Expected %s props to match memoized props before ' + 'componentDidMount. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.props`. ' + 'Please file an issue.', getComponentNameFromFiber(finishedWork) || 'instance');
                      }

                      if (instance.state !== finishedWork.memoizedState) {
                        error('Expected %s state to match memoized state before ' + 'componentDidMount. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.state`. ' + 'Please file an issue.', getComponentNameFromFiber(finishedWork) || 'instance');
                      }
                    }
                  }

                  if ( finishedWork.mode & ProfileMode) {
                    try {
                      startLayoutEffectTimer();
                      instance.componentDidMount();
                    } finally {
                      recordLayoutEffectDuration(finishedWork);
                    }
                  } else {
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
                        error('Expected %s props to match memoized props before ' + 'componentDidUpdate. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.props`. ' + 'Please file an issue.', getComponentNameFromFiber(finishedWork) || 'instance');
                      }

                      if (instance.state !== finishedWork.memoizedState) {
                        error('Expected %s state to match memoized state before ' + 'componentDidUpdate. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.state`. ' + 'Please file an issue.', getComponentNameFromFiber(finishedWork) || 'instance');
                      }
                    }
                  }

                  if ( finishedWork.mode & ProfileMode) {
                    try {
                      startLayoutEffectTimer();
                      instance.componentDidUpdate(prevProps, prevState, instance.__reactInternalSnapshotBeforeUpdate);
                    } finally {
                      recordLayoutEffectDuration(finishedWork);
                    }
                  } else {
                    instance.componentDidUpdate(prevProps, prevState, instance.__reactInternalSnapshotBeforeUpdate);
                  }
                }
              }
            } // TODO: I think this is now always non-null by the time it reaches the
            // commit phase. Consider removing the type check.


            var updateQueue = finishedWork.updateQueue;

            if (updateQueue !== null) {
              {
                if (finishedWork.type === finishedWork.elementType && !didWarnAboutReassigningProps) {
                  if (instance.props !== finishedWork.memoizedProps) {
                    error('Expected %s props to match memoized props before ' + 'processing the update queue. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.props`. ' + 'Please file an issue.', getComponentNameFromFiber(finishedWork) || 'instance');
                  }

                  if (instance.state !== finishedWork.memoizedState) {
                    error('Expected %s state to match memoized state before ' + 'processing the update queue. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.state`. ' + 'Please file an issue.', getComponentNameFromFiber(finishedWork) || 'instance');
                  }
                }
              } // We could update instance props and state here,
              // but instead we rely on them being set during last render.
              // TODO: revisit this when we implement resuming.


              commitUpdateQueue(finishedWork, updateQueue, instance);
            }

            break;
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

            break;
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

            break;
          }

        case HostText:
          {
            // We have no life-cycles associated with text.
            break;
          }

        case HostPortal:
          {
            // We have no life-cycles associated with portals.
            break;
          }

        case Profiler:
          {
            {
              var _finishedWork$memoize2 = finishedWork.memoizedProps,
                  onCommit = _finishedWork$memoize2.onCommit,
                  onRender = _finishedWork$memoize2.onRender;
              var effectDuration = finishedWork.stateNode.effectDuration;
              var commitTime = getCommitTime();
              var phase = current === null ? 'mount' : 'update';

              {
                if (isCurrentUpdateNested()) {
                  phase = 'nested-update';
                }
              }

              if (typeof onRender === 'function') {
                onRender(finishedWork.memoizedProps.id, phase, finishedWork.actualDuration, finishedWork.treeBaseDuration, finishedWork.actualStartTime, commitTime);
              }

              {
                if (typeof onCommit === 'function') {
                  onCommit(finishedWork.memoizedProps.id, phase, effectDuration, commitTime);
                } // Schedule a passive effect for this Profiler to call onPostCommit hooks.
                // This effect should be scheduled even if there is no onPostCommit callback for this Profiler,
                // because the effect is also where times bubble to parent Profilers.


                enqueuePendingPassiveProfilerEffect(finishedWork); // Propagate layout effect durations to the next nearest Profiler ancestor.
                // Do not reset these values until the next render so DevTools has a chance to read them first.

                var parentFiber = finishedWork.return;

                outer: while (parentFiber !== null) {
                  switch (parentFiber.tag) {
                    case HostRoot:
                      var root = parentFiber.stateNode;
                      root.effectDuration += effectDuration;
                      break outer;

                    case Profiler:
                      var parentStateNode = parentFiber.stateNode;
                      parentStateNode.effectDuration += effectDuration;
                      break outer;
                  }

                  parentFiber = parentFiber.return;
                }
              }
            }

            break;
          }

        case SuspenseComponent:
          {
            commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
            break;
          }

        case SuspenseListComponent:
        case IncompleteClassComponent:
        case ScopeComponent:
        case OffscreenComponent:
        case LegacyHiddenComponent:
          {
            break;
          }

        default:
          throw new Error('This unit of work tag should not have side-effects. This error is ' + 'likely caused by a bug in React. Please file an issue.');
      }
    }

    if ( !offscreenSubtreeWasHidden) {
      {
        if (finishedWork.flags & Ref) {
          commitAttachRef(finishedWork);
        }
      }
    }
  }

  function reappearLayoutEffectsOnFiber(node) {
    // Turn on layout effects in a tree that previously disappeared.
    // TODO (Offscreen) Check: flags & LayoutStatic
    switch (node.tag) {
      case FunctionComponent:
      case ForwardRef:
      case SimpleMemoComponent:
        {
          if ( node.mode & ProfileMode) {
            try {
              startLayoutEffectTimer();
              safelyCallCommitHookLayoutEffectListMount(node, node.return);
            } finally {
              recordLayoutEffectDuration(node);
            }
          } else {
            safelyCallCommitHookLayoutEffectListMount(node, node.return);
          }

          break;
        }

      case ClassComponent:
        {
          var instance = node.stateNode;

          if (typeof instance.componentDidMount === 'function') {
            safelyCallComponentDidMount(node, node.return, instance);
          }

          safelyAttachRef(node, node.return);
          break;
        }

      case HostComponent:
        {
          safelyAttachRef(node, node.return);
          break;
        }
    }
  }

  function hideOrUnhideAllChildren(finishedWork, isHidden) {
    // Only hide or unhide the top-most host nodes.
    var hostSubtreeRoot = null;

    {
      // We only have the top Fiber that was inserted but we need to recurse down its
      // children to find all the terminal nodes.
      var node = finishedWork;

      while (true) {
        if (node.tag === HostComponent) {
          if (hostSubtreeRoot === null) {
            hostSubtreeRoot = node;
            var instance = node.stateNode;

            if (isHidden) {
              hideInstance(instance);
            } else {
              unhideInstance(node.stateNode, node.memoizedProps);
            }
          }
        } else if (node.tag === HostText) {
          if (hostSubtreeRoot === null) {
            var _instance3 = node.stateNode;

            if (isHidden) {
              hideTextInstance(_instance3);
            } else {
              unhideTextInstance(_instance3, node.memoizedProps);
            }
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

          if (hostSubtreeRoot === node) {
            hostSubtreeRoot = null;
          }

          node = node.return;
        }

        if (hostSubtreeRoot === node) {
          hostSubtreeRoot = null;
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
        var retVal;

        if ( finishedWork.mode & ProfileMode) {
          try {
            startLayoutEffectTimer();
            retVal = ref(instanceToUse);
          } finally {
            recordLayoutEffectDuration(finishedWork);
          }
        } else {
          retVal = ref(instanceToUse);
        }

        {
          if (typeof retVal === 'function') {
            error('Unexpected return value from a callback ref in %s. ' + 'A callback ref should not return a function.', getComponentNameFromFiber(finishedWork));
          }
        }
      } else {
        {
          if (!ref.hasOwnProperty('current')) {
            error('Unexpected ref object provided for %s. ' + 'Use either a ref-setter function or React.createRef().', getComponentNameFromFiber(finishedWork));
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
        if ( current.mode & ProfileMode) {
          try {
            startLayoutEffectTimer();
            currentRef(null);
          } finally {
            recordLayoutEffectDuration(current);
          }
        } else {
          currentRef(null);
        }
      } else {
        currentRef.current = null;
      }
    }
  } // User-originating errors (lifecycles and refs) should not interrupt
  // deletion, so don't let them throw. Host-originating errors should
  // interrupt deletion, so it's okay


  function commitUnmount(finishedRoot, current, nearestMountedAncestor) {
    onCommitUnmount(current);

    switch (current.tag) {
      case FunctionComponent:
      case ForwardRef:
      case MemoComponent:
      case SimpleMemoComponent:
        {
          var updateQueue = current.updateQueue;

          if (updateQueue !== null) {
            var lastEffect = updateQueue.lastEffect;

            if (lastEffect !== null) {
              var firstEffect = lastEffect.next;
              var effect = firstEffect;

              do {
                var _effect = effect,
                    destroy = _effect.destroy,
                    tag = _effect.tag;

                if (destroy !== undefined) {
                  if ((tag & Insertion) !== NoFlags$1) {
                    safelyCallDestroy(current, nearestMountedAncestor, destroy);
                  } else if ((tag & Layout) !== NoFlags$1) {
                    {
                      markComponentLayoutEffectUnmountStarted(current);
                    }

                    if ( current.mode & ProfileMode) {
                      startLayoutEffectTimer();
                      safelyCallDestroy(current, nearestMountedAncestor, destroy);
                      recordLayoutEffectDuration(current);
                    } else {
                      safelyCallDestroy(current, nearestMountedAncestor, destroy);
                    }

                    {
                      markComponentLayoutEffectUnmountStopped();
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
          safelyDetachRef(current, nearestMountedAncestor);
          var instance = current.stateNode;

          if (typeof instance.componentWillUnmount === 'function') {
            safelyCallComponentWillUnmount(current, nearestMountedAncestor, instance);
          }

          return;
        }

      case HostComponent:
        {
          safelyDetachRef(current, nearestMountedAncestor);
          return;
        }

      case HostPortal:
        {
          // TODO: this is recursive.
          // We are also not using this parent because
          // the portal will get pushed immediately.
          {
            unmountHostComponents(finishedRoot, current, nearestMountedAncestor);
          }

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

  function commitNestedUnmounts(finishedRoot, root, nearestMountedAncestor) {
    // While we're inside a removed host node we don't want to call
    // removeChild on the inner nodes because they're removed by the top
    // call anyway. We also want to call componentWillUnmount on all
    // composites before this host node is removed from the tree. Therefore
    // we do an inner loop while we're still inside the host node.
    var node = root;

    while (true) {
      commitUnmount(finishedRoot, node, nearestMountedAncestor); // Visit children because they may contain more composite or host nodes.
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
    // Cut off the return pointer to disconnect it from the tree.
    // This enables us to detect and warn against state updates on an unmounted component.
    // It also prevents events from bubbling from within disconnected components.
    //
    // Ideally, we should also clear the child pointer of the parent alternate to let this
    // get GC:ed but we don't know which for sure which parent is the current
    // one so we'll settle for GC:ing the subtree of this child.
    // This child itself will be GC:ed when the parent updates the next time.
    //
    // Note that we can't clear child or sibling pointers yet.
    // They're needed for passive effects and for findDOMNode.
    // We defer those fields, and all other cleanup, to the passive phase (see detachFiberAfterEffects).
    //
    // Don't reset the alternate yet, either. We need that so we can detach the
    // alternate's fields in the passive phase. Clearing the return pointer is
    // sufficient for findDOMNode semantics.
    var alternate = fiber.alternate;

    if (alternate !== null) {
      alternate.return = null;
    }

    fiber.return = null;
  }

  function detachFiberAfterEffects(fiber) {
    var alternate = fiber.alternate;

    if (alternate !== null) {
      fiber.alternate = null;
      detachFiberAfterEffects(alternate);
    } // Note: Defensively using negation instead of < in case
    // `deletedTreeCleanUpLevel` is undefined.


    {
      // Clear cyclical Fiber fields. This level alone is designed to roughly
      // approximate the planned Fiber refactor. In that world, `setState` will be
      // bound to a special "instance" object instead of a Fiber. The Instance
      // object will not have any of these fields. It will only be connected to
      // the fiber tree via a single link at the root. So if this level alone is
      // sufficient to fix memory issues, that bodes well for our plans.
      fiber.child = null;
      fiber.deletions = null;
      fiber.sibling = null; // The `stateNode` is cyclical because on host nodes it points to the host
      // tree, which has its own pointers to children, parents, and siblings.
      // The other host nodes also point back to fibers, so we should detach that
      // one, too.

      if (fiber.tag === HostComponent) {
        var hostInstance = fiber.stateNode;

        if (hostInstance !== null) {
          detachDeletedInstance(hostInstance);
        }
      }

      fiber.stateNode = null; // I'm intentionally not clearing the `return` field in this level. We
      // already disconnect the `return` pointer at the root of the deleted
      // subtree (in `detachFiberMutation`). Besides, `return` by itself is not
      // cyclical — it's only cyclical when combined with `child`, `sibling`, and
      // `alternate`. But we'll clear it in the next level anyway, just in case.

      {
        fiber._debugOwner = null;
      }

      {
        // Theoretically, nothing in here should be necessary, because we already
        // disconnected the fiber from the tree. So even if something leaks this
        // particular fiber, it won't leak anything else
        //
        // The purpose of this branch is to be super aggressive so we can measure
        // if there's any difference in memory impact. If there is, that could
        // indicate a React leak we don't know about.
        fiber.return = null;
        fiber.dependencies = null;
        fiber.memoizedProps = null;
        fiber.memoizedState = null;
        fiber.pendingProps = null;
        fiber.stateNode = null; // TODO: Move to `commitPassiveUnmountInsideDeletedTreeOnFiber` instead.

        fiber.updateQueue = null;
      }
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

    throw new Error('Expected to find a host parent. This error is likely caused by a bug ' + 'in React. Please file an issue.');
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

    switch (parentFiber.tag) {
      case HostComponent:
        {
          var parent = parentFiber.stateNode;

          if (parentFiber.flags & ContentReset) {
            // Reset the text content of the parent before doing any insertions
            resetTextContent(parent); // Clear ContentReset from the effect tag

            parentFiber.flags &= ~ContentReset;
          }

          var before = getHostSibling(finishedWork); // We only have the top Fiber that was inserted but we need to recurse down its
          // children to find all the terminal nodes.

          insertOrAppendPlacementNode(finishedWork, before, parent);
          break;
        }

      case HostRoot:
      case HostPortal:
        {
          var _parent = parentFiber.stateNode.containerInfo;

          var _before = getHostSibling(finishedWork);

          insertOrAppendPlacementNodeIntoContainer(finishedWork, _before, _parent);
          break;
        }
      // eslint-disable-next-line-no-fallthrough

      default:
        throw new Error('Invalid host parent fiber. This error is likely caused by a bug ' + 'in React. Please file an issue.');
    }
  }

  function insertOrAppendPlacementNodeIntoContainer(node, before, parent) {
    var tag = node.tag;
    var isHost = tag === HostComponent || tag === HostText;

    if (isHost) {
      var stateNode = node.stateNode;

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

    if (isHost) {
      var stateNode = node.stateNode;

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

  function unmountHostComponents(finishedRoot, current, nearestMountedAncestor) {
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
          if (parent === null) {
            throw new Error('Expected to find a host parent. This error is likely caused by ' + 'a bug in React. Please file an issue.');
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
        commitNestedUnmounts(finishedRoot, node, nearestMountedAncestor); // After all the children have unmounted, it is now safe to remove the
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
        commitUnmount(finishedRoot, node, nearestMountedAncestor); // Visit children because we may find more host components below.

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

  function commitDeletion(finishedRoot, current, nearestMountedAncestor) {
    {
      // Recursively delete all host nodes from the parent.
      // Detach refs and call componentWillUnmount() on the whole subtree.
      unmountHostComponents(finishedRoot, current, nearestMountedAncestor);
    }

    detachFiberMutation(current);
  }

  function commitWork(current, finishedWork) {

    switch (finishedWork.tag) {
      case FunctionComponent:
      case ForwardRef:
      case MemoComponent:
      case SimpleMemoComponent:
        {
          commitHookEffectListUnmount(Insertion | HasEffect, finishedWork, finishedWork.return);
          commitHookEffectListMount(Insertion | HasEffect, finishedWork); // Layout effects are destroyed during the mutation phase so that all
          // destroy functions for all fibers are called before any create functions.
          // This prevents sibling component effects from interfering with each other,
          // e.g. a destroy function in one component should never override a ref set
          // by a create function in another component during the same commit.

          if ( finishedWork.mode & ProfileMode) {
            try {
              startLayoutEffectTimer();
              commitHookEffectListUnmount(Layout | HasEffect, finishedWork, finishedWork.return);
            } finally {
              recordLayoutEffectDuration(finishedWork);
            }
          } else {
            commitHookEffectListUnmount(Layout | HasEffect, finishedWork, finishedWork.return);
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
          if (finishedWork.stateNode === null) {
            throw new Error('This should have a text node initialized. This error is likely ' + 'caused by a bug in React. Please file an issue.');
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
            if (current !== null) {
              var _prevRootState = current.memoizedState;

              if (_prevRootState.isDehydrated) {
                var _root = finishedWork.stateNode;
                commitHydratedContainer(_root.containerInfo);
              }
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
          commitSuspenseCallback(finishedWork);
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
    }

    throw new Error('This unit of work tag should not have side-effects. This error is ' + 'likely caused by a bug in React. Please file an issue.');
  }

  function commitSuspenseCallback(finishedWork) {
    // TODO: Move this to passive phase
    var newState = finishedWork.memoizedState;
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
          retryCache.add(wakeable);

          {
            if (isDevToolsPresent) {
              if (inProgressLanes !== null && inProgressRoot !== null) {
                // If we have pending work still, associate the original updaters with it.
                restorePendingUpdaters(inProgressRoot, inProgressLanes);
              } else {
                throw Error('Expected finished root and lanes to be set. This is a bug in React.');
              }
            }
          }

          wakeable.then(retry, retry);
        }
      });
    }
  } // This function detects when a Suspense boundary goes from visible to hidden.

  function commitResetTextContent(current) {

    resetTextContent(current.stateNode);
  }

  function commitMutationEffects(root, firstChild, committedLanes) {
    inProgressLanes = committedLanes;
    inProgressRoot = root;
    nextEffect = firstChild;
    commitMutationEffects_begin(root, committedLanes);
    inProgressLanes = null;
    inProgressRoot = null;
  }

  function commitMutationEffects_begin(root, lanes) {
    while (nextEffect !== null) {
      var fiber = nextEffect; // TODO: Should wrap this in flags check, too, as optimization

      var deletions = fiber.deletions;

      if (deletions !== null) {
        for (var i = 0; i < deletions.length; i++) {
          var childToDelete = deletions[i];

          try {
            commitDeletion(root, childToDelete, fiber);
          } catch (error) {
            reportUncaughtErrorInDEV(error);
            captureCommitPhaseError(childToDelete, fiber, error);
          }
        }
      }

      var child = fiber.child;

      if ((fiber.subtreeFlags & MutationMask) !== NoFlags && child !== null) {
        ensureCorrectReturnPointer(child, fiber);
        nextEffect = child;
      } else {
        commitMutationEffects_complete(root, lanes);
      }
    }
  }

  function commitMutationEffects_complete(root, lanes) {
    while (nextEffect !== null) {
      var fiber = nextEffect;
      setCurrentFiber(fiber);

      try {
        commitMutationEffectsOnFiber(fiber, root, lanes);
      } catch (error) {
        reportUncaughtErrorInDEV(error);
        captureCommitPhaseError(fiber, fiber.return, error);
      }

      resetCurrentFiber();
      var sibling = fiber.sibling;

      if (sibling !== null) {
        ensureCorrectReturnPointer(sibling, fiber.return);
        nextEffect = sibling;
        return;
      }

      nextEffect = fiber.return;
    }
  }

  function commitMutationEffectsOnFiber(finishedWork, root, lanes) {
    // TODO: The factoring of this phase could probably be improved. Consider
    // switching on the type of work before checking the flags. That's what
    // we do in all the other phases. I think this one is only different
    // because of the shared reconciliation logic below.
    var flags = finishedWork.flags;

    if (flags & ContentReset) {
      commitResetTextContent(finishedWork);
    }

    if (flags & Ref) {
      var current = finishedWork.alternate;

      if (current !== null) {
        commitDetachRef(current);
      }
    }

    if (flags & Visibility) {
      switch (finishedWork.tag) {
        case SuspenseComponent:
          {
            var newState = finishedWork.memoizedState;
            var isHidden = newState !== null;

            if (isHidden) {
              var _current = finishedWork.alternate;
              var wasHidden = _current !== null && _current.memoizedState !== null;

              if (!wasHidden) {
                // TODO: Move to passive phase
                markCommitTimeOfFallback();
              }
            }

            break;
          }

        case OffscreenComponent:
          {
            var _newState = finishedWork.memoizedState;

            var _isHidden = _newState !== null;

            var _current2 = finishedWork.alternate;

            var _wasHidden = _current2 !== null && _current2.memoizedState !== null;

            var offscreenBoundary = finishedWork;

            {
              // TODO: This needs to run whenever there's an insertion or update
              // inside a hidden Offscreen tree.
              hideOrUnhideAllChildren(offscreenBoundary, _isHidden);
            }

            {
              if (_isHidden) {
                if (!_wasHidden) {
                  if ((offscreenBoundary.mode & ConcurrentMode) !== NoMode) {
                    nextEffect = offscreenBoundary;
                    var offscreenChild = offscreenBoundary.child;

                    while (offscreenChild !== null) {
                      nextEffect = offscreenChild;
                      disappearLayoutEffects_begin(offscreenChild);
                      offscreenChild = offscreenChild.sibling;
                    }
                  }
                }
              }

              break;
            }
          }
      }
    } // The following switch statement is only concerned about placement,
    // updates, and deletions. To avoid needing to add a case for every possible
    // bitmap value, we remove the secondary effects from the effect tag and
    // switch on that value.


    var primaryFlags = flags & (Placement | Update | Hydrating);

     switch (primaryFlags) {
      case Placement:
        {
          commitPlacement(finishedWork); // Clear the "placement" from effect tag so that we know that this is
          // inserted, before any life-cycles like componentDidMount gets called.
          // TODO: findDOMNode doesn't rely on this any more but isMounted does
          // and isMounted is deprecated anyway so we should be able to kill this.

          finishedWork.flags &= ~Placement;
          break;
        }

      case PlacementAndUpdate:
        {
          // Placement
          commitPlacement(finishedWork); // Clear the "placement" from effect tag so that we know that this is
          // inserted, before any life-cycles like componentDidMount gets called.

          finishedWork.flags &= ~Placement; // Update

          var _current3 = finishedWork.alternate;
          commitWork(_current3, finishedWork);
          break;
        }

      case Hydrating:
        {
          finishedWork.flags &= ~Hydrating;
          break;
        }

      case HydratingAndUpdate:
        {
          finishedWork.flags &= ~Hydrating; // Update

          var _current4 = finishedWork.alternate;
          commitWork(_current4, finishedWork);
          break;
        }

      case Update:
        {
          var _current5 = finishedWork.alternate;
          commitWork(_current5, finishedWork);
          break;
        }
    }
  }

  function commitLayoutEffects(finishedWork, root, committedLanes) {
    inProgressLanes = committedLanes;
    inProgressRoot = root;
    nextEffect = finishedWork;
    commitLayoutEffects_begin(finishedWork, root, committedLanes);
    inProgressLanes = null;
    inProgressRoot = null;
  }

  function commitLayoutEffects_begin(subtreeRoot, root, committedLanes) {
    // Suspense layout effects semantics don't change for legacy roots.
    var isModernRoot = (subtreeRoot.mode & ConcurrentMode) !== NoMode;

    while (nextEffect !== null) {
      var fiber = nextEffect;
      var firstChild = fiber.child;

      if ( fiber.tag === OffscreenComponent && isModernRoot) {
        // Keep track of the current Offscreen stack's state.
        var isHidden = fiber.memoizedState !== null;
        var newOffscreenSubtreeIsHidden = isHidden || offscreenSubtreeIsHidden;

        if (newOffscreenSubtreeIsHidden) {
          // The Offscreen tree is hidden. Skip over its layout effects.
          commitLayoutMountEffects_complete(subtreeRoot, root, committedLanes);
          continue;
        } else {
          // TODO (Offscreen) Also check: subtreeFlags & LayoutMask
          var current = fiber.alternate;
          var wasHidden = current !== null && current.memoizedState !== null;
          var newOffscreenSubtreeWasHidden = wasHidden || offscreenSubtreeWasHidden;
          var prevOffscreenSubtreeIsHidden = offscreenSubtreeIsHidden;
          var prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden; // Traverse the Offscreen subtree with the current Offscreen as the root.

          offscreenSubtreeIsHidden = newOffscreenSubtreeIsHidden;
          offscreenSubtreeWasHidden = newOffscreenSubtreeWasHidden;

          if (offscreenSubtreeWasHidden && !prevOffscreenSubtreeWasHidden) {
            // This is the root of a reappearing boundary. Turn its layout effects
            // back on.
            nextEffect = fiber;
            reappearLayoutEffects_begin(fiber);
          }

          var child = firstChild;

          while (child !== null) {
            nextEffect = child;
            commitLayoutEffects_begin(child, // New root; bubble back up to here and stop.
            root, committedLanes);
            child = child.sibling;
          } // Restore Offscreen state and resume in our-progress traversal.


          nextEffect = fiber;
          offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden;
          offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
          commitLayoutMountEffects_complete(subtreeRoot, root, committedLanes);
          continue;
        }
      }

      if ((fiber.subtreeFlags & LayoutMask) !== NoFlags && firstChild !== null) {
        ensureCorrectReturnPointer(firstChild, fiber);
        nextEffect = firstChild;
      } else {
        commitLayoutMountEffects_complete(subtreeRoot, root, committedLanes);
      }
    }
  }

  function commitLayoutMountEffects_complete(subtreeRoot, root, committedLanes) {
    while (nextEffect !== null) {
      var fiber = nextEffect;

      if ((fiber.flags & LayoutMask) !== NoFlags) {
        var current = fiber.alternate;
        setCurrentFiber(fiber);

        try {
          commitLayoutEffectOnFiber(root, current, fiber, committedLanes);
        } catch (error) {
          reportUncaughtErrorInDEV(error);
          captureCommitPhaseError(fiber, fiber.return, error);
        }

        resetCurrentFiber();
      }

      if (fiber === subtreeRoot) {
        nextEffect = null;
        return;
      }

      var sibling = fiber.sibling;

      if (sibling !== null) {
        ensureCorrectReturnPointer(sibling, fiber.return);
        nextEffect = sibling;
        return;
      }

      nextEffect = fiber.return;
    }
  }

  function disappearLayoutEffects_begin(subtreeRoot) {
    while (nextEffect !== null) {
      var fiber = nextEffect;
      var firstChild = fiber.child; // TODO (Offscreen) Check: flags & (RefStatic | LayoutStatic)

      switch (fiber.tag) {
        case FunctionComponent:
        case ForwardRef:
        case MemoComponent:
        case SimpleMemoComponent:
          {
            if ( fiber.mode & ProfileMode) {
              try {
                startLayoutEffectTimer();
                commitHookEffectListUnmount(Layout, fiber, fiber.return);
              } finally {
                recordLayoutEffectDuration(fiber);
              }
            } else {
              commitHookEffectListUnmount(Layout, fiber, fiber.return);
            }

            break;
          }

        case ClassComponent:
          {
            // TODO (Offscreen) Check: flags & RefStatic
            safelyDetachRef(fiber, fiber.return);
            var instance = fiber.stateNode;

            if (typeof instance.componentWillUnmount === 'function') {
              safelyCallComponentWillUnmount(fiber, fiber.return, instance);
            }

            break;
          }

        case HostComponent:
          {
            safelyDetachRef(fiber, fiber.return);
            break;
          }

        case OffscreenComponent:
          {
            // Check if this is a
            var isHidden = fiber.memoizedState !== null;

            if (isHidden) {
              // Nested Offscreen tree is already hidden. Don't disappear
              // its effects.
              disappearLayoutEffects_complete(subtreeRoot);
              continue;
            }

            break;
          }
      } // TODO (Offscreen) Check: subtreeFlags & LayoutStatic


      if (firstChild !== null) {
        firstChild.return = fiber;
        nextEffect = firstChild;
      } else {
        disappearLayoutEffects_complete(subtreeRoot);
      }
    }
  }

  function disappearLayoutEffects_complete(subtreeRoot) {
    while (nextEffect !== null) {
      var fiber = nextEffect;

      if (fiber === subtreeRoot) {
        nextEffect = null;
        return;
      }

      var sibling = fiber.sibling;

      if (sibling !== null) {
        sibling.return = fiber.return;
        nextEffect = sibling;
        return;
      }

      nextEffect = fiber.return;
    }
  }

  function reappearLayoutEffects_begin(subtreeRoot) {
    while (nextEffect !== null) {
      var fiber = nextEffect;
      var firstChild = fiber.child;

      if (fiber.tag === OffscreenComponent) {
        var isHidden = fiber.memoizedState !== null;

        if (isHidden) {
          // Nested Offscreen tree is still hidden. Don't re-appear its effects.
          reappearLayoutEffects_complete(subtreeRoot);
          continue;
        }
      } // TODO (Offscreen) Check: subtreeFlags & LayoutStatic


      if (firstChild !== null) {
        // This node may have been reused from a previous render, so we can't
        // assume its return pointer is correct.
        firstChild.return = fiber;
        nextEffect = firstChild;
      } else {
        reappearLayoutEffects_complete(subtreeRoot);
      }
    }
  }

  function reappearLayoutEffects_complete(subtreeRoot) {
    while (nextEffect !== null) {
      var fiber = nextEffect; // TODO (Offscreen) Check: flags & LayoutStatic

      setCurrentFiber(fiber);

      try {
        reappearLayoutEffectsOnFiber(fiber);
      } catch (error) {
        reportUncaughtErrorInDEV(error);
        captureCommitPhaseError(fiber, fiber.return, error);
      }

      resetCurrentFiber();

      if (fiber === subtreeRoot) {
        nextEffect = null;
        return;
      }

      var sibling = fiber.sibling;

      if (sibling !== null) {
        // This node may have been reused from a previous render, so we can't
        // assume its return pointer is correct.
        sibling.return = fiber.return;
        nextEffect = sibling;
        return;
      }

      nextEffect = fiber.return;
    }
  }

  function commitPassiveMountEffects(root, finishedWork) {
    nextEffect = finishedWork;
    commitPassiveMountEffects_begin(finishedWork, root);
  }

  function commitPassiveMountEffects_begin(subtreeRoot, root) {
    while (nextEffect !== null) {
      var fiber = nextEffect;
      var firstChild = fiber.child;

      if ((fiber.subtreeFlags & PassiveMask) !== NoFlags && firstChild !== null) {
        ensureCorrectReturnPointer(firstChild, fiber);
        nextEffect = firstChild;
      } else {
        commitPassiveMountEffects_complete(subtreeRoot, root);
      }
    }
  }

  function commitPassiveMountEffects_complete(subtreeRoot, root) {
    while (nextEffect !== null) {
      var fiber = nextEffect;

      if ((fiber.flags & Passive) !== NoFlags) {
        setCurrentFiber(fiber);

        try {
          commitPassiveMountOnFiber(root, fiber);
        } catch (error) {
          reportUncaughtErrorInDEV(error);
          captureCommitPhaseError(fiber, fiber.return, error);
        }

        resetCurrentFiber();
      }

      if (fiber === subtreeRoot) {
        nextEffect = null;
        return;
      }

      var sibling = fiber.sibling;

      if (sibling !== null) {
        ensureCorrectReturnPointer(sibling, fiber.return);
        nextEffect = sibling;
        return;
      }

      nextEffect = fiber.return;
    }
  }

  function commitPassiveMountOnFiber(finishedRoot, finishedWork) {
    switch (finishedWork.tag) {
      case FunctionComponent:
      case ForwardRef:
      case SimpleMemoComponent:
        {
          if ( finishedWork.mode & ProfileMode) {
            startPassiveEffectTimer();

            try {
              commitHookEffectListMount(Passive$1 | HasEffect, finishedWork);
            } finally {
              recordPassiveEffectDuration(finishedWork);
            }
          } else {
            commitHookEffectListMount(Passive$1 | HasEffect, finishedWork);
          }

          break;
        }

      case HostRoot:
        {
          {
            var previousCache = null;

            if (finishedWork.alternate !== null) {
              previousCache = finishedWork.alternate.memoizedState.cache;
            }

            var nextCache = finishedWork.memoizedState.cache; // Retain/release the root cache.
            // Note that on initial mount, previousCache and nextCache will be the same
            // and this retain won't occur. To counter this, we instead retain the HostRoot's
            // initial cache when creating the root itself (see createFiberRoot() in
            // ReactFiberRoot.js). Subsequent updates that change the cache are reflected
            // here, such that previous/next caches are retained correctly.

            if (nextCache !== previousCache) {
              retainCache(nextCache);

              if (previousCache != null) {
                releaseCache(previousCache);
              }
            }
          }

          break;
        }

      case LegacyHiddenComponent:
      case OffscreenComponent:
        {
          {
            var _previousCache = null;

            if (finishedWork.alternate !== null && finishedWork.alternate.memoizedState !== null && finishedWork.alternate.memoizedState.cachePool !== null) {
              _previousCache = finishedWork.alternate.memoizedState.cachePool.pool;
            }

            var _nextCache = null;

            if (finishedWork.memoizedState !== null && finishedWork.memoizedState.cachePool !== null) {
              _nextCache = finishedWork.memoizedState.cachePool.pool;
            } // Retain/release the cache used for pending (suspended) nodes.
            // Note that this is only reached in the non-suspended/visible case:
            // when the content is suspended/hidden, the retain/release occurs
            // via the parent Suspense component (see case above).


            if (_nextCache !== _previousCache) {
              if (_nextCache != null) {
                retainCache(_nextCache);
              }

              if (_previousCache != null) {
                releaseCache(_previousCache);
              }
            }
          }

          break;
        }

      case CacheComponent:
        {
          {
            var _previousCache2 = null;

            if (finishedWork.alternate !== null) {
              _previousCache2 = finishedWork.alternate.memoizedState.cache;
            }

            var _nextCache2 = finishedWork.memoizedState.cache; // Retain/release the cache. In theory the cache component
            // could be "borrowing" a cache instance owned by some parent,
            // in which case we could avoid retaining/releasing. But it
            // is non-trivial to determine when that is the case, so we
            // always retain/release.

            if (_nextCache2 !== _previousCache2) {
              retainCache(_nextCache2);

              if (_previousCache2 != null) {
                releaseCache(_previousCache2);
              }
            }
          }

          break;
        }
    }
  }

  function commitPassiveUnmountEffects(firstChild) {
    nextEffect = firstChild;
    commitPassiveUnmountEffects_begin();
  }

  function commitPassiveUnmountEffects_begin() {
    while (nextEffect !== null) {
      var fiber = nextEffect;
      var child = fiber.child;

      if ((nextEffect.flags & ChildDeletion) !== NoFlags) {
        var deletions = fiber.deletions;

        if (deletions !== null) {
          for (var i = 0; i < deletions.length; i++) {
            var fiberToDelete = deletions[i];
            nextEffect = fiberToDelete;
            commitPassiveUnmountEffectsInsideOfDeletedTree_begin(fiberToDelete, fiber);
          }

          {
            // A fiber was deleted from this parent fiber, but it's still part of
            // the previous (alternate) parent fiber's list of children. Because
            // children are a linked list, an earlier sibling that's still alive
            // will be connected to the deleted fiber via its `alternate`:
            //
            //   live fiber
            //   --alternate--> previous live fiber
            //   --sibling--> deleted fiber
            //
            // We can't disconnect `alternate` on nodes that haven't been deleted
            // yet, but we can disconnect the `sibling` and `child` pointers.
            var previousFiber = fiber.alternate;

            if (previousFiber !== null) {
              var detachedChild = previousFiber.child;

              if (detachedChild !== null) {
                previousFiber.child = null;

                do {
                  var detachedSibling = detachedChild.sibling;
                  detachedChild.sibling = null;
                  detachedChild = detachedSibling;
                } while (detachedChild !== null);
              }
            }
          }

          nextEffect = fiber;
        }
      }

      if ((fiber.subtreeFlags & PassiveMask) !== NoFlags && child !== null) {
        ensureCorrectReturnPointer(child, fiber);
        nextEffect = child;
      } else {
        commitPassiveUnmountEffects_complete();
      }
    }
  }

  function commitPassiveUnmountEffects_complete() {
    while (nextEffect !== null) {
      var fiber = nextEffect;

      if ((fiber.flags & Passive) !== NoFlags) {
        setCurrentFiber(fiber);
        commitPassiveUnmountOnFiber(fiber);
        resetCurrentFiber();
      }

      var sibling = fiber.sibling;

      if (sibling !== null) {
        ensureCorrectReturnPointer(sibling, fiber.return);
        nextEffect = sibling;
        return;
      }

      nextEffect = fiber.return;
    }
  }

  function commitPassiveUnmountOnFiber(finishedWork) {
    switch (finishedWork.tag) {
      case FunctionComponent:
      case ForwardRef:
      case SimpleMemoComponent:
        {
          if ( finishedWork.mode & ProfileMode) {
            startPassiveEffectTimer();
            commitHookEffectListUnmount(Passive$1 | HasEffect, finishedWork, finishedWork.return);
            recordPassiveEffectDuration(finishedWork);
          } else {
            commitHookEffectListUnmount(Passive$1 | HasEffect, finishedWork, finishedWork.return);
          }

          break;
        }
    }
  }

  function commitPassiveUnmountEffectsInsideOfDeletedTree_begin(deletedSubtreeRoot, nearestMountedAncestor) {
    while (nextEffect !== null) {
      var fiber = nextEffect; // Deletion effects fire in parent -> child order
      // TODO: Check if fiber has a PassiveStatic flag

      setCurrentFiber(fiber);
      commitPassiveUnmountInsideDeletedTreeOnFiber(fiber, nearestMountedAncestor);
      resetCurrentFiber();
      var child = fiber.child; // TODO: Only traverse subtree if it has a PassiveStatic flag. (But, if we
      // do this, still need to handle `deletedTreeCleanUpLevel` correctly.)

      if (child !== null) {
        ensureCorrectReturnPointer(child, fiber);
        nextEffect = child;
      } else {
        commitPassiveUnmountEffectsInsideOfDeletedTree_complete(deletedSubtreeRoot);
      }
    }
  }

  function commitPassiveUnmountEffectsInsideOfDeletedTree_complete(deletedSubtreeRoot) {
    while (nextEffect !== null) {
      var fiber = nextEffect;
      var sibling = fiber.sibling;
      var returnFiber = fiber.return;

      {
        // Recursively traverse the entire deleted tree and clean up fiber fields.
        // This is more aggressive than ideal, and the long term goal is to only
        // have to detach the deleted tree at the root.
        detachFiberAfterEffects(fiber);

        if (fiber === deletedSubtreeRoot) {
          nextEffect = null;
          return;
        }
      }

      if (sibling !== null) {
        ensureCorrectReturnPointer(sibling, returnFiber);
        nextEffect = sibling;
        return;
      }

      nextEffect = returnFiber;
    }
  }

  function commitPassiveUnmountInsideDeletedTreeOnFiber(current, nearestMountedAncestor) {
    switch (current.tag) {
      case FunctionComponent:
      case ForwardRef:
      case SimpleMemoComponent:
        {
          if ( current.mode & ProfileMode) {
            startPassiveEffectTimer();
            commitHookEffectListUnmount(Passive$1, current, nearestMountedAncestor);
            recordPassiveEffectDuration(current);
          } else {
            commitHookEffectListUnmount(Passive$1, current, nearestMountedAncestor);
          }

          break;
        }
      // TODO: run passive unmount effects when unmounting a root.
      // Because passive unmount effects are not currently run,
      // the cache instance owned by the root will never be freed.
      // When effects are run, the cache should be freed here:
      // case HostRoot: {
      //   if (enableCache) {
      //     const cache = current.memoizedState.cache;
      //     releaseCache(cache);
      //   }
      //   break;
      // }

      case LegacyHiddenComponent:
      case OffscreenComponent:
        {
          {
            if (current.memoizedState !== null && current.memoizedState.cachePool !== null) {
              var cache = current.memoizedState.cachePool.pool; // Retain/release the cache used for pending (suspended) nodes.
              // Note that this is only reached in the non-suspended/visible case:
              // when the content is suspended/hidden, the retain/release occurs
              // via the parent Suspense component (see case above).

              if (cache != null) {
                retainCache(cache);
              }
            }
          }

          break;
        }

      case CacheComponent:
        {
          {
            var _cache = current.memoizedState.cache;
            releaseCache(_cache);
          }

          break;
        }
    }
  }

  var didWarnWrongReturnPointer = false;

  function ensureCorrectReturnPointer(fiber, expectedReturnFiber) {
    {
      if (!didWarnWrongReturnPointer && fiber.return !== expectedReturnFiber) {
        didWarnWrongReturnPointer = true;

        error('Internal React error: Return pointer is inconsistent ' + 'with parent.');
      }
    } // TODO: Remove this assignment once we're confident that it won't break
    // anything, by checking the warning logs for the above invariant


    fiber.return = expectedReturnFiber;
  } // TODO: Reuse reappearLayoutEffects traversal here?


  function invokeLayoutEffectMountInDEV(fiber) {
    {
      // We don't need to re-check StrictEffectsMode here.
      // This function is only called if that check has already passed.
      switch (fiber.tag) {
        case FunctionComponent:
        case ForwardRef:
        case SimpleMemoComponent:
          {
            try {
              commitHookEffectListMount(Layout | HasEffect, fiber);
            } catch (error) {
              reportUncaughtErrorInDEV(error);
              captureCommitPhaseError(fiber, fiber.return, error);
            }

            break;
          }

        case ClassComponent:
          {
            var instance = fiber.stateNode;

            try {
              instance.componentDidMount();
            } catch (error) {
              reportUncaughtErrorInDEV(error);
              captureCommitPhaseError(fiber, fiber.return, error);
            }

            break;
          }
      }
    }
  }

  function invokePassiveEffectMountInDEV(fiber) {
    {
      // We don't need to re-check StrictEffectsMode here.
      // This function is only called if that check has already passed.
      switch (fiber.tag) {
        case FunctionComponent:
        case ForwardRef:
        case SimpleMemoComponent:
          {
            try {
              commitHookEffectListMount(Passive$1 | HasEffect, fiber);
            } catch (error) {
              reportUncaughtErrorInDEV(error);
              captureCommitPhaseError(fiber, fiber.return, error);
            }

            break;
          }
      }
    }
  }

  function invokeLayoutEffectUnmountInDEV(fiber) {
    {
      // We don't need to re-check StrictEffectsMode here.
      // This function is only called if that check has already passed.
      switch (fiber.tag) {
        case FunctionComponent:
        case ForwardRef:
        case SimpleMemoComponent:
          {
            try {
              commitHookEffectListUnmount(Layout | HasEffect, fiber, fiber.return);
            } catch (error) {
              reportUncaughtErrorInDEV(error);
              captureCommitPhaseError(fiber, fiber.return, error);
            }

            break;
          }

        case ClassComponent:
          {
            var instance = fiber.stateNode;

            if (typeof instance.componentWillUnmount === 'function') {
              safelyCallComponentWillUnmount(fiber, fiber.return, instance);
            }

            break;
          }
      }
    }
  }

  function invokePassiveEffectUnmountInDEV(fiber) {
    {
      // We don't need to re-check StrictEffectsMode here.
      // This function is only called if that check has already passed.
      switch (fiber.tag) {
        case FunctionComponent:
        case ForwardRef:
        case SimpleMemoComponent:
          {
            try {
              commitHookEffectListUnmount(Passive$1 | HasEffect, fiber, fiber.return);
            } catch (error) {
              reportUncaughtErrorInDEV(error);
              captureCommitPhaseError(fiber, fiber.return, error);
            }
          }
      }
    }
  }