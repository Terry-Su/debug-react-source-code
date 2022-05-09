
  var warnValidStyle = function () {};

  {
    // 'msTransform' is correct, but the other prefixes should be capitalized
    var badVendoredStyleNamePattern = /^(?:webkit|moz|o)[A-Z]/;
    var msPattern$1 = /^-ms-/;
    var hyphenPattern = /-(.)/g; // style values shouldn't contain a semicolon

    var badStyleValueWithSemicolonPattern = /;\s*$/;
    var warnedStyleNames = {};
    var warnedStyleValues = {};
    var warnedForNaNValue = false;
    var warnedForInfinityValue = false;

    var camelize = function (string) {
      return string.replace(hyphenPattern, function (_, character) {
        return character.toUpperCase();
      });
    };

    var warnHyphenatedStyleName = function (name) {
      if (warnedStyleNames.hasOwnProperty(name) && warnedStyleNames[name]) {
        return;
      }

      warnedStyleNames[name] = true;

      error('Unsupported style property %s. Did you mean %s?', name, // As Andi Smith suggests
      // (http://www.andismith.com/blog/2012/02/modernizr-prefixed/), an `-ms` prefix
      // is converted to lowercase `ms`.
      camelize(name.replace(msPattern$1, 'ms-')));
    };

    var warnBadVendoredStyleName = function (name) {
      if (warnedStyleNames.hasOwnProperty(name) && warnedStyleNames[name]) {
        return;
      }

      warnedStyleNames[name] = true;

      error('Unsupported vendor-prefixed style property %s. Did you mean %s?', name, name.charAt(0).toUpperCase() + name.slice(1));
    };

    var warnStyleValueWithSemicolon = function (name, value) {
      if (warnedStyleValues.hasOwnProperty(value) && warnedStyleValues[value]) {
        return;
      }

      warnedStyleValues[value] = true;

      error("Style property values shouldn't contain a semicolon. " + 'Try "%s: %s" instead.', name, value.replace(badStyleValueWithSemicolonPattern, ''));
    };

    var warnStyleValueIsNaN = function (name, value) {
      if (warnedForNaNValue) {
        return;
      }

      warnedForNaNValue = true;

      error('`NaN` is an invalid value for the `%s` css style property.', name);
    };

    var warnStyleValueIsInfinity = function (name, value) {
      if (warnedForInfinityValue) {
        return;
      }

      warnedForInfinityValue = true;

      error('`Infinity` is an invalid value for the `%s` css style property.', name);
    };

    warnValidStyle = function (name, value) {
      if (name.indexOf('-') > -1) {
        warnHyphenatedStyleName(name);
      } else if (badVendoredStyleNamePattern.test(name)) {
        warnBadVendoredStyleName(name);
      } else if (badStyleValueWithSemicolonPattern.test(value)) {
        warnStyleValueWithSemicolon(name, value);
      }

      if (typeof value === 'number') {
        if (isNaN(value)) {
          warnStyleValueIsNaN(name, value);
        } else if (!isFinite(value)) {
          warnStyleValueIsInfinity(name, value);
        }
      }
    };
  }

  var warnValidStyle$1 = warnValidStyle;