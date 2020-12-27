
  function ReactDOMRoot(container, options) {
    this._internalRoot = createRootImpl(container, ConcurrentRoot, options);
  }

  function ReactDOMBlockingRoot(container, tag, options) {
    this._internalRoot = createRootImpl(container, tag, options);
  }

  ReactDOMRoot.prototype.render = ReactDOMBlockingRoot.prototype.render = function (children) {
    var root = this._internalRoot;

    {
      if (typeof arguments[1] === 'function') {
        error('render(...): does not support the second callback argument. ' + 'To execute a side effect after rendering, declare it in a component body with useEffect().');
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

  ReactDOMRoot.prototype.unmount = ReactDOMBlockingRoot.prototype.unmount = function () {
    {
      if (typeof arguments[0] === 'function') {
        error('unmount(...): does not support a callback argument. ' + 'To execute a side effect after rendering, declare it in a component body with useEffect().');
      }
    }

    var root = this._internalRoot;
    var container = root.containerInfo;
    updateContainer(null, root, null, function () {
      unmarkContainerAsRoot(container);
    });
  };

  function createRootImpl(container, tag, options) {
    // Tag is either LegacyRoot or Concurrent Root
    var hydrate = options != null && options.hydrate === true;
    var hydrationCallbacks = options != null && options.hydrationOptions || null;
    var mutableSources = options != null && options.hydrationOptions != null && options.hydrationOptions.mutableSources || null;
    var root = createContainer(container, tag, hydrate);
    markContainerAsRoot(root.current, container);
    var containerNodeType = container.nodeType;

    {
      var rootContainerElement = container.nodeType === COMMENT_NODE ? container.parentNode : container;
      listenToAllSupportedEvents(rootContainerElement);
    }

    if (mutableSources) {
      for (var i = 0; i < mutableSources.length; i++) {
        var mutableSource = mutableSources[i];
        registerMutableSourceForHydration(root, mutableSource);
      }
    }

    return root;
  }

  function createRoot(container, options) {
    if (!isValidContainer(container)) {
      {
        throw Error( "createRoot(...): Target container is not a DOM element." );
      }
    }

    warnIfReactDOMContainerInDEV(container);
    return new ReactDOMRoot(container, options);
  }
  function createBlockingRoot(container, options) {
    if (!isValidContainer(container)) {
      {
        throw Error( "createRoot(...): Target container is not a DOM element." );
      }
    }

    warnIfReactDOMContainerInDEV(container);
    return new ReactDOMBlockingRoot(container, BlockingRoot, options);
  }
  function createLegacyRoot(container, options) {
    return new ReactDOMBlockingRoot(container, LegacyRoot, options);
  }
  function isValidContainer(node) {
    return !!(node && (node.nodeType === ELEMENT_NODE || node.nodeType === DOCUMENT_NODE || node.nodeType === DOCUMENT_FRAGMENT_NODE || node.nodeType === COMMENT_NODE && node.nodeValue === ' react-mount-point-unstable '));
  }

  function warnIfReactDOMContainerInDEV(container) {
    {
      if (container.nodeType === ELEMENT_NODE && container.tagName && container.tagName.toUpperCase() === 'BODY') {
        error('createRoot(): Creating roots directly with document.body is ' + 'discouraged, since its children are often manipulated by third-party ' + 'scripts and browser extensions. This may lead to subtle ' + 'reconciliation issues. Try using a container element created ' + 'for your app.');
      }

      if (isContainerMarkedAsRoot(container)) {
        if (container._reactRootContainer) {
          error('You are calling ReactDOM.createRoot() on a container that was previously ' + 'passed to ReactDOM.render(). This is not supported.');
        } else {
          error('You are calling ReactDOM.createRoot() on a container that ' + 'has already been passed to createRoot() before. Instead, call ' + 'root.render() on the existing root instead if you want to update it.');
        }
      }
    }
  }