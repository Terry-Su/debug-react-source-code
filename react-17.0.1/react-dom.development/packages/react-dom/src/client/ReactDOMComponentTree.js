  var randomKey = Math.random().toString(36).slice(2);
  var internalInstanceKey = '__reactFiber$' + randomKey;
  var internalPropsKey = '__reactProps$' + randomKey;
  var internalContainerInstanceKey = '__reactContainer$' + randomKey;
  var internalEventHandlersKey = '__reactEvents$' + randomKey;
  function precacheFiberNode(hostInst, node) {
    node[internalInstanceKey] = hostInst;
  }
  function markContainerAsRoot(hostRoot, node) {
    node[internalContainerInstanceKey] = hostRoot;
  }
  function unmarkContainerAsRoot(node) {
    node[internalContainerInstanceKey] = null;
  }
  function isContainerMarkedAsRoot(node) {
    return !!node[internalContainerInstanceKey];
  } // Given a DOM node, return the closest HostComponent or HostText fiber ancestor.
  // If the target node is part of a hydrated or not yet rendered subtree, then
  // this may also return a SuspenseComponent or HostRoot to indicate that.
  // Conceptually the HostRoot fiber is a child of the Container node. So if you
  // pass the Container node as the targetNode, you will not actually get the
  // HostRoot back. To get to the HostRoot, you need to pass a child of it.
  // The same thing applies to Suspense boundaries.

  function getClosestInstanceFromNode(targetNode) {
    var targetInst = targetNode[internalInstanceKey];

    if (targetInst) {
      // Don't return HostRoot or SuspenseComponent here.
      return targetInst;
    } // If the direct event target isn't a React owned DOM node, we need to look
    // to see if one of its parents is a React owned DOM node.


    var parentNode = targetNode.parentNode;

    while (parentNode) {
      // We'll check if this is a container root that could include
      // React nodes in the future. We need to check this first because
      // if we're a child of a dehydrated container, we need to first
      // find that inner container before moving on to finding the parent
      // instance. Note that we don't check this field on  the targetNode
      // itself because the fibers are conceptually between the container
      // node and the first child. It isn't surrounding the container node.
      // If it's not a container, we check if it's an instance.
      targetInst = parentNode[internalContainerInstanceKey] || parentNode[internalInstanceKey];

      if (targetInst) {
        // Since this wasn't the direct target of the event, we might have
        // stepped past dehydrated DOM nodes to get here. However they could
        // also have been non-React nodes. We need to answer which one.
        // If we the instance doesn't have any children, then there can't be
        // a nested suspense boundary within it. So we can use this as a fast
        // bailout. Most of the time, when people add non-React children to
        // the tree, it is using a ref to a child-less DOM node.
        // Normally we'd only need to check one of the fibers because if it
        // has ever gone from having children to deleting them or vice versa
        // it would have deleted the dehydrated boundary nested inside already.
        // However, since the HostRoot starts out with an alternate it might
        // have one on the alternate so we need to check in case this was a
        // root.
        var alternate = targetInst.alternate;

        if (targetInst.child !== null || alternate !== null && alternate.child !== null) {
          // Next we need to figure out if the node that skipped past is
          // nested within a dehydrated boundary and if so, which one.
          var suspenseInstance = getParentSuspenseInstance(targetNode);

          while (suspenseInstance !== null) {
            // We found a suspense instance. That means that we haven't
            // hydrated it yet. Even though we leave the comments in the
            // DOM after hydrating, and there are boundaries in the DOM
            // that could already be hydrated, we wouldn't have found them
            // through this pass since if the target is hydrated it would
            // have had an internalInstanceKey on it.
            // Let's get the fiber associated with the SuspenseComponent
            // as the deepest instance.
            var targetSuspenseInst = suspenseInstance[internalInstanceKey];

            if (targetSuspenseInst) {
              return targetSuspenseInst;
            } // If we don't find a Fiber on the comment, it might be because
            // we haven't gotten to hydrate it yet. There might still be a
            // parent boundary that hasn't above this one so we need to find
            // the outer most that is known.


            suspenseInstance = getParentSuspenseInstance(suspenseInstance); // If we don't find one, then that should mean that the parent
            // host component also hasn't hydrated yet. We can return it
            // below since it will bail out on the isMounted check later.
          }
        }

        return targetInst;
      }

      targetNode = parentNode;
      parentNode = targetNode.parentNode;
    }

    return null;
  }
  /**
   * Given a DOM node, return the ReactDOMComponent or ReactDOMTextComponent
   * instance, or null if the node was not rendered by this React.
   */

  function getInstanceFromNode(node) {
    var inst = node[internalInstanceKey] || node[internalContainerInstanceKey];

    if (inst) {
      if (inst.tag === HostComponent || inst.tag === HostText || inst.tag === SuspenseComponent || inst.tag === HostRoot) {
        return inst;
      } else {
        return null;
      }
    }

    return null;
  }
  /**
   * Given a ReactDOMComponent or ReactDOMTextComponent, return the corresponding
   * DOM node.
   */

  function getNodeFromInstance(inst) {
    if (inst.tag === HostComponent || inst.tag === HostText) {
      // In Fiber this, is just the state node right now. We assume it will be
      // a host component or host text.
      return inst.stateNode;
    } // Without this first invariant, passing a non-DOM-component triggers the next
    // invariant for a missing parent, which is super confusing.


    {
      {
        throw Error( "getNodeFromInstance: Invalid argument." );
      }
    }
  }
  function getFiberCurrentPropsFromNode(node) {
    return node[internalPropsKey] || null;
  }
  function updateFiberProps(node, props) {
    node[internalPropsKey] = props;
  }
  function getEventListenerSet(node) {
    var elementListenerSet = node[internalEventHandlersKey];

    if (elementListenerSet === undefined) {
      elementListenerSet = node[internalEventHandlersKey] = new Set();
    }

    return elementListenerSet;
  }