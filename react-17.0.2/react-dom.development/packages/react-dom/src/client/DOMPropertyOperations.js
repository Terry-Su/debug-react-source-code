
  /**
   * Get the value for a property on a node. Only used in DEV for SSR validation.
   * The "expected" argument is used as a hint of what the expected value is.
   * Some properties have multiple equivalent values.
   */
  function getValueForProperty(node, name, expected, propertyInfo) {
    {
      if (propertyInfo.mustUseProperty) {
        var propertyName = propertyInfo.propertyName;
        return node[propertyName];
      } else {
        if ( propertyInfo.sanitizeURL) {
          // If we haven't fully disabled javascript: URLs, and if
          // the hydration is successful of a javascript: URL, we
          // still want to warn on the client.
          sanitizeURL('' + expected);
        }

        var attributeName = propertyInfo.attributeName;
        var stringValue = null;

        if (propertyInfo.type === OVERLOADED_BOOLEAN) {
          if (node.hasAttribute(attributeName)) {
            var value = node.getAttribute(attributeName);

            if (value === '') {
              return true;
            }

            if (shouldRemoveAttribute(name, expected, propertyInfo, false)) {
              return value;
            }

            if (value === '' + expected) {
              return expected;
            }

            return value;
          }
        } else if (node.hasAttribute(attributeName)) {
          if (shouldRemoveAttribute(name, expected, propertyInfo, false)) {
            // We had an attribute but shouldn't have had one, so read it
            // for the error message.
            return node.getAttribute(attributeName);
          }

          if (propertyInfo.type === BOOLEAN) {
            // If this was a boolean, it doesn't matter what the value is
            // the fact that we have it is the same as the expected.
            return expected;
          } // Even if this property uses a namespace we use getAttribute
          // because we assume its namespaced name is the same as our config.
          // To use getAttributeNS we need the local name which we don't have
          // in our config atm.


          stringValue = node.getAttribute(attributeName);
        }

        if (shouldRemoveAttribute(name, expected, propertyInfo, false)) {
          return stringValue === null ? expected : stringValue;
        } else if (stringValue === '' + expected) {
          return expected;
        } else {
          return stringValue;
        }
      }
    }
  }
  /**
   * Get the value for a attribute on a node. Only used in DEV for SSR validation.
   * The third argument is used as a hint of what the expected value is. Some
   * attributes have multiple equivalent values.
   */

  function getValueForAttribute(node, name, expected) {
    {
      if (!isAttributeNameSafe(name)) {
        return;
      } // If the object is an opaque reference ID, it's expected that
      // the next prop is different than the server value, so just return
      // expected


      if (isOpaqueHydratingObject(expected)) {
        return expected;
      }

      if (!node.hasAttribute(name)) {
        return expected === undefined ? undefined : null;
      }

      var value = node.getAttribute(name);

      if (value === '' + expected) {
        return expected;
      }

      return value;
    }
  }
  /**
   * Sets the value for a property on a node.
   *
   * @param {DOMElement} node
   * @param {string} name
   * @param {*} value
   */

  function setValueForProperty(node, name, value, isCustomComponentTag) {
    var propertyInfo = getPropertyInfo(name);

    if (shouldIgnoreAttribute(name, propertyInfo, isCustomComponentTag)) {
      return;
    }

    if (shouldRemoveAttribute(name, value, propertyInfo, isCustomComponentTag)) {
      value = null;
    } // If the prop isn't in the special list, treat it as a simple attribute.


    if (isCustomComponentTag || propertyInfo === null) {
      if (isAttributeNameSafe(name)) {
        var _attributeName = name;

        if (value === null) {
          node.removeAttribute(_attributeName);
        } else {
          node.setAttribute(_attributeName,  '' + value);
        }
      }

      return;
    }

    var mustUseProperty = propertyInfo.mustUseProperty;

    if (mustUseProperty) {
      var propertyName = propertyInfo.propertyName;

      if (value === null) {
        var type = propertyInfo.type;
        node[propertyName] = type === BOOLEAN ? false : '';
      } else {
        // Contrary to `setAttribute`, object properties are properly
        // `toString`ed by IE8/9.
        node[propertyName] = value;
      }

      return;
    } // The rest are treated as attributes with special cases.


    var attributeName = propertyInfo.attributeName,
        attributeNamespace = propertyInfo.attributeNamespace;

    if (value === null) {
      node.removeAttribute(attributeName);
    } else {
      var _type = propertyInfo.type;
      var attributeValue;

      if (_type === BOOLEAN || _type === OVERLOADED_BOOLEAN && value === true) {
        // If attribute type is boolean, we know for sure it won't be an execution sink
        // and we won't require Trusted Type here.
        attributeValue = '';
      } else {
        // `setAttribute` with objects becomes only `[object]` in IE8/9,
        // ('' + value) makes it output the correct toString()-value.
        {
          attributeValue = '' + value;
        }

        if (propertyInfo.sanitizeURL) {
          sanitizeURL(attributeValue.toString());
        }
      }

      if (attributeNamespace) {
        node.setAttributeNS(attributeNamespace, attributeName, attributeValue);
      } else {
        node.setAttribute(attributeName, attributeValue);
      }
    }
  }