  var hasOwnProperty = Object.prototype.hasOwnProperty;

  var _assign = function (to, from) {
    for (var key in from) {
      if (hasOwnProperty.call(from, key)) {
        to[key] = from[key];
      }
    }
  };

  var assign = Object.assign || function (target, sources) {
    if (target == null) {
      throw new TypeError('Object.assign target cannot be null or undefined');
    }

    var to = Object(target);

    for (var nextIndex = 1; nextIndex < arguments.length; nextIndex++) {
      var nextSource = arguments[nextIndex];

      if (nextSource != null) {
        _assign(to, Object(nextSource));
      }
    }

    return to;
  };