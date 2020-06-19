
  function unwindWork(workInProgress, renderExpirationTime) {
    switch (workInProgress.tag) {
      case ClassComponent:
        {
          var Component = workInProgress.type;

          if (isContextProvider(Component)) {
            popContext(workInProgress);
          }

          var effectTag = workInProgress.effectTag;

          if (effectTag & ShouldCapture) {
            workInProgress.effectTag = effectTag & ~ShouldCapture | DidCapture;
            return workInProgress;
          }

          return null;
        }

      case HostRoot:
        {
          popHostContainer(workInProgress);
          popTopLevelContextObject(workInProgress);
          var _effectTag = workInProgress.effectTag;

          if (!((_effectTag & DidCapture) === NoEffect)) {
            {
              throw Error( "The root failed to unmount after an error. This is likely a bug in React. Please file an issue." );
            }
          }

          workInProgress.effectTag = _effectTag & ~ShouldCapture | DidCapture;
          return workInProgress;
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

          {
            var suspenseState = workInProgress.memoizedState;

            if (suspenseState !== null && suspenseState.dehydrated !== null) {
              if (!(workInProgress.alternate !== null)) {
                {
                  throw Error( "Threw in newly mounted dehydrated component. This is likely a bug in React. Please file an issue." );
                }
              }

              resetHydrationState();
            }
          }

          var _effectTag2 = workInProgress.effectTag;

          if (_effectTag2 & ShouldCapture) {
            workInProgress.effectTag = _effectTag2 & ~ShouldCapture | DidCapture; // Captured a suspense effect. Re-render the boundary.

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
        popProvider(workInProgress);
        return null;

      default:
        return null;
    }
  }

  function unwindInterruptedWork(interruptedWork) {
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
          popHostContainer(interruptedWork);
          popTopLevelContextObject(interruptedWork);
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
        popProvider(interruptedWork);
        break;
    }
  }