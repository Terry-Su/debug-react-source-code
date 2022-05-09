
  function unwindWork(current, workInProgress, renderLanes) {
    // Note: This intentionally doesn't check if we're hydrating because comparing
    // to the current tree provider fiber is just as fast and less error-prone.
    // Ideally we would have a special version of the work loop only
    // for hydration.
    popTreeContext(workInProgress);

    switch (workInProgress.tag) {
      case ClassComponent:
        {
          var Component = workInProgress.type;

          if (isContextProvider(Component)) {
            popContext(workInProgress);
          }

          var flags = workInProgress.flags;

          if (flags & ShouldCapture) {
            workInProgress.flags = flags & ~ShouldCapture | DidCapture;

            if ( (workInProgress.mode & ProfileMode) !== NoMode) {
              transferActualDuration(workInProgress);
            }

            return workInProgress;
          }

          return null;
        }

      case HostRoot:
        {
          var root = workInProgress.stateNode;

          {
            var cache = workInProgress.memoizedState.cache;
            popCacheProvider(workInProgress);
          }
          popHostContainer(workInProgress);
          popTopLevelContextObject(workInProgress);
          resetWorkInProgressVersions();
          var _flags = workInProgress.flags;

          if ((_flags & ShouldCapture) !== NoFlags && (_flags & DidCapture) === NoFlags) {
            // There was an error during render that wasn't captured by a suspense
            // boundary. Do a second pass on the root to unmount the children.
            workInProgress.flags = _flags & ~ShouldCapture | DidCapture;
            return workInProgress;
          } // We unwound to the root without completing it. Exit.


          return null;
        }

      case HostComponent:
        {
          // TODO: popHydrationState
          popHostContext(workInProgress);
          return null;
        }

      case SuspenseComponent:
        {
          popSuspenseContext(workInProgress);
          var suspenseState = workInProgress.memoizedState;

          if (suspenseState !== null && suspenseState.dehydrated !== null) {
            if (workInProgress.alternate === null) {
              throw new Error('Threw in newly mounted dehydrated component. This is likely a bug in ' + 'React. Please file an issue.');
            }

            resetHydrationState();
          }

          var _flags2 = workInProgress.flags;

          if (_flags2 & ShouldCapture) {
            workInProgress.flags = _flags2 & ~ShouldCapture | DidCapture; // Captured a suspense effect. Re-render the boundary.

            if ( (workInProgress.mode & ProfileMode) !== NoMode) {
              transferActualDuration(workInProgress);
            }

            return workInProgress;
          }

          return null;
        }

      case SuspenseListComponent:
        {
          popSuspenseContext(workInProgress); // SuspenseList doesn't actually catch anything. It should've been
          // caught by a nested boundary. If not, it should bubble through.

          return null;
        }

      case HostPortal:
        popHostContainer(workInProgress);
        return null;

      case ContextProvider:
        var context = workInProgress.type._context;
        popProvider(context, workInProgress);
        return null;

      case OffscreenComponent:
      case LegacyHiddenComponent:
        popRenderLanes(workInProgress);
        popTransition(workInProgress, current);
        return null;

      case CacheComponent:
        {
          var _cache = workInProgress.memoizedState.cache;
          popCacheProvider(workInProgress);
        }

        return null;

      default:
        return null;
    }
  }

  function unwindInterruptedWork(current, interruptedWork, renderLanes) {
    // Note: This intentionally doesn't check if we're hydrating because comparing
    // to the current tree provider fiber is just as fast and less error-prone.
    // Ideally we would have a special version of the work loop only
    // for hydration.
    popTreeContext(interruptedWork);

    switch (interruptedWork.tag) {
      case ClassComponent:
        {
          var childContextTypes = interruptedWork.type.childContextTypes;

          if (childContextTypes !== null && childContextTypes !== undefined) {
            popContext(interruptedWork);
          }

          break;
        }

      case HostRoot:
        {
          var root = interruptedWork.stateNode;

          {
            var cache = interruptedWork.memoizedState.cache;
            popCacheProvider(interruptedWork);
          }
          popHostContainer(interruptedWork);
          popTopLevelContextObject(interruptedWork);
          resetWorkInProgressVersions();
          break;
        }

      case HostComponent:
        {
          popHostContext(interruptedWork);
          break;
        }

      case HostPortal:
        popHostContainer(interruptedWork);
        break;

      case SuspenseComponent:
        popSuspenseContext(interruptedWork);
        break;

      case SuspenseListComponent:
        popSuspenseContext(interruptedWork);
        break;

      case ContextProvider:
        var context = interruptedWork.type._context;
        popProvider(context, interruptedWork);
        break;

      case OffscreenComponent:
      case LegacyHiddenComponent:
        popRenderLanes(interruptedWork);
        popTransition(interruptedWork, current);
        break;

      case CacheComponent:
        {
          var _cache2 = interruptedWork.memoizedState.cache;
          popCacheProvider(interruptedWork);
        }

        break;
    }
  }