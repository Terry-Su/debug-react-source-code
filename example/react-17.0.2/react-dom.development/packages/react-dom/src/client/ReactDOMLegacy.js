  var ReactCurrentOwner$3 = ReactSharedInternals.ReactCurrentOwner;
  var topLevelUpdateWarnings;
  var warnedAboutHydrateAPI = false;

  {
    topLevelUpdateWarnings = function (container) {
      if (container._reactRootContainer && container.nodeType !== COMMENT_NODE) {
        var hostInstance = findHostInstanceWithNoPortals(container._reactRootContainer._internalRoot.current);

        if (hostInstance) {
          if (hostInstance.parentNode !== container) {
            error('render(...): It looks like the React-rendered content of this ' + 'container was removed without using React. This is not ' + 'supported and will cause errors. Instead, call ' + 'ReactDOM.unmountComponentAtNode to empty a container.');
          }
        }
      }

      var isRootRenderedBySomeReact = !!container._reactRootContainer;
      var rootEl = getReactRootElementInContainer(container);
      var hasNonRootReactChild = !!(rootEl && getInstanceFromNode(rootEl));

      if (hasNonRootReactChild && !isRootRenderedBySomeReact) {
        error('render(...): Replacing React-rendered children with a new root ' + 'component. If you intended to update the children of this node, ' + 'you should instead have the existing children update their state ' + 'and render the new components instead of calling ReactDOM.render.');
      }

      if (container.nodeType === ELEMENT_NODE && container.tagName && container.tagName.toUpperCase() === 'BODY') {
        error('render(): Rendering components directly into document.body is ' + 'discouraged, since its children are often manipulated by third-party ' + 'scripts and browser extensions. This may lead to subtle ' + 'reconciliation issues. Try rendering into a container element created ' + 'for your app.');
      }
    };
  }

  function getReactRootElementInContainer(container) {
    if (!container) {
      return null;
    }

    if (container.nodeType === DOCUMENT_NODE) {
      return container.documentElement;
    } else {
      return container.firstChild;
    }
  }

  function shouldHydrateDueToLegacyHeuristic(container) {
    var rootElement = getReactRootElementInContainer(container);
    return !!(rootElement && rootElement.nodeType === ELEMENT_NODE && rootElement.hasAttribute(ROOT_ATTRIBUTE_NAME));
  }

  function legacyCreateRootFromDOMContainer(container, forceHydrate) {
    var shouldHydrate = forceHydrate || shouldHydrateDueToLegacyHeuristic(container); // First clear any existing content.

    if (!shouldHydrate) {
      var warned = false;
      var rootSibling;

      while (rootSibling = container.lastChild) {
        {
          if (!warned && rootSibling.nodeType === ELEMENT_NODE && rootSibling.hasAttribute(ROOT_ATTRIBUTE_NAME)) {
            warned = true;

            error('render(): Target node has markup rendered by React, but there ' + 'are unrelated nodes as well. This is most commonly caused by ' + 'white-space inserted around server-rendered markup.');
          }
        }

        container.removeChild(rootSibling);
      }
    }

    {
      if (shouldHydrate && !forceHydrate && !warnedAboutHydrateAPI) {
        warnedAboutHydrateAPI = true;

        warn('render(): Calling ReactDOM.render() to hydrate server-rendered markup ' + 'will stop working in React v18. Replace the ReactDOM.render() call ' + 'with ReactDOM.hydrate() if you want React to attach to the server HTML.');
      }
    }

    return createLegacyRoot(container, shouldHydrate ? {
      hydrate: true
    } : undefined);
  }

  function warnOnInvalidCallback$1(callback, callerName) {
    {
      if (callback !== null && typeof callback !== 'function') {
        error('%s(...): Expected the last optional `callback` argument to be a ' + 'function. Instead received: %s.', callerName, callback);
      }
    }
  }

  function legacyRenderSubtreeIntoContainer(parentComponent, children, container, forceHydrate, callback) {
    {
      topLevelUpdateWarnings(container);
      warnOnInvalidCallback$1(callback === undefined ? null : callback, 'render');
    } // TODO: Without `any` type, Flow says "Property cannot be accessed on any
    // member of intersection type." Whyyyyyy.


    var root = container._reactRootContainer;
    var fiberRoot;

    if (!root) {
      // Initial mount
      root = container._reactRootContainer = legacyCreateRootFromDOMContainer(container, forceHydrate);
      fiberRoot = root._internalRoot;

      if (typeof callback === 'function') {
        var originalCallback = callback;

        callback = function () {
          var instance = getPublicRootInstance(fiberRoot);
          originalCallback.call(instance);
        };
      } // Initial mount should not be batched.


      unbatchedUpdates(function () {
        updateContainer(children, fiberRoot, parentComponent, callback);
      });
    } else {
      fiberRoot = root._internalRoot;

      if (typeof callback === 'function') {
        var _originalCallback = callback;

        callback = function () {
          var instance = getPublicRootInstance(fiberRoot);

          _originalCallback.call(instance);
        };
      } // Update


      updateContainer(children, fiberRoot, parentComponent, callback);
    }

    return getPublicRootInstance(fiberRoot);
  }

  function findDOMNode(componentOrElement) {
    {
      var owner = ReactCurrentOwner$3.current;

      if (owner !== null && owner.stateNode !== null) {
        var warnedAboutRefsInRender = owner.stateNode._warnedAboutRefsInRender;

        if (!warnedAboutRefsInRender) {
          error('%s is accessing findDOMNode inside its render(). ' + 'render() should be a pure function of props and state. It should ' + 'never access something that requires stale data from the previous ' + 'render, such as refs. Move this logic to componentDidMount and ' + 'componentDidUpdate instead.', getComponentName(owner.type) || 'A component');
        }

        owner.stateNode._warnedAboutRefsInRender = true;
      }
    }

    if (componentOrElement == null) {
      return null;
    }

    if (componentOrElement.nodeType === ELEMENT_NODE) {
      return componentOrElement;
    }

    {
      return findHostInstanceWithWarning(componentOrElement, 'findDOMNode');
    }
  }
  function hydrate(element, container, callback) {
    if (!isValidContainer(container)) {
      {
        throw Error( "Target container is not a DOM element." );
      }
    }

    {
      var isModernRoot = isContainerMarkedAsRoot(container) && container._reactRootContainer === undefined;

      if (isModernRoot) {
        error('You are calling ReactDOM.hydrate() on a container that was previously ' + 'passed to ReactDOM.createRoot(). This is not supported. ' + 'Did you mean to call createRoot(container, {hydrate: true}).render(element)?');
      }
    } // TODO: throw or warn if we couldn't hydrate?


    return legacyRenderSubtreeIntoContainer(null, element, container, true, callback);
  }
  function render(element, container, callback) {
    if (!isValidContainer(container)) {
      {
        throw Error( "Target container is not a DOM element." );
      }
    }

    {
      var isModernRoot = isContainerMarkedAsRoot(container) && container._reactRootContainer === undefined;

      if (isModernRoot) {
        error('You are calling ReactDOM.render() on a container that was previously ' + 'passed to ReactDOM.createRoot(). This is not supported. ' + 'Did you mean to call root.render(element)?');
      }
    }

    return legacyRenderSubtreeIntoContainer(null, element, container, false, callback);
  }
  function unstable_renderSubtreeIntoContainer(parentComponent, element, containerNode, callback) {
    if (!isValidContainer(containerNode)) {
      {
        throw Error( "Target container is not a DOM element." );
      }
    }

    if (!(parentComponent != null && has(parentComponent))) {
      {
        throw Error( "parentComponent must be a valid React Component" );
      }
    }

    return legacyRenderSubtreeIntoContainer(parentComponent, element, containerNode, false, callback);
  }
  function unmountComponentAtNode(container) {
    if (!isValidContainer(container)) {
      {
        throw Error( "unmountComponentAtNode(...): Target container is not a DOM element." );
      }
    }

    {
      var isModernRoot = isContainerMarkedAsRoot(container) && container._reactRootContainer === undefined;

      if (isModernRoot) {
        error('You are calling ReactDOM.unmountComponentAtNode() on a container that was previously ' + 'passed to ReactDOM.createRoot(). This is not supported. Did you mean to call root.unmount()?');
      }
    }

    if (container._reactRootContainer) {
      {
        var rootEl = getReactRootElementInContainer(container);
        var renderedByDifferentReact = rootEl && !getInstanceFromNode(rootEl);

        if (renderedByDifferentReact) {
          error("unmountComponentAtNode(): The node you're attempting to unmount " + 'was rendered by another copy of React.');
        }
      } // Unmount should not be batched.


      unbatchedUpdates(function () {
        legacyRenderSubtreeIntoContainer(null, null, container, false, function () {
          // $FlowFixMe This should probably use `delete container._reactRootContainer`
          container._reactRootContainer = null;
          unmarkContainerAsRoot(container);
        });
      }); // If you call unmountComponentAtNode twice in quick succession, you'll
      // get `true` twice. That's probably fine?

      return true;
    } else {
      {
        var _rootEl = getReactRootElementInContainer(container);

        var hasNonRootReactChild = !!(_rootEl && getInstanceFromNode(_rootEl)); // Check if the container itself is a React root node.

        var isContainerReactRoot = container.nodeType === ELEMENT_NODE && isValidContainer(container.parentNode) && !!container.parentNode._reactRootContainer;

        if (hasNonRootReactChild) {
          error("unmountComponentAtNode(): The node you're attempting to unmount " + 'was rendered by React and is not a top-level container. %s', isContainerReactRoot ? 'You may have accidentally passed in a React root node instead ' + 'of its container.' : 'Instead, have the parent component update its state and ' + 'rerender in order to remove this component.');
        }
      }

      return false;
    }
  }