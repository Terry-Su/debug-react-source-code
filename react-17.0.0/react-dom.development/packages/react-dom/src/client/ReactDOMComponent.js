  var didWarnInvalidHydration = false;
  var DANGEROUSLY_SET_INNER_HTML = 'dangerouslySetInnerHTML';
  var SUPPRESS_CONTENT_EDITABLE_WARNING = 'suppressContentEditableWarning';
  var SUPPRESS_HYDRATION_WARNING = 'suppressHydrationWarning';
  var AUTOFOCUS = 'autoFocus';
  var CHILDREN = 'children';
  var STYLE = 'style';
  var HTML$1 = '__html';
  var HTML_NAMESPACE$1 = Namespaces.html;
  var warnedUnknownTags;
  var suppressHydrationWarning;
  var validatePropertiesInDevelopment;
  var warnForTextDifference;
  var warnForPropDifference;
  var warnForExtraAttributes;
  var warnForInvalidEventListener;
  var canDiffStyleForHydrationWarning;
  var normalizeMarkupForTextOrAttribute;
  var normalizeHTML;

  {
    warnedUnknownTags = {
      // There are working polyfills for <dialog>. Let people use it.
      dialog: true,
      // Electron ships a custom <webview> tag to display external web content in
      // an isolated frame and process.
      // This tag is not present in non Electron environments such as JSDom which
      // is often used for testing purposes.
      // @see https://electronjs.org/docs/api/webview-tag
      webview: true
    };

    validatePropertiesInDevelopment = function (type, props) {
      validateProperties(type, props);
      validateProperties$1(type, props);
      validateProperties$2(type, props, {
        registrationNameDependencies: registrationNameDependencies,
        possibleRegistrationNames: possibleRegistrationNames
      });
    }; // IE 11 parses & normalizes the style attribute as opposed to other
    // browsers. It adds spaces and sorts the properties in some
    // non-alphabetical order. Handling that would require sorting CSS
    // properties in the client & server versions or applying
    // `expectedStyle` to a temporary DOM node to read its `style` attribute
    // normalized. Since it only affects IE, we're skipping style warnings
    // in that browser completely in favor of doing all that work.
    // See https://github.com/facebook/react/issues/11807


    canDiffStyleForHydrationWarning = canUseDOM && !document.documentMode; // HTML parsing normalizes CR and CRLF to LF.
    // It also can turn \u0000 into \uFFFD inside attributes.
    // https://www.w3.org/TR/html5/single-page.html#preprocessing-the-input-stream
    // If we have a mismatch, it might be caused by that.
    // We will still patch up in this case but not fire the warning.

    var NORMALIZE_NEWLINES_REGEX = /\r\n?/g;
    var NORMALIZE_NULL_AND_REPLACEMENT_REGEX = /\u0000|\uFFFD/g;

    normalizeMarkupForTextOrAttribute = function (markup) {
      var markupString = typeof markup === 'string' ? markup : '' + markup;
      return markupString.replace(NORMALIZE_NEWLINES_REGEX, '\n').replace(NORMALIZE_NULL_AND_REPLACEMENT_REGEX, '');
    };

    warnForTextDifference = function (serverText, clientText) {
      if (didWarnInvalidHydration) {
        return;
      }

      var normalizedClientText = normalizeMarkupForTextOrAttribute(clientText);
      var normalizedServerText = normalizeMarkupForTextOrAttribute(serverText);

      if (normalizedServerText === normalizedClientText) {
        return;
      }

      didWarnInvalidHydration = true;

      error('Text content did not match. Server: "%s" Client: "%s"', normalizedServerText, normalizedClientText);
    };

    warnForPropDifference = function (propName, serverValue, clientValue) {
      if (didWarnInvalidHydration) {
        return;
      }

      var normalizedClientValue = normalizeMarkupForTextOrAttribute(clientValue);
      var normalizedServerValue = normalizeMarkupForTextOrAttribute(serverValue);

      if (normalizedServerValue === normalizedClientValue) {
        return;
      }

      didWarnInvalidHydration = true;

      error('Prop `%s` did not match. Server: %s Client: %s', propName, JSON.stringify(normalizedServerValue), JSON.stringify(normalizedClientValue));
    };

    warnForExtraAttributes = function (attributeNames) {
      if (didWarnInvalidHydration) {
        return;
      }

      didWarnInvalidHydration = true;
      var names = [];
      attributeNames.forEach(function (name) {
        names.push(name);
      });

      error('Extra attributes from the server: %s', names);
    };

    warnForInvalidEventListener = function (registrationName, listener) {
      if (listener === false) {
        error('Expected `%s` listener to be a function, instead got `false`.\n\n' + 'If you used to conditionally omit it with %s={condition && value}, ' + 'pass %s={condition ? value : undefined} instead.', registrationName, registrationName, registrationName);
      } else {
        error('Expected `%s` listener to be a function, instead got a value of `%s` type.', registrationName, typeof listener);
      }
    }; // Parse the HTML and read it back to normalize the HTML string so that it
    // can be used for comparison.


    normalizeHTML = function (parent, html) {
      // We could have created a separate document here to avoid
      // re-initializing custom elements if they exist. But this breaks
      // how <noscript> is being handled. So we use the same document.
      // See the discussion in https://github.com/facebook/react/pull/11157.
      var testElement = parent.namespaceURI === HTML_NAMESPACE$1 ? parent.ownerDocument.createElement(parent.tagName) : parent.ownerDocument.createElementNS(parent.namespaceURI, parent.tagName);
      testElement.innerHTML = html;
      return testElement.innerHTML;
    };
  }

  function getOwnerDocumentFromRootContainer(rootContainerElement) {
    return rootContainerElement.nodeType === DOCUMENT_NODE ? rootContainerElement : rootContainerElement.ownerDocument;
  }

  function noop() {}

  function trapClickOnNonInteractiveElement(node) {
    // Mobile Safari does not fire properly bubble click events on
    // non-interactive elements, which means delegated click listeners do not
    // fire. The workaround for this bug involves attaching an empty click
    // listener on the target node.
    // https://www.quirksmode.org/blog/archives/2010/09/click_event_del.html
    // Just set it using the onclick property so that we don't have to manage any
    // bookkeeping for it. Not sure if we need to clear it when the listener is
    // removed.
    // TODO: Only do this for the relevant Safaris maybe?
    node.onclick = noop;
  }

  function setInitialDOMProperties(tag, domElement, rootContainerElement, nextProps, isCustomComponentTag) {
    for (var propKey in nextProps) {
      if (!nextProps.hasOwnProperty(propKey)) {
        continue;
      }

      var nextProp = nextProps[propKey];

      if (propKey === STYLE) {
        {
          if (nextProp) {
            // Freeze the next style object so that we can assume it won't be
            // mutated. We have already warned for this in the past.
            Object.freeze(nextProp);
          }
        } // Relies on `updateStylesByID` not mutating `styleUpdates`.


        setValueForStyles(domElement, nextProp);
      } else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
        var nextHtml = nextProp ? nextProp[HTML$1] : undefined;

        if (nextHtml != null) {
          setInnerHTML(domElement, nextHtml);
        }
      } else if (propKey === CHILDREN) {
        if (typeof nextProp === 'string') {
          // Avoid setting initial textContent when the text is empty. In IE11 setting
          // textContent on a <textarea> will cause the placeholder to not
          // show within the <textarea> until it has been focused and blurred again.
          // https://github.com/facebook/react/issues/6731#issuecomment-254874553
          var canSetTextContent = tag !== 'textarea' || nextProp !== '';

          if (canSetTextContent) {
            setTextContent(domElement, nextProp);
          }
        } else if (typeof nextProp === 'number') {
          setTextContent(domElement, '' + nextProp);
        }
      } else if (propKey === SUPPRESS_CONTENT_EDITABLE_WARNING || propKey === SUPPRESS_HYDRATION_WARNING) ; else if (propKey === AUTOFOCUS) ; else if (registrationNameDependencies.hasOwnProperty(propKey)) {
        if (nextProp != null) {
          if ( typeof nextProp !== 'function') {
            warnForInvalidEventListener(propKey, nextProp);
          }

          if (propKey === 'onScroll') {
            listenToNonDelegatedEvent('scroll', domElement);
          }
        }
      } else if (nextProp != null) {
        setValueForProperty(domElement, propKey, nextProp, isCustomComponentTag);
      }
    }
  }

  function updateDOMProperties(domElement, updatePayload, wasCustomComponentTag, isCustomComponentTag) {
    // TODO: Handle wasCustomComponentTag
    for (var i = 0; i < updatePayload.length; i += 2) {
      var propKey = updatePayload[i];
      var propValue = updatePayload[i + 1];

      if (propKey === STYLE) {
        setValueForStyles(domElement, propValue);
      } else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
        setInnerHTML(domElement, propValue);
      } else if (propKey === CHILDREN) {
        setTextContent(domElement, propValue);
      } else {
        setValueForProperty(domElement, propKey, propValue, isCustomComponentTag);
      }
    }
  }

  function createElement(type, props, rootContainerElement, parentNamespace) {
    var isCustomComponentTag; // We create tags in the namespace of their parent container, except HTML
    // tags get no namespace.

    var ownerDocument = getOwnerDocumentFromRootContainer(rootContainerElement);
    var domElement;
    var namespaceURI = parentNamespace;

    if (namespaceURI === HTML_NAMESPACE$1) {
      namespaceURI = getIntrinsicNamespace(type);
    }

    if (namespaceURI === HTML_NAMESPACE$1) {
      {
        isCustomComponentTag = isCustomComponent(type, props); // Should this check be gated by parent namespace? Not sure we want to
        // allow <SVG> or <mATH>.

        if (!isCustomComponentTag && type !== type.toLowerCase()) {
          error('<%s /> is using incorrect casing. ' + 'Use PascalCase for React components, ' + 'or lowercase for HTML elements.', type);
        }
      }

      if (type === 'script') {
        // Create the script via .innerHTML so its "parser-inserted" flag is
        // set to true and it does not execute
        var div = ownerDocument.createElement('div');

        div.innerHTML = '<script><' + '/script>'; // eslint-disable-line
        // This is guaranteed to yield a script element.

        var firstChild = div.firstChild;
        domElement = div.removeChild(firstChild);
      } else if (typeof props.is === 'string') {
        // $FlowIssue `createElement` should be updated for Web Components
        domElement = ownerDocument.createElement(type, {
          is: props.is
        });
      } else {
        // Separate else branch instead of using `props.is || undefined` above because of a Firefox bug.
        // See discussion in https://github.com/facebook/react/pull/6896
        // and discussion in https://bugzilla.mozilla.org/show_bug.cgi?id=1276240
        domElement = ownerDocument.createElement(type); // Normally attributes are assigned in `setInitialDOMProperties`, however the `multiple` and `size`
        // attributes on `select`s needs to be added before `option`s are inserted.
        // This prevents:
        // - a bug where the `select` does not scroll to the correct option because singular
        //  `select` elements automatically pick the first item #13222
        // - a bug where the `select` set the first item as selected despite the `size` attribute #14239
        // See https://github.com/facebook/react/issues/13222
        // and https://github.com/facebook/react/issues/14239

        if (type === 'select') {
          var node = domElement;

          if (props.multiple) {
            node.multiple = true;
          } else if (props.size) {
            // Setting a size greater than 1 causes a select to behave like `multiple=true`, where
            // it is possible that no option is selected.
            //
            // This is only necessary when a select in "single selection mode".
            node.size = props.size;
          }
        }
      }
    } else {
      domElement = ownerDocument.createElementNS(namespaceURI, type);
    }

    {
      if (namespaceURI === HTML_NAMESPACE$1) {
        if (!isCustomComponentTag && Object.prototype.toString.call(domElement) === '[object HTMLUnknownElement]' && !Object.prototype.hasOwnProperty.call(warnedUnknownTags, type)) {
          warnedUnknownTags[type] = true;

          error('The tag <%s> is unrecognized in this browser. ' + 'If you meant to render a React component, start its name with ' + 'an uppercase letter.', type);
        }
      }
    }

    return domElement;
  }
  function createTextNode(text, rootContainerElement) {
    return getOwnerDocumentFromRootContainer(rootContainerElement).createTextNode(text);
  }
  function setInitialProperties(domElement, tag, rawProps, rootContainerElement) {
    var isCustomComponentTag = isCustomComponent(tag, rawProps);

    {
      validatePropertiesInDevelopment(tag, rawProps);
    } // TODO: Make sure that we check isMounted before firing any of these events.


    var props;

    switch (tag) {
      case 'dialog':
        listenToNonDelegatedEvent('cancel', domElement);
        listenToNonDelegatedEvent('close', domElement);
        props = rawProps;
        break;

      case 'iframe':
      case 'object':
      case 'embed':
        // We listen to this event in case to ensure emulated bubble
        // listeners still fire for the load event.
        listenToNonDelegatedEvent('load', domElement);
        props = rawProps;
        break;

      case 'video':
      case 'audio':
        // We listen to these events in case to ensure emulated bubble
        // listeners still fire for all the media events.
        for (var i = 0; i < mediaEventTypes.length; i++) {
          listenToNonDelegatedEvent(mediaEventTypes[i], domElement);
        }

        props = rawProps;
        break;

      case 'source':
        // We listen to this event in case to ensure emulated bubble
        // listeners still fire for the error event.
        listenToNonDelegatedEvent('error', domElement);
        props = rawProps;
        break;

      case 'img':
      case 'image':
      case 'link':
        // We listen to these events in case to ensure emulated bubble
        // listeners still fire for error and load events.
        listenToNonDelegatedEvent('error', domElement);
        listenToNonDelegatedEvent('load', domElement);
        props = rawProps;
        break;

      case 'details':
        // We listen to this event in case to ensure emulated bubble
        // listeners still fire for the toggle event.
        listenToNonDelegatedEvent('toggle', domElement);
        props = rawProps;
        break;

      case 'input':
        initWrapperState(domElement, rawProps);
        props = getHostProps(domElement, rawProps); // We listen to this event in case to ensure emulated bubble
        // listeners still fire for the invalid event.

        listenToNonDelegatedEvent('invalid', domElement);

        break;

      case 'option':
        validateProps(domElement, rawProps);
        props = getHostProps$1(domElement, rawProps);
        break;

      case 'select':
        initWrapperState$1(domElement, rawProps);
        props = getHostProps$2(domElement, rawProps); // We listen to this event in case to ensure emulated bubble
        // listeners still fire for the invalid event.

        listenToNonDelegatedEvent('invalid', domElement);

        break;

      case 'textarea':
        initWrapperState$2(domElement, rawProps);
        props = getHostProps$3(domElement, rawProps); // We listen to this event in case to ensure emulated bubble
        // listeners still fire for the invalid event.

        listenToNonDelegatedEvent('invalid', domElement);

        break;

      default:
        props = rawProps;
    }

    assertValidProps(tag, props);
    setInitialDOMProperties(tag, domElement, rootContainerElement, props, isCustomComponentTag);

    switch (tag) {
      case 'input':
        // TODO: Make sure we check if this is still unmounted or do any clean
        // up necessary since we never stop tracking anymore.
        track(domElement);
        postMountWrapper(domElement, rawProps, false);
        break;

      case 'textarea':
        // TODO: Make sure we check if this is still unmounted or do any clean
        // up necessary since we never stop tracking anymore.
        track(domElement);
        postMountWrapper$3(domElement);
        break;

      case 'option':
        postMountWrapper$1(domElement, rawProps);
        break;

      case 'select':
        postMountWrapper$2(domElement, rawProps);
        break;

      default:
        if (typeof props.onClick === 'function') {
          // TODO: This cast may not be sound for SVG, MathML or custom elements.
          trapClickOnNonInteractiveElement(domElement);
        }

        break;
    }
  } // Calculate the diff between the two objects.

  function diffProperties(domElement, tag, lastRawProps, nextRawProps, rootContainerElement) {
    {
      validatePropertiesInDevelopment(tag, nextRawProps);
    }

    var updatePayload = null;
    var lastProps;
    var nextProps;

    switch (tag) {
      case 'input':
        lastProps = getHostProps(domElement, lastRawProps);
        nextProps = getHostProps(domElement, nextRawProps);
        updatePayload = [];
        break;

      case 'option':
        lastProps = getHostProps$1(domElement, lastRawProps);
        nextProps = getHostProps$1(domElement, nextRawProps);
        updatePayload = [];
        break;

      case 'select':
        lastProps = getHostProps$2(domElement, lastRawProps);
        nextProps = getHostProps$2(domElement, nextRawProps);
        updatePayload = [];
        break;

      case 'textarea':
        lastProps = getHostProps$3(domElement, lastRawProps);
        nextProps = getHostProps$3(domElement, nextRawProps);
        updatePayload = [];
        break;

      default:
        lastProps = lastRawProps;
        nextProps = nextRawProps;

        if (typeof lastProps.onClick !== 'function' && typeof nextProps.onClick === 'function') {
          // TODO: This cast may not be sound for SVG, MathML or custom elements.
          trapClickOnNonInteractiveElement(domElement);
        }

        break;
    }

    assertValidProps(tag, nextProps);
    var propKey;
    var styleName;
    var styleUpdates = null;

    for (propKey in lastProps) {
      if (nextProps.hasOwnProperty(propKey) || !lastProps.hasOwnProperty(propKey) || lastProps[propKey] == null) {
        continue;
      }

      if (propKey === STYLE) {
        var lastStyle = lastProps[propKey];

        for (styleName in lastStyle) {
          if (lastStyle.hasOwnProperty(styleName)) {
            if (!styleUpdates) {
              styleUpdates = {};
            }

            styleUpdates[styleName] = '';
          }
        }
      } else if (propKey === DANGEROUSLY_SET_INNER_HTML || propKey === CHILDREN) ; else if (propKey === SUPPRESS_CONTENT_EDITABLE_WARNING || propKey === SUPPRESS_HYDRATION_WARNING) ; else if (propKey === AUTOFOCUS) ; else if (registrationNameDependencies.hasOwnProperty(propKey)) {
        // This is a special case. If any listener updates we need to ensure
        // that the "current" fiber pointer gets updated so we need a commit
        // to update this element.
        if (!updatePayload) {
          updatePayload = [];
        }
      } else {
        // For all other deleted properties we add it to the queue. We use
        // the allowed property list in the commit phase instead.
        (updatePayload = updatePayload || []).push(propKey, null);
      }
    }

    for (propKey in nextProps) {
      var nextProp = nextProps[propKey];
      var lastProp = lastProps != null ? lastProps[propKey] : undefined;

      if (!nextProps.hasOwnProperty(propKey) || nextProp === lastProp || nextProp == null && lastProp == null) {
        continue;
      }

      if (propKey === STYLE) {
        {
          if (nextProp) {
            // Freeze the next style object so that we can assume it won't be
            // mutated. We have already warned for this in the past.
            Object.freeze(nextProp);
          }
        }

        if (lastProp) {
          // Unset styles on `lastProp` but not on `nextProp`.
          for (styleName in lastProp) {
            if (lastProp.hasOwnProperty(styleName) && (!nextProp || !nextProp.hasOwnProperty(styleName))) {
              if (!styleUpdates) {
                styleUpdates = {};
              }

              styleUpdates[styleName] = '';
            }
          } // Update styles that changed since `lastProp`.


          for (styleName in nextProp) {
            if (nextProp.hasOwnProperty(styleName) && lastProp[styleName] !== nextProp[styleName]) {
              if (!styleUpdates) {
                styleUpdates = {};
              }

              styleUpdates[styleName] = nextProp[styleName];
            }
          }
        } else {
          // Relies on `updateStylesByID` not mutating `styleUpdates`.
          if (!styleUpdates) {
            if (!updatePayload) {
              updatePayload = [];
            }

            updatePayload.push(propKey, styleUpdates);
          }

          styleUpdates = nextProp;
        }
      } else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
        var nextHtml = nextProp ? nextProp[HTML$1] : undefined;
        var lastHtml = lastProp ? lastProp[HTML$1] : undefined;

        if (nextHtml != null) {
          if (lastHtml !== nextHtml) {
            (updatePayload = updatePayload || []).push(propKey, nextHtml);
          }
        }
      } else if (propKey === CHILDREN) {
        if (typeof nextProp === 'string' || typeof nextProp === 'number') {
          (updatePayload = updatePayload || []).push(propKey, '' + nextProp);
        }
      } else if (propKey === SUPPRESS_CONTENT_EDITABLE_WARNING || propKey === SUPPRESS_HYDRATION_WARNING) ; else if (registrationNameDependencies.hasOwnProperty(propKey)) {
        if (nextProp != null) {
          // We eagerly listen to this even though we haven't committed yet.
          if ( typeof nextProp !== 'function') {
            warnForInvalidEventListener(propKey, nextProp);
          }

          if (propKey === 'onScroll') {
            listenToNonDelegatedEvent('scroll', domElement);
          }
        }

        if (!updatePayload && lastProp !== nextProp) {
          // This is a special case. If any listener updates we need to ensure
          // that the "current" props pointer gets updated so we need a commit
          // to update this element.
          updatePayload = [];
        }
      } else if (typeof nextProp === 'object' && nextProp !== null && nextProp.$$typeof === REACT_OPAQUE_ID_TYPE) {
        // If we encounter useOpaqueReference's opaque object, this means we are hydrating.
        // In this case, call the opaque object's toString function which generates a new client
        // ID so client and server IDs match and throws to rerender.
        nextProp.toString();
      } else {
        // For any other property we always add it to the queue and then we
        // filter it out using the allowed property list during the commit.
        (updatePayload = updatePayload || []).push(propKey, nextProp);
      }
    }

    if (styleUpdates) {
      {
        validateShorthandPropertyCollisionInDev(styleUpdates, nextProps[STYLE]);
      }

      (updatePayload = updatePayload || []).push(STYLE, styleUpdates);
    }

    return updatePayload;
  } // Apply the diff.

  function updateProperties(domElement, updatePayload, tag, lastRawProps, nextRawProps) {
    // Update checked *before* name.
    // In the middle of an update, it is possible to have multiple checked.
    // When a checked radio tries to change name, browser makes another radio's checked false.
    if (tag === 'input' && nextRawProps.type === 'radio' && nextRawProps.name != null) {
      updateChecked(domElement, nextRawProps);
    }

    var wasCustomComponentTag = isCustomComponent(tag, lastRawProps);
    var isCustomComponentTag = isCustomComponent(tag, nextRawProps); // Apply the diff.

    updateDOMProperties(domElement, updatePayload, wasCustomComponentTag, isCustomComponentTag); // TODO: Ensure that an update gets scheduled if any of the special props
    // changed.

    switch (tag) {
      case 'input':
        // Update the wrapper around inputs *after* updating props. This has to
        // happen after `updateDOMProperties`. Otherwise HTML5 input validations
        // raise warnings and prevent the new value from being assigned.
        updateWrapper(domElement, nextRawProps);
        break;

      case 'textarea':
        updateWrapper$1(domElement, nextRawProps);
        break;

      case 'select':
        // <select> value update needs to occur after <option> children
        // reconciliation
        postUpdateWrapper(domElement, nextRawProps);
        break;
    }
  }

  function getPossibleStandardName(propName) {
    {
      var lowerCasedName = propName.toLowerCase();

      if (!possibleStandardNames.hasOwnProperty(lowerCasedName)) {
        return null;
      }

      return possibleStandardNames[lowerCasedName] || null;
    }
  }

  function diffHydratedProperties(domElement, tag, rawProps, parentNamespace, rootContainerElement) {
    var isCustomComponentTag;
    var extraAttributeNames;

    {
      suppressHydrationWarning = rawProps[SUPPRESS_HYDRATION_WARNING] === true;
      isCustomComponentTag = isCustomComponent(tag, rawProps);
      validatePropertiesInDevelopment(tag, rawProps);
    } // TODO: Make sure that we check isMounted before firing any of these events.


    switch (tag) {
      case 'dialog':
        listenToNonDelegatedEvent('cancel', domElement);
        listenToNonDelegatedEvent('close', domElement);
        break;

      case 'iframe':
      case 'object':
      case 'embed':
        // We listen to this event in case to ensure emulated bubble
        // listeners still fire for the load event.
        listenToNonDelegatedEvent('load', domElement);
        break;

      case 'video':
      case 'audio':
        // We listen to these events in case to ensure emulated bubble
        // listeners still fire for all the media events.
        for (var i = 0; i < mediaEventTypes.length; i++) {
          listenToNonDelegatedEvent(mediaEventTypes[i], domElement);
        }

        break;

      case 'source':
        // We listen to this event in case to ensure emulated bubble
        // listeners still fire for the error event.
        listenToNonDelegatedEvent('error', domElement);
        break;

      case 'img':
      case 'image':
      case 'link':
        // We listen to these events in case to ensure emulated bubble
        // listeners still fire for error and load events.
        listenToNonDelegatedEvent('error', domElement);
        listenToNonDelegatedEvent('load', domElement);
        break;

      case 'details':
        // We listen to this event in case to ensure emulated bubble
        // listeners still fire for the toggle event.
        listenToNonDelegatedEvent('toggle', domElement);
        break;

      case 'input':
        initWrapperState(domElement, rawProps); // We listen to this event in case to ensure emulated bubble
        // listeners still fire for the invalid event.

        listenToNonDelegatedEvent('invalid', domElement);

        break;

      case 'option':
        validateProps(domElement, rawProps);
        break;

      case 'select':
        initWrapperState$1(domElement, rawProps); // We listen to this event in case to ensure emulated bubble
        // listeners still fire for the invalid event.

        listenToNonDelegatedEvent('invalid', domElement);

        break;

      case 'textarea':
        initWrapperState$2(domElement, rawProps); // We listen to this event in case to ensure emulated bubble
        // listeners still fire for the invalid event.

        listenToNonDelegatedEvent('invalid', domElement);

        break;
    }

    assertValidProps(tag, rawProps);

    {
      extraAttributeNames = new Set();
      var attributes = domElement.attributes;

      for (var _i = 0; _i < attributes.length; _i++) {
        var name = attributes[_i].name.toLowerCase();

        switch (name) {
          // Built-in SSR attribute is allowed
          case 'data-reactroot':
            break;
          // Controlled attributes are not validated
          // TODO: Only ignore them on controlled tags.

          case 'value':
            break;

          case 'checked':
            break;

          case 'selected':
            break;

          default:
            // Intentionally use the original name.
            // See discussion in https://github.com/facebook/react/pull/10676.
            extraAttributeNames.add(attributes[_i].name);
        }
      }
    }

    var updatePayload = null;

    for (var propKey in rawProps) {
      if (!rawProps.hasOwnProperty(propKey)) {
        continue;
      }

      var nextProp = rawProps[propKey];

      if (propKey === CHILDREN) {
        // For text content children we compare against textContent. This
        // might match additional HTML that is hidden when we read it using
        // textContent. E.g. "foo" will match "f<span>oo</span>" but that still
        // satisfies our requirement. Our requirement is not to produce perfect
        // HTML and attributes. Ideally we should preserve structure but it's
        // ok not to if the visible content is still enough to indicate what
        // even listeners these nodes might be wired up to.
        // TODO: Warn if there is more than a single textNode as a child.
        // TODO: Should we use domElement.firstChild.nodeValue to compare?
        if (typeof nextProp === 'string') {
          if (domElement.textContent !== nextProp) {
            if ( !suppressHydrationWarning) {
              warnForTextDifference(domElement.textContent, nextProp);
            }

            updatePayload = [CHILDREN, nextProp];
          }
        } else if (typeof nextProp === 'number') {
          if (domElement.textContent !== '' + nextProp) {
            if ( !suppressHydrationWarning) {
              warnForTextDifference(domElement.textContent, nextProp);
            }

            updatePayload = [CHILDREN, '' + nextProp];
          }
        }
      } else if (registrationNameDependencies.hasOwnProperty(propKey)) {
        if (nextProp != null) {
          if ( typeof nextProp !== 'function') {
            warnForInvalidEventListener(propKey, nextProp);
          }

          if (propKey === 'onScroll') {
            listenToNonDelegatedEvent('scroll', domElement);
          }
        }
      } else if ( // Convince Flow we've calculated it (it's DEV-only in this method.)
      typeof isCustomComponentTag === 'boolean') {
        // Validate that the properties correspond to their expected values.
        var serverValue = void 0;
        var propertyInfo = getPropertyInfo(propKey);

        if (suppressHydrationWarning) ; else if (propKey === SUPPRESS_CONTENT_EDITABLE_WARNING || propKey === SUPPRESS_HYDRATION_WARNING || // Controlled attributes are not validated
        // TODO: Only ignore them on controlled tags.
        propKey === 'value' || propKey === 'checked' || propKey === 'selected') ; else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
          var serverHTML = domElement.innerHTML;
          var nextHtml = nextProp ? nextProp[HTML$1] : undefined;

          if (nextHtml != null) {
            var expectedHTML = normalizeHTML(domElement, nextHtml);

            if (expectedHTML !== serverHTML) {
              warnForPropDifference(propKey, serverHTML, expectedHTML);
            }
          }
        } else if (propKey === STYLE) {
          // $FlowFixMe - Should be inferred as not undefined.
          extraAttributeNames.delete(propKey);

          if (canDiffStyleForHydrationWarning) {
            var expectedStyle = createDangerousStringForStyles(nextProp);
            serverValue = domElement.getAttribute('style');

            if (expectedStyle !== serverValue) {
              warnForPropDifference(propKey, serverValue, expectedStyle);
            }
          }
        } else if (isCustomComponentTag) {
          // $FlowFixMe - Should be inferred as not undefined.
          extraAttributeNames.delete(propKey.toLowerCase());
          serverValue = getValueForAttribute(domElement, propKey, nextProp);

          if (nextProp !== serverValue) {
            warnForPropDifference(propKey, serverValue, nextProp);
          }
        } else if (!shouldIgnoreAttribute(propKey, propertyInfo, isCustomComponentTag) && !shouldRemoveAttribute(propKey, nextProp, propertyInfo, isCustomComponentTag)) {
          var isMismatchDueToBadCasing = false;

          if (propertyInfo !== null) {
            // $FlowFixMe - Should be inferred as not undefined.
            extraAttributeNames.delete(propertyInfo.attributeName);
            serverValue = getValueForProperty(domElement, propKey, nextProp, propertyInfo);
          } else {
            var ownNamespace = parentNamespace;

            if (ownNamespace === HTML_NAMESPACE$1) {
              ownNamespace = getIntrinsicNamespace(tag);
            }

            if (ownNamespace === HTML_NAMESPACE$1) {
              // $FlowFixMe - Should be inferred as not undefined.
              extraAttributeNames.delete(propKey.toLowerCase());
            } else {
              var standardName = getPossibleStandardName(propKey);

              if (standardName !== null && standardName !== propKey) {
                // If an SVG prop is supplied with bad casing, it will
                // be successfully parsed from HTML, but will produce a mismatch
                // (and would be incorrectly rendered on the client).
                // However, we already warn about bad casing elsewhere.
                // So we'll skip the misleading extra mismatch warning in this case.
                isMismatchDueToBadCasing = true; // $FlowFixMe - Should be inferred as not undefined.

                extraAttributeNames.delete(standardName);
              } // $FlowFixMe - Should be inferred as not undefined.


              extraAttributeNames.delete(propKey);
            }

            serverValue = getValueForAttribute(domElement, propKey, nextProp);
          }

          if (nextProp !== serverValue && !isMismatchDueToBadCasing) {
            warnForPropDifference(propKey, serverValue, nextProp);
          }
        }
      }
    }

    {
      // $FlowFixMe - Should be inferred as not undefined.
      if (extraAttributeNames.size > 0 && !suppressHydrationWarning) {
        // $FlowFixMe - Should be inferred as not undefined.
        warnForExtraAttributes(extraAttributeNames);
      }
    }

    switch (tag) {
      case 'input':
        // TODO: Make sure we check if this is still unmounted or do any clean
        // up necessary since we never stop tracking anymore.
        track(domElement);
        postMountWrapper(domElement, rawProps, true);
        break;

      case 'textarea':
        // TODO: Make sure we check if this is still unmounted or do any clean
        // up necessary since we never stop tracking anymore.
        track(domElement);
        postMountWrapper$3(domElement);
        break;

      case 'select':
      case 'option':
        // For input and textarea we current always set the value property at
        // post mount to force it to diverge from attributes. However, for
        // option and select we don't quite do the same thing and select
        // is not resilient to the DOM state changing so we don't do that here.
        // TODO: Consider not doing this for input and textarea.
        break;

      default:
        if (typeof rawProps.onClick === 'function') {
          // TODO: This cast may not be sound for SVG, MathML or custom elements.
          trapClickOnNonInteractiveElement(domElement);
        }

        break;
    }

    return updatePayload;
  }
  function diffHydratedText(textNode, text) {
    var isDifferent = textNode.nodeValue !== text;
    return isDifferent;
  }
  function warnForUnmatchedText(textNode, text) {
    {
      warnForTextDifference(textNode.nodeValue, text);
    }
  }
  function warnForDeletedHydratableElement(parentNode, child) {
    {
      if (didWarnInvalidHydration) {
        return;
      }

      didWarnInvalidHydration = true;

      error('Did not expect server HTML to contain a <%s> in <%s>.', child.nodeName.toLowerCase(), parentNode.nodeName.toLowerCase());
    }
  }
  function warnForDeletedHydratableText(parentNode, child) {
    {
      if (didWarnInvalidHydration) {
        return;
      }

      didWarnInvalidHydration = true;

      error('Did not expect server HTML to contain the text node "%s" in <%s>.', child.nodeValue, parentNode.nodeName.toLowerCase());
    }
  }
  function warnForInsertedHydratedElement(parentNode, tag, props) {
    {
      if (didWarnInvalidHydration) {
        return;
      }

      didWarnInvalidHydration = true;

      error('Expected server HTML to contain a matching <%s> in <%s>.', tag, parentNode.nodeName.toLowerCase());
    }
  }
  function warnForInsertedHydratedText(parentNode, text) {
    {
      if (text === '') {
        // We expect to insert empty text nodes since they're not represented in
        // the HTML.
        // TODO: Remove this special case if we can just avoid inserting empty
        // text nodes.
        return;
      }

      if (didWarnInvalidHydration) {
        return;
      }

      didWarnInvalidHydration = true;

      error('Expected server HTML to contain a matching text node for "%s" in <%s>.', text, parentNode.nodeName.toLowerCase());
    }
  }
  function restoreControlledState$3(domElement, tag, props) {
    switch (tag) {
      case 'input':
        restoreControlledState(domElement, props);
        return;

      case 'textarea':
        restoreControlledState$2(domElement, props);
        return;

      case 'select':
        restoreControlledState$1(domElement, props);
        return;
    }
  }