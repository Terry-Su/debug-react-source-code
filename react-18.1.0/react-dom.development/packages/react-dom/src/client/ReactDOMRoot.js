  /* global reportError */

  var defaultOnRecoverableError = typeof reportError === 'function' ? // In modern browsers, reportError will dispatch an error event,
  // emulating an uncaught JavaScript error.
  reportError : function (error) {
    // In older browsers and test environments, fallback to console.error.
    // eslint-disable-next-line react-internal/no-production-logging
    console['error'](error);
  };

  function ReactDOMRoot(internalRoot) {
    this._internalRoot = internalRoot;
  }

  ReactDOMHydrationRoot.prototype.render = ReactDOMRoot.prototype.render = function (children) {
    var root = this._internalRoot;

    if (root === null) {
      throw new Error('Cannot update an unmounted root.');
    }

    {
      if (typeof arguments[1] === 'function') {
        error('render(...): does not support the second callback argument. ' + 'To execute a side effect after rendering, declare it in a component body with useEffect().');
      } else if (isValidContainer(arguments[1])) {
        error('You passed a container to the second argument of root.render(...). ' + "You don't need to pass it again since you already passed it to create the root.");
      } else if (typeof arguments[1] !== 'undefined') {
        error('You passed a second argument to root.render(...) but it only accepts ' + 'one argument.');
      }

      var container = root.containerInfo;

      if (container.nodeType !== COMMENT_NODE) {
        var hostInstance = findHostInstanceWithNoPortals(root.current);

        if (hostInstance) {
          if (hostInstance.parentNode !== container) {
            error('render(...): It looks like the React-rendered content of the ' + 'root container was removed without using React. This is not ' + 'supported and will cause errors. Instead, call ' + "root.unmount() to empty a root's container.");
          }
        }
      }
    }

    updateContainer(children, root, null, null);
  };

  ReactDOMHydrationRoot.prototype.unmount = ReactDOMRoot.prototype.unmount = function () {
    {
      if (typeof arguments[0] === 'function') {
        error('unmount(...): does not support a callback argument. ' + 'To execute a side effect after rendering, declare it in a component body with useEffect().');
      }
    }

    var root = this._internalRoot;

    if (root !== null) {
      this._internalRoot = null;
      var container = root.containerInfo;

      {
        if (isAlreadyRendering()) {
          error('Attempted to synchronously unmount a root while React was already ' + 'rendering. React cannot finish unmounting the root until the ' + 'current render has completed, which may lead to a race condition.');
        }
      }

      flushSync(function () {
        updateContainer(null, root, null, null);
      });
      unmarkContainerAsRoot(container);
    }
  };

  function createRoot(container, options) {
    if (!isValidContainer(container)) {
      throw new Error('createRoot(...): Target container is not a DOM element.');
    }

    warnIfReactDOMContainerInDEV(container);
    var isStrictMode = false;
    var concurrentUpdatesByDefaultOverride = false;
    var identifierPrefix = '';
    var onRecoverableError = defaultOnRecoverableError;
    var transitionCallbacks = null;

    if (options !== null && options !== undefined) {
      {
        if (options.hydrate) {
          warn('hydrate through createRoot is deprecated. Use ReactDOMClient.hydrateRoot(container, <App />) instead.');
        } else {
          if (typeof options === 'object' && options !== null && options.$$typeof === REACT_ELEMENT_TYPE) {
            error('You passed a JSX element to createRoot. You probably meant to ' + 'call root.render instead. ' + 'Example usage:\n\n' + '  let root = createRoot(domContainer);\n' + '  root.render(<App />);');
          }
        }
      }

      if (options.unstable_strictMode === true) {
        isStrictMode = true;
      }

      if (options.identifierPrefix !== undefined) {
        identifierPrefix = options.identifierPrefix;
      }

      if (options.onRecoverableError !== undefined) {
        onRecoverableError = options.onRecoverableError;
      }

      if (options.transitionCallbacks !== undefined) {
        transitionCallbacks = options.transitionCallbacks;
      }
    }

    var root = createContainer(container, ConcurrentRoot, null, isStrictMode, concurrentUpdatesByDefaultOverride, identifierPrefix, onRecoverableError);
    markContainerAsRoot(root.current, container);
    var rootContainerElement = container.nodeType === COMMENT_NODE ? container.parentNode : container;
    listenToAllSupportedEvents(rootContainerElement);
    return new ReactDOMRoot(root);
  }

  function ReactDOMHydrationRoot(internalRoot) {
    this._internalRoot = internalRoot;
  }

  function scheduleHydration(target) {
    if (target) {
      queueExplicitHydrationTarget(target);
    }
  }

  ReactDOMHydrationRoot.prototype.unstable_scheduleHydration = scheduleHydration;
  function hydrateRoot(container, initialChildren, options) {
    if (!isValidContainer(container)) {
      throw new Error('hydrateRoot(...): Target container is not a DOM element.');
    }

    warnIfReactDOMContainerInDEV(container);

    {
      if (initialChildren === undefined) {
        error('Must provide initial children as second argument to hydrateRoot. ' + 'Example usage: hydrateRoot(domContainer, <App />)');
      }
    } // For now we reuse the whole bag of options since they contain
    // the hydration callbacks.


    var hydrationCallbacks = options != null ? options : null; // TODO: Delete this option

    var mutableSources = options != null && options.hydratedSources || null;
    var isStrictMode = false;
    var concurrentUpdatesByDefaultOverride = false;
    var identifierPrefix = '';
    var onRecoverableError = defaultOnRecoverableError;

    if (options !== null && options !== undefined) {
      if (options.unstable_strictMode === true) {
        isStrictMode = true;
      }

      if (options.identifierPrefix !== undefined) {
        identifierPrefix = options.identifierPrefix;
      }

      if (options.onRecoverableError !== undefined) {
        onRecoverableError = options.onRecoverableError;
      }
    }

    var root = createHydrationContainer(initialChildren, null, container, ConcurrentRoot, hydrationCallbacks, isStrictMode, concurrentUpdatesByDefaultOverride, identifierPrefix, onRecoverableError);
    markContainerAsRoot(root.current, container); // This can't be a comment node since hydration doesn't work on comment nodes anyway.

    listenToAllSupportedEvents(container);

    if (mutableSources) {
      for (var i = 0; i < mutableSources.length; i++) {
        var mutableSource = mutableSources[i];
        registerMutableSourceForHydration(root, mutableSource);
      }
    }

    return new ReactDOMHydrationRoot(root);
  }
  function isValidContainer(node) {
    return !!(node && (node.nodeType === ELEMENT_NODE || node.nodeType === DOCUMENT_NODE || node.nodeType === DOCUMENT_FRAGMENT_NODE || !disableCommentsAsDOMContainers  ));
  } // TODO: Remove this function which also includes comment nodes.
  // We only use it in places that are currently more relaxed.

  function isValidContainerLegacy(node) {
    return !!(node && (node.nodeType === ELEMENT_NODE || node.nodeType === DOCUMENT_NODE || node.nodeType === DOCUMENT_FRAGMENT_NODE || node.nodeType === COMMENT_NODE && node.nodeValue === ' react-mount-point-unstable '));
  }

  function warnIfReactDOMContainerInDEV(container) {
    {
      if (container.nodeType === ELEMENT_NODE && container.tagName && container.tagName.toUpperCase() === 'BODY') {
        error('createRoot(): Creating roots directly with document.body is ' + 'discouraged, since its children are often manipulated by third-party ' + 'scripts and browser extensions. This may lead to subtle ' + 'reconciliation issues. Try using a container element created ' + 'for your app.');
      }

      if (isContainerMarkedAsRoot(container)) {
        if (container._reactRootContainer) {
          error('You are calling ReactDOMClient.createRoot() on a container that was previously ' + 'passed to ReactDOM.render(). This is not supported.');
        } else {
          error('You are calling ReactDOMClient.createRoot() on a container that ' + 'has already been passed to createRoot() before. Instead, call ' + 'root.render() on the existing root instead if you want to update it.');
        }
      }
    }
  }