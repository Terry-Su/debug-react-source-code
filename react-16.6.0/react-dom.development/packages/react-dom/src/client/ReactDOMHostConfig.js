var SUPPRESS_HYDRATION_WARNING = void 0;
{
  SUPPRESS_HYDRATION_WARNING = 'suppressHydrationWarning';
}

var STYLE = 'style';

var eventsEnabled = null;
var selectionInformation = null;

function shouldAutoFocusHostComponent(type, props) {
  switch (type) {
    case 'button':
    case 'input':
    case 'select':
    case 'textarea':
      return !!props.autoFocus;
  }
  return false;
}

function getRootHostContext(rootContainerInstance) {
  var type = void 0;
  var namespace = void 0;
  var nodeType = rootContainerInstance.nodeType;
  switch (nodeType) {
    case DOCUMENT_NODE:
    case DOCUMENT_FRAGMENT_NODE:
      {
        type = nodeType === DOCUMENT_NODE ? '#document' : '#fragment';
        var root = rootContainerInstance.documentElement;
        namespace = root ? root.namespaceURI : getChildNamespace(null, '');
        break;
      }
    default:
      {
        var container = nodeType === COMMENT_NODE ? rootContainerInstance.parentNode : rootContainerInstance;
        var ownNamespace = container.namespaceURI || null;
        type = container.tagName;
        namespace = getChildNamespace(ownNamespace, type);
        break;
      }
  }
  {
    var validatedTag = type.toLowerCase();
    var _ancestorInfo = updatedAncestorInfo(null, validatedTag);
    return { namespace: namespace, ancestorInfo: _ancestorInfo };
  }
  return namespace;
}

function getChildHostContext(parentHostContext, type, rootContainerInstance) {
  {
    var parentHostContextDev = parentHostContext;
    var _namespace = getChildNamespace(parentHostContextDev.namespace, type);
    var _ancestorInfo2 = updatedAncestorInfo(parentHostContextDev.ancestorInfo, type);
    return { namespace: _namespace, ancestorInfo: _ancestorInfo2 };
  }
  var parentNamespace = parentHostContext;
  return getChildNamespace(parentNamespace, type);
}

function getPublicInstance(instance) {
  return instance;
}

function prepareForCommit(containerInfo) {
  eventsEnabled = isEnabled();
  selectionInformation = getSelectionInformation();
  setEnabled(false);
}

function resetAfterCommit(containerInfo) {
  restoreSelection(selectionInformation);
  selectionInformation = null;
  setEnabled(eventsEnabled);
  eventsEnabled = null;
}

function createInstance(type, props, rootContainerInstance, hostContext, internalInstanceHandle) {
  var parentNamespace = void 0;
  {
    // TODO: take namespace into account when validating.
    var hostContextDev = hostContext;
    validateDOMNesting(type, null, hostContextDev.ancestorInfo);
    if (typeof props.children === 'string' || typeof props.children === 'number') {
      var string = '' + props.children;
      var ownAncestorInfo = updatedAncestorInfo(hostContextDev.ancestorInfo, type);
      validateDOMNesting(null, string, ownAncestorInfo);
    }
    parentNamespace = hostContextDev.namespace;
  }
  var domElement = createElement(type, props, rootContainerInstance, parentNamespace);
  precacheFiberNode(internalInstanceHandle, domElement);
  updateFiberProps(domElement, props);
  return domElement;
}

function appendInitialChild(parentInstance, child) {
  parentInstance.appendChild(child);
}

function finalizeInitialChildren(domElement, type, props, rootContainerInstance, hostContext) {
  setInitialProperties(domElement, type, props, rootContainerInstance);
  return shouldAutoFocusHostComponent(type, props);
}

function prepareUpdate(domElement, type, oldProps, newProps, rootContainerInstance, hostContext) {
  {
    var hostContextDev = hostContext;
    if (typeof newProps.children !== typeof oldProps.children && (typeof newProps.children === 'string' || typeof newProps.children === 'number')) {
      var string = '' + newProps.children;
      var ownAncestorInfo = updatedAncestorInfo(hostContextDev.ancestorInfo, type);
      validateDOMNesting(null, string, ownAncestorInfo);
    }
  }
  return diffProperties(domElement, type, oldProps, newProps, rootContainerInstance);
}

