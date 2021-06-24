  var warnedProperties = {};
  var rARIA = new RegExp('^(aria)-[' + ATTRIBUTE_NAME_CHAR + ']*$');
  var rARIACamel = new RegExp('^(aria)[A-Z][' + ATTRIBUTE_NAME_CHAR + ']*$');
  var hasOwnProperty$1 = Object.prototype.hasOwnProperty;

  function validateProperty(tagName, name) {
    {
      if (hasOwnProperty$1.call(warnedProperties, name) && warnedProperties[name]) {
        return true;
      }

      if (rARIACamel.test(name)) {
        var ariaName = 'aria-' + name.slice(4).toLowerCase();
        var correctName = ariaProperties.hasOwnProperty(ariaName) ? ariaName : null; // If this is an aria-* attribute, but is not listed in the known DOM
        // DOM properties, then it is an invalid aria-* attribute.

        if (correctName == null) {
          error('Invalid ARIA attribute `%s`. ARIA attributes follow the pattern aria-* and must be lowercase.', name);

          warnedProperties[name] = true;
          return true;
        } // aria-* attributes should be lowercase; suggest the lowercase version.


        if (name !== correctName) {
          error('Invalid ARIA attribute `%s`. Did you mean `%s`?', name, correctName);

          warnedProperties[name] = true;
          return true;
        }
      }

      if (rARIA.test(name)) {
        var lowerCasedName = name.toLowerCase();
        var standardName = ariaProperties.hasOwnProperty(lowerCasedName) ? lowerCasedName : null; // If this is an aria-* attribute, but is not listed in the known DOM
        // DOM properties, then it is an invalid aria-* attribute.

        if (standardName == null) {
          warnedProperties[name] = true;
          return false;
        } // aria-* attributes should be lowercase; suggest the lowercase version.


        if (name !== standardName) {
          error('Unknown ARIA attribute `%s`. Did you mean `%s`?', name, standardName);

          warnedProperties[name] = true;
          return true;
        }
      }
    }

    return true;
  }

  function warnInvalidARIAProps(type, props) {
    {
      var invalidProps = [];

      for (var key in props) {
        var isValid = validateProperty(type, key);

        if (!isValid) {
          invalidProps.push(key);
        }
      }

      var unknownPropString = invalidProps.map(function (prop) {
        return '`' + prop + '`';
      }).join(', ');

      if (invalidProps.length === 1) {
        error('Invalid aria prop %s on <%s> tag. ' + 'For details, see https://reactjs.org/link/invalid-aria-props', unknownPropString, type);
      } else if (invalidProps.length > 1) {
        error('Invalid aria props %s on <%s> tag. ' + 'For details, see https://reactjs.org/link/invalid-aria-props', unknownPropString, type);
      }
    }
  }

  function validateProperties(type, props) {
    if (isCustomComponent(type, props)) {
      return;
    }

    warnInvalidARIAProps(type, props);
  }