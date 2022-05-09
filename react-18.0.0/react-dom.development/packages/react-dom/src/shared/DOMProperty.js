  // A reserved attribute.
  // It is handled by React separately and shouldn't be written to the DOM.
  var RESERVED = 0; // A simple string attribute.
  // Attributes that aren't in the filter are presumed to have this type.

  var STRING = 1; // A string attribute that accepts booleans in React. In HTML, these are called
  // "enumerated" attributes with "true" and "false" as possible values.
  // When true, it should be set to a "true" string.
  // When false, it should be set to a "false" string.

  var BOOLEANISH_STRING = 2; // A real boolean attribute.
  // When true, it should be present (set either to an empty string or its name).
  // When false, it should be omitted.

  var BOOLEAN = 3; // An attribute that can be used as a flag as well as with a value.
  // When true, it should be present (set either to an empty string or its name).
  // When false, it should be omitted.
  // For any other value, should be present with that value.

  var OVERLOADED_BOOLEAN = 4; // An attribute that must be numeric or parse as a numeric.
  // When falsy, it should be removed.

  var NUMERIC = 5; // An attribute that must be positive numeric or parse as a positive numeric.
  // When falsy, it should be removed.

  var POSITIVE_NUMERIC = 6;

  /* eslint-disable max-len */
  var ATTRIBUTE_NAME_START_CHAR = ":A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD";
  /* eslint-enable max-len */

  var ATTRIBUTE_NAME_CHAR = ATTRIBUTE_NAME_START_CHAR + "\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040";
  var VALID_ATTRIBUTE_NAME_REGEX = new RegExp('^[' + ATTRIBUTE_NAME_START_CHAR + '][' + ATTRIBUTE_NAME_CHAR + ']*$');
  var illegalAttributeNameCache = {};
  var validatedAttributeNameCache = {};
  function isAttributeNameSafe(attributeName) {
    if (hasOwnProperty.call(validatedAttributeNameCache, attributeName)) {
      return true;
    }

    if (hasOwnProperty.call(illegalAttributeNameCache, attributeName)) {
      return false;
    }

    if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName)) {
      validatedAttributeNameCache[attributeName] = true;
      return true;
    }

    illegalAttributeNameCache[attributeName] = true;

    {
      error('Invalid attribute name: `%s`', attributeName);
    }

    return false;
  }
  function shouldIgnoreAttribute(name, propertyInfo, isCustomComponentTag) {
    if (propertyInfo !== null) {
      return propertyInfo.type === RESERVED;
    }

    if (isCustomComponentTag) {
      return false;
    }

    if (name.length > 2 && (name[0] === 'o' || name[0] === 'O') && (name[1] === 'n' || name[1] === 'N')) {
      return true;
    }

    return false;
  }
  function shouldRemoveAttributeWithWarning(name, value, propertyInfo, isCustomComponentTag) {
    if (propertyInfo !== null && propertyInfo.type === RESERVED) {
      return false;
    }

    switch (typeof value) {
      case 'function': // $FlowIssue symbol is perfectly valid here

      case 'symbol':
        // eslint-disable-line
        return true;

      case 'boolean':
        {
          if (isCustomComponentTag) {
            return false;
          }

          if (propertyInfo !== null) {
            return !propertyInfo.acceptsBooleans;
          } else {
            var prefix = name.toLowerCase().slice(0, 5);
            return prefix !== 'data-' && prefix !== 'aria-';
          }
        }

      default:
        return false;
    }
  }
  function shouldRemoveAttribute(name, value, propertyInfo, isCustomComponentTag) {
    if (value === null || typeof value === 'undefined') {
      return true;
    }

    if (shouldRemoveAttributeWithWarning(name, value, propertyInfo, isCustomComponentTag)) {
      return true;
    }

    if (isCustomComponentTag) {
      return false;
    }

    if (propertyInfo !== null) {

      switch (propertyInfo.type) {
        case BOOLEAN:
          return !value;

        case OVERLOADED_BOOLEAN:
          return value === false;

        case NUMERIC:
          return isNaN(value);

        case POSITIVE_NUMERIC:
          return isNaN(value) || value < 1;
      }
    }

    return false;
  }
  function getPropertyInfo(name) {
    return properties.hasOwnProperty(name) ? properties[name] : null;
  }

  function PropertyInfoRecord(name, type, mustUseProperty, attributeName, attributeNamespace, sanitizeURL, removeEmptyString) {
    this.acceptsBooleans = type === BOOLEANISH_STRING || type === BOOLEAN || type === OVERLOADED_BOOLEAN;
    this.attributeName = attributeName;
    this.attributeNamespace = attributeNamespace;
    this.mustUseProperty = mustUseProperty;
    this.propertyName = name;
    this.type = type;
    this.sanitizeURL = sanitizeURL;
    this.removeEmptyString = removeEmptyString;
  } // When adding attributes to this list, be sure to also add them to
  // the `possibleStandardNames` module to ensure casing and incorrect
  // name warnings.


  var properties = {}; // These props are reserved by React. They shouldn't be written to the DOM.

  var reservedProps = ['children', 'dangerouslySetInnerHTML', // TODO: This prevents the assignment of defaultValue to regular
  // elements (not just inputs). Now that ReactDOMInput assigns to the
  // defaultValue property -- do we need this?
  'defaultValue', 'defaultChecked', 'innerHTML', 'suppressContentEditableWarning', 'suppressHydrationWarning', 'style'];

  {
    reservedProps.push('innerText', 'textContent');
  }

  reservedProps.forEach(function (name) {
    properties[name] = new PropertyInfoRecord(name, RESERVED, false, // mustUseProperty
    name, // attributeName
    null, // attributeNamespace
    false, // sanitizeURL
    false);
  }); // A few React string attributes have a different name.
  // This is a mapping from React prop names to the attribute names.

  [['acceptCharset', 'accept-charset'], ['className', 'class'], ['htmlFor', 'for'], ['httpEquiv', 'http-equiv']].forEach(function (_ref) {
    var name = _ref[0],
        attributeName = _ref[1];
    properties[name] = new PropertyInfoRecord(name, STRING, false, // mustUseProperty
    attributeName, // attributeName
    null, // attributeNamespace
    false, // sanitizeURL
    false);
  }); // These are "enumerated" HTML attributes that accept "true" and "false".
  // In React, we let users pass `true` and `false` even though technically
  // these aren't boolean attributes (they are coerced to strings).

  ['contentEditable', 'draggable', 'spellCheck', 'value'].forEach(function (name) {
    properties[name] = new PropertyInfoRecord(name, BOOLEANISH_STRING, false, // mustUseProperty
    name.toLowerCase(), // attributeName
    null, // attributeNamespace
    false, // sanitizeURL
    false);
  }); // These are "enumerated" SVG attributes that accept "true" and "false".
  // In React, we let users pass `true` and `false` even though technically
  // these aren't boolean attributes (they are coerced to strings).
  // Since these are SVG attributes, their attribute names are case-sensitive.

  ['autoReverse', 'externalResourcesRequired', 'focusable', 'preserveAlpha'].forEach(function (name) {
    properties[name] = new PropertyInfoRecord(name, BOOLEANISH_STRING, false, // mustUseProperty
    name, // attributeName
    null, // attributeNamespace
    false, // sanitizeURL
    false);
  }); // These are HTML boolean attributes.

  ['allowFullScreen', 'async', // Note: there is a special case that prevents it from being written to the DOM
  // on the client side because the browsers are inconsistent. Instead we call focus().
  'autoFocus', 'autoPlay', 'controls', 'default', 'defer', 'disabled', 'disablePictureInPicture', 'disableRemotePlayback', 'formNoValidate', 'hidden', 'loop', 'noModule', 'noValidate', 'open', 'playsInline', 'readOnly', 'required', 'reversed', 'scoped', 'seamless', // Microdata
  'itemScope'].forEach(function (name) {
    properties[name] = new PropertyInfoRecord(name, BOOLEAN, false, // mustUseProperty
    name.toLowerCase(), // attributeName
    null, // attributeNamespace
    false, // sanitizeURL
    false);
  }); // These are the few React props that we set as DOM properties
  // rather than attributes. These are all booleans.

  ['checked', // Note: `option.selected` is not updated if `select.multiple` is
  // disabled with `removeAttribute`. We have special logic for handling this.
  'multiple', 'muted', 'selected' // NOTE: if you add a camelCased prop to this list,
  // you'll need to set attributeName to name.toLowerCase()
  // instead in the assignment below.
  ].forEach(function (name) {
    properties[name] = new PropertyInfoRecord(name, BOOLEAN, true, // mustUseProperty
    name, // attributeName
    null, // attributeNamespace
    false, // sanitizeURL
    false);
  }); // These are HTML attributes that are "overloaded booleans": they behave like
  // booleans, but can also accept a string value.

  ['capture', 'download' // NOTE: if you add a camelCased prop to this list,
  // you'll need to set attributeName to name.toLowerCase()
  // instead in the assignment below.
  ].forEach(function (name) {
    properties[name] = new PropertyInfoRecord(name, OVERLOADED_BOOLEAN, false, // mustUseProperty
    name, // attributeName
    null, // attributeNamespace
    false, // sanitizeURL
    false);
  }); // These are HTML attributes that must be positive numbers.

  ['cols', 'rows', 'size', 'span' // NOTE: if you add a camelCased prop to this list,
  // you'll need to set attributeName to name.toLowerCase()
  // instead in the assignment below.
  ].forEach(function (name) {
    properties[name] = new PropertyInfoRecord(name, POSITIVE_NUMERIC, false, // mustUseProperty
    name, // attributeName
    null, // attributeNamespace
    false, // sanitizeURL
    false);
  }); // These are HTML attributes that must be numbers.

  ['rowSpan', 'start'].forEach(function (name) {
    properties[name] = new PropertyInfoRecord(name, NUMERIC, false, // mustUseProperty
    name.toLowerCase(), // attributeName
    null, // attributeNamespace
    false, // sanitizeURL
    false);
  });
  var CAMELIZE = /[\-\:]([a-z])/g;

  var capitalize = function (token) {
    return token[1].toUpperCase();
  }; // This is a list of all SVG attributes that need special casing, namespacing,
  // or boolean value assignment. Regular attributes that just accept strings
  // and have the same names are omitted, just like in the HTML attribute filter.
  // Some of these attributes can be hard to find. This list was created by
  // scraping the MDN documentation.


  ['accent-height', 'alignment-baseline', 'arabic-form', 'baseline-shift', 'cap-height', 'clip-path', 'clip-rule', 'color-interpolation', 'color-interpolation-filters', 'color-profile', 'color-rendering', 'dominant-baseline', 'enable-background', 'fill-opacity', 'fill-rule', 'flood-color', 'flood-opacity', 'font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant', 'font-weight', 'glyph-name', 'glyph-orientation-horizontal', 'glyph-orientation-vertical', 'horiz-adv-x', 'horiz-origin-x', 'image-rendering', 'letter-spacing', 'lighting-color', 'marker-end', 'marker-mid', 'marker-start', 'overline-position', 'overline-thickness', 'paint-order', 'panose-1', 'pointer-events', 'rendering-intent', 'shape-rendering', 'stop-color', 'stop-opacity', 'strikethrough-position', 'strikethrough-thickness', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke-width', 'text-anchor', 'text-decoration', 'text-rendering', 'underline-position', 'underline-thickness', 'unicode-bidi', 'unicode-range', 'units-per-em', 'v-alphabetic', 'v-hanging', 'v-ideographic', 'v-mathematical', 'vector-effect', 'vert-adv-y', 'vert-origin-x', 'vert-origin-y', 'word-spacing', 'writing-mode', 'xmlns:xlink', 'x-height' // NOTE: if you add a camelCased prop to this list,
  // you'll need to set attributeName to name.toLowerCase()
  // instead in the assignment below.
  ].forEach(function (attributeName) {
    var name = attributeName.replace(CAMELIZE, capitalize);
    properties[name] = new PropertyInfoRecord(name, STRING, false, // mustUseProperty
    attributeName, null, // attributeNamespace
    false, // sanitizeURL
    false);
  }); // String SVG attributes with the xlink namespace.

  ['xlink:actuate', 'xlink:arcrole', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type' // NOTE: if you add a camelCased prop to this list,
  // you'll need to set attributeName to name.toLowerCase()
  // instead in the assignment below.
  ].forEach(function (attributeName) {
    var name = attributeName.replace(CAMELIZE, capitalize);
    properties[name] = new PropertyInfoRecord(name, STRING, false, // mustUseProperty
    attributeName, 'http://www.w3.org/1999/xlink', false, // sanitizeURL
    false);
  }); // String SVG attributes with the xml namespace.

  ['xml:base', 'xml:lang', 'xml:space' // NOTE: if you add a camelCased prop to this list,
  // you'll need to set attributeName to name.toLowerCase()
  // instead in the assignment below.
  ].forEach(function (attributeName) {
    var name = attributeName.replace(CAMELIZE, capitalize);
    properties[name] = new PropertyInfoRecord(name, STRING, false, // mustUseProperty
    attributeName, 'http://www.w3.org/XML/1998/namespace', false, // sanitizeURL
    false);
  }); // These attribute exists both in HTML and SVG.
  // The attribute name is case-sensitive in SVG so we can't just use
  // the React name like we do for attributes that exist only in HTML.

  ['tabIndex', 'crossOrigin'].forEach(function (attributeName) {
    properties[attributeName] = new PropertyInfoRecord(attributeName, STRING, false, // mustUseProperty
    attributeName.toLowerCase(), // attributeName
    null, // attributeNamespace
    false, // sanitizeURL
    false);
  }); // These attributes accept URLs. These must not allow javascript: URLS.
  // These will also need to accept Trusted Types object in the future.

  var xlinkHref = 'xlinkHref';
  properties[xlinkHref] = new PropertyInfoRecord('xlinkHref', STRING, false, // mustUseProperty
  'xlink:href', 'http://www.w3.org/1999/xlink', true, // sanitizeURL
  false);
  ['src', 'href', 'action', 'formAction'].forEach(function (attributeName) {
    properties[attributeName] = new PropertyInfoRecord(attributeName, STRING, false, // mustUseProperty
    attributeName.toLowerCase(), // attributeName
    null, // attributeNamespace
    true, // sanitizeURL
    true);
  });