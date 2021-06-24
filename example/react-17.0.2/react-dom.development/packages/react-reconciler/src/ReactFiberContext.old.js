  var warnedAboutMissingGetChildContext;

  {
    warnedAboutMissingGetChildContext = {};
  }

  var emptyContextObject = {};

  {
    Object.freeze(emptyContextObject);
  } // A cursor to the current merged context object on the stack.


  var contextStackCursor = createCursor(emptyContextObject); // A cursor to a boolean indicating whether the context has changed.

  var didPerformWorkStackCursor = createCursor(false); // Keep track of the previous context object that was on the stack.
  // We use this to get access to the parent context after we have already
  // pushed the next context provider, and now need to merge their contexts.

  var previousContext = emptyContextObject;

  function getUnmaskedContext(workInProgress, Component, didPushOwnContextIfProvider) {
    {
      if (didPushOwnContextIfProvider && isContextProvider(Component)) {
        // If the fiber is a context provider itself, when we read its context
        // we may have already pushed its own child context on the stack. A context
        // provider should not "see" its own child context. Therefore we read the
        // previous (parent) context instead for a context provider.
        return previousContext;
      }

      return contextStackCursor.current;
    }
  }

  function cacheContext(workInProgress, unmaskedContext, maskedContext) {
    {
      var instance = workInProgress.stateNode;
      instance.__reactInternalMemoizedUnmaskedChildContext = unmaskedContext;
      instance.__reactInternalMemoizedMaskedChildContext = maskedContext;
    }
  }

  function getMaskedContext(workInProgress, unmaskedContext) {
    {
      var type = workInProgress.type;
      var contextTypes = type.contextTypes;

      if (!contextTypes) {
        return emptyContextObject;
      } // Avoid recreating masked context unless unmasked context has changed.
      // Failing to do this will result in unnecessary calls to componentWillReceiveProps.
      // This may trigger infinite loops if componentWillReceiveProps calls setState.


      var instance = workInProgress.stateNode;

      if (instance && instance.__reactInternalMemoizedUnmaskedChildContext === unmaskedContext) {
        return instance.__reactInternalMemoizedMaskedChildContext;
      }

      var context = {};

      for (var key in contextTypes) {
        context[key] = unmaskedContext[key];
      }

      {
        var name = getComponentName(type) || 'Unknown';
        checkPropTypes(contextTypes, context, 'context', name);
      } // Cache unmasked context so we can avoid recreating masked context unless necessary.
      // Context is created before the class component is instantiated so check for instance.


      if (instance) {
        cacheContext(workInProgress, unmaskedContext, context);
      }

      return context;
    }
  }

  function hasContextChanged() {
    {
      return didPerformWorkStackCursor.current;
    }
  }

  function isContextProvider(type) {
    {
      var childContextTypes = type.childContextTypes;
      return childContextTypes !== null && childContextTypes !== undefined;
    }
  }

  function popContext(fiber) {
    {
      pop(didPerformWorkStackCursor, fiber);
      pop(contextStackCursor, fiber);
    }
  }

  function popTopLevelContextObject(fiber) {
    {
      pop(didPerformWorkStackCursor, fiber);
      pop(contextStackCursor, fiber);
    }
  }

  function pushTopLevelContextObject(fiber, context, didChange) {
    {
      if (!(contextStackCursor.current === emptyContextObject)) {
        {
          throw Error( "Unexpected context found on stack. This error is likely caused by a bug in React. Please file an issue." );
        }
      }

      push(contextStackCursor, context, fiber);
      push(didPerformWorkStackCursor, didChange, fiber);
    }
  }

  function processChildContext(fiber, type, parentContext) {
    {
      var instance = fiber.stateNode;
      var childContextTypes = type.childContextTypes; // TODO (bvaughn) Replace this behavior with an invariant() in the future.
      // It has only been added in Fiber to match the (unintentional) behavior in Stack.

      if (typeof instance.getChildContext !== 'function') {
        {
          var componentName = getComponentName(type) || 'Unknown';

          if (!warnedAboutMissingGetChildContext[componentName]) {
            warnedAboutMissingGetChildContext[componentName] = true;

            error('%s.childContextTypes is specified but there is no getChildContext() method ' + 'on the instance. You can either define getChildContext() on %s or remove ' + 'childContextTypes from it.', componentName, componentName);
          }
        }

        return parentContext;
      }

      var childContext = instance.getChildContext();

      for (var contextKey in childContext) {
        if (!(contextKey in childContextTypes)) {
          {
            throw Error( (getComponentName(type) || 'Unknown') + ".getChildContext(): key \"" + contextKey + "\" is not defined in childContextTypes." );
          }
        }
      }

      {
        var name = getComponentName(type) || 'Unknown';
        checkPropTypes(childContextTypes, childContext, 'child context', name);
      }

      return _assign({}, parentContext, childContext);
    }
  }

  function pushContextProvider(workInProgress) {
    {
      var instance = workInProgress.stateNode; // We push the context as early as possible to ensure stack integrity.
      // If the instance does not exist yet, we will push null at first,
      // and replace it on the stack later when invalidating the context.

      var memoizedMergedChildContext = instance && instance.__reactInternalMemoizedMergedChildContext || emptyContextObject; // Remember the parent context so we can merge with it later.
      // Inherit the parent's did-perform-work value to avoid inadvertently blocking updates.

      previousContext = contextStackCursor.current;
      push(contextStackCursor, memoizedMergedChildContext, workInProgress);
      push(didPerformWorkStackCursor, didPerformWorkStackCursor.current, workInProgress);
      return true;
    }
  }

  function invalidateContextProvider(workInProgress, type, didChange) {
    {
      var instance = workInProgress.stateNode;

      if (!instance) {
        {
          throw Error( "Expected to have an instance by this point. This error is likely caused by a bug in React. Please file an issue." );
        }
      }

      if (didChange) {
        // Merge parent and own context.
        // Skip this if we're not updating due to sCU.
        // This avoids unnecessarily recomputing memoized values.
        var mergedContext = processChildContext(workInProgress, type, previousContext);
        instance.__reactInternalMemoizedMergedChildContext = mergedContext; // Replace the old (or empty) context with the new one.
        // It is important to unwind the context in the reverse order.

        pop(didPerformWorkStackCursor, workInProgress);
        pop(contextStackCursor, workInProgress); // Now push the new context and mark that it has changed.

        push(contextStackCursor, mergedContext, workInProgress);
        push(didPerformWorkStackCursor, didChange, workInProgress);
      } else {
        pop(didPerformWorkStackCursor, workInProgress);
        push(didPerformWorkStackCursor, didChange, workInProgress);
      }
    }
  }

  function findCurrentUnmaskedContext(fiber) {
    {
      // Currently this is only used with renderSubtreeIntoContainer; not sure if it
      // makes sense elsewhere
      if (!(isFiberMounted(fiber) && fiber.tag === ClassComponent)) {
        {
          throw Error( "Expected subtree parent to be a mounted class component. This error is likely caused by a bug in React. Please file an issue." );
        }
      }

      var node = fiber;

      do {
        switch (node.tag) {
          case HostRoot:
            return node.stateNode.context;

          case ClassComponent:
            {
              var Component = node.type;

              if (isContextProvider(Component)) {
                return node.stateNode.__reactInternalMemoizedMergedChildContext;
              }

              break;
            }
        }

        node = node.return;
      } while (node !== null);

      {
        {
          throw Error( "Found unexpected detached subtree parent. This error is likely caused by a bug in React. Please file an issue." );
        }
      }
    }
  }