function shouldSetTextContent(type, props) {
  return type === 'textarea' || type === 'option' || type === 'noscript' || typeof props.children === 'string' || typeof props.children === 'number' || typeof props.dangerouslySetInnerHTML === 'object' && props.dangerouslySetInnerHTML !== null && props.dangerouslySetInnerHTML.__html != null;
}

function shouldDeprioritizeSubtree(type, props) {
  return !!props.hidden;
}

function createTextInstance(text, rootContainerInstance, hostContext, internalInstanceHandle) {
  {
    var hostContextDev = hostContext;
    validateDOMNesting(null, text, hostContextDev.ancestorInfo);
  }
  var textNode = createTextNode(text, rootContainerInstance);
  precacheFiberNode(internalInstanceHandle, textNode);
  return textNode;
}

var isPrimaryRenderer = true;
var scheduleTimeout = setTimeout;
var cancelTimeout = clearTimeout;
var noTimeout = -1;

// -------------------
//     Mutation
// -------------------

var supportsMutation = true;

function commitMount(domElement, type, newProps, internalInstanceHandle) {
  // Despite the naming that might imply otherwise, this method only
  // fires if there is an `Update` effect scheduled during mounting.
  // This happens if `finalizeInitialChildren` returns `true` (which it
  // does to implement the `autoFocus` attribute on the client). But
  // there are also other cases when this might happen (such as patching
  // up text content during hydration mismatch). So we'll check this again.
  if (shouldAutoFocusHostComponent(type, newProps)) {
    domElement.focus();
  }
}

function commitUpdate(domElement, updatePayload, type, oldProps, newProps, internalInstanceHandle) {
  // Update the props handle so that we know which props are the ones with
  // with current event handlers.
  updateFiberProps(domElement, newProps);
  // Apply the diff to the DOM node.
  updateProperties(domElement, updatePayload, type, oldProps, newProps);
}

function resetTextContent(domElement) {
  setTextContent(domElement, '');
}

function commitTextUpdate(textInstance, oldText, newText) {
  textInstance.nodeValue = newText;
}

function appendChild(parentInstance, child) {
  parentInstance.appendChild(child);
}

function appendChildToContainer(container, child) {
  var parentNode = void 0;
  if (container.nodeType === COMMENT_NODE) {
    parentNode = container.parentNode;
    parentNode.insertBefore(child, container);
  } else {
    parentNode = container;
    parentNode.appendChild(child);
  }
  // This container might be used for a portal.
  // If something inside a portal is clicked, that click should bubble
  // through the React tree. However, on Mobile Safari the click would
  // never bubble through the *DOM* tree unless an ancestor with onclick
  // event exists. So we wouldn't see it and dispatch it.
  // This is why we ensure that non React root containers have inline onclick
  // defined.
  // https://github.com/facebook/react/issues/11918
  var reactRootContainer = container._reactRootContainer;
  if ((reactRootContainer === null || reactRootContainer === undefined) && parentNode.onclick === null) {
    // TODO: This cast may not be sound for SVG, MathML or custom elements.
    trapClickOnNonInteractiveElement(parentNode);
  }
}

function insertBefore(parentInstance, child, beforeChild) {
  parentInstance.insertBefore(child, beforeChild);
}

function insertInContainerBefore(container, child, beforeChild) {
  if (container.nodeType === COMMENT_NODE) {
    container.parentNode.insertBefore(child, beforeChild);
  } else {
    container.insertBefore(child, beforeChild);
  }
}

function removeChild(parentInstance, child) {
  parentInstance.removeChild(child);
}

function removeChildFromContainer(container, child) {
  if (container.nodeType === COMMENT_NODE) {
    container.parentNode.removeChild(child);
  } else {
    container.removeChild(child);
  }
}

function hideInstance(instance) {
  // TODO: Does this work for all element types? What about MathML? Should we
  // pass host context to this method?
  instance = instance;
  instance.style.display = 'none';
}

function hideTextInstance(textInstance) {
  textInstance.nodeValue = '';
}

function unhideInstance(instance, props) {
  instance = instance;
  var styleProp = props[STYLE];
  var display = styleProp !== undefined && styleProp !== null && styleProp.hasOwnProperty('display') ? styleProp.display : null;
  // $FlowFixMe Setting a style property to null is the valid way to reset it.
  instance.style.display = display;
}

function unhideTextInstance(textInstance, text) {
  textInstance.nodeValue = text;
}

// -------------------
//     Hydration
// -------------------

var supportsHydration = true;

function canHydrateInstance(instance, type, props) {
  if (instance.nodeType !== ELEMENT_NODE || type.toLowerCase() !== instance.nodeName.toLowerCase()) {
    return null;
  }
  // This has now been refined to an element node.
  return instance;
}

function canHydrateTextInstance(instance, text) {
  if (text === '' || instance.nodeType !== TEXT_NODE) {
    // Empty strings are not parsed by HTML so there won't be a correct match here.
    return null;
  }
  // This has now been refined to a text node.
  return instance;
}

function getNextHydratableSibling(instance) {
  var node = instance.nextSibling;
  // Skip non-hydratable nodes.
  while (node && node.nodeType !== ELEMENT_NODE && node.nodeType !== TEXT_NODE) {
    node = node.nextSibling;
  }
  return node;
}

function getFirstHydratableChild(parentInstance) {
  var next = parentInstance.firstChild;
  // Skip non-hydratable nodes.
  while (next && next.nodeType !== ELEMENT_NODE && next.nodeType !== TEXT_NODE) {
    next = next.nextSibling;
  }
  return next;
}

function hydrateInstance(instance, type, props, rootContainerInstance, hostContext, internalInstanceHandle) {
  precacheFiberNode(internalInstanceHandle, instance);
  // TODO: Possibly defer this until the commit phase where all the events
  // get attached.
  updateFiberProps(instance, props);
  var parentNamespace = void 0;
  {
    var hostContextDev = hostContext;
    parentNamespace = hostContextDev.namespace;
  }
  return diffHydratedProperties(instance, type, props, parentNamespace, rootContainerInstance);
}

function hydrateTextInstance(textInstance, text, internalInstanceHandle) {
  precacheFiberNode(internalInstanceHandle, textInstance);
  return diffHydratedText(textInstance, text);
}

function didNotMatchHydratedContainerTextInstance(parentContainer, textInstance, text) {
  {
    warnForUnmatchedText(textInstance, text);
  }
}

function didNotMatchHydratedTextInstance(parentType, parentProps, parentInstance, textInstance, text) {
  if (true && parentProps[SUPPRESS_HYDRATION_WARNING] !== true) {
    warnForUnmatchedText(textInstance, text);
  }
}

function didNotHydrateContainerInstance(parentContainer, instance) {
  {
    if (instance.nodeType === ELEMENT_NODE) {
      warnForDeletedHydratableElement(parentContainer, instance);
    } else {
      warnForDeletedHydratableText(parentContainer, instance);
    }
  }
}

function didNotHydrateInstance(parentType, parentProps, parentInstance, instance) {
  if (true && parentProps[SUPPRESS_HYDRATION_WARNING] !== true) {
    if (instance.nodeType === ELEMENT_NODE) {
      warnForDeletedHydratableElement(parentInstance, instance);
    } else {
      warnForDeletedHydratableText(parentInstance, instance);
    }
  }
}

function didNotFindHydratableContainerInstance(parentContainer, type, props) {
  {
    warnForInsertedHydratedElement(parentContainer, type, props);
  }
}

function didNotFindHydratableContainerTextInstance(parentContainer, text) {
  {
    warnForInsertedHydratedText(parentContainer, text);
  }
}

function didNotFindHydratableInstance(parentType, parentProps, parentInstance, type, props) {
  if (true && parentProps[SUPPRESS_HYDRATION_WARNING] !== true) {
    warnForInsertedHydratedElement(parentInstance, type, props);
  }
}

function didNotFindHydratableTextInstance(parentType, parentProps, parentInstance, text) {
  if (true && parentProps[SUPPRESS_HYDRATION_WARNING] !== true) {
    warnForInsertedHydratedText(parentInstance, text);
  }
}