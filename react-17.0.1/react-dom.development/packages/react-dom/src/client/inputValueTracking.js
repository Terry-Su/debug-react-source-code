  function isCheckable(elem) {
    var type = elem.type;
    var nodeName = elem.nodeName;
    return nodeName && nodeName.toLowerCase() === 'input' && (type === 'checkbox' || type === 'radio');
  }

  function getTracker(node) {
    return node._valueTracker;
  }

  function detachTracker(node) {
    node._valueTracker = null;
  }

  function getValueFromNode(node) {
    var value = '';

    if (!node) {
      return value;
    }

    if (isCheckable(node)) {
      value = node.checked ? 'true' : 'false';
    } else {
      value = node.value;
    }

    return value;
  }

  function trackValueOnNode(node) {
    var valueField = isCheckable(node) ? 'checked' : 'value';
    var descriptor = Object.getOwnPropertyDescriptor(node.constructor.prototype, valueField);
    var currentValue = '' + node[valueField]; // if someone has already defined a value or Safari, then bail
    // and don't track value will cause over reporting of changes,
    // but it's better then a hard failure
    // (needed for certain tests that spyOn input values and Safari)

    if (node.hasOwnProperty(valueField) || typeof descriptor === 'undefined' || typeof descriptor.get !== 'function' || typeof descriptor.set !== 'function') {
      return;
    }

    var get = descriptor.get,
        set = descriptor.set;
    Object.defineProperty(node, valueField, {
      configurable: true,
      get: function () {
        return get.call(this);
      },
      set: function (value) {
        currentValue = '' + value;
        set.call(this, value);
      }
    }); // We could've passed this the first time
    // but it triggers a bug in IE11 and Edge 14/15.
    // Calling defineProperty() again should be equivalent.
    // https://github.com/facebook/react/issues/11768

    Object.defineProperty(node, valueField, {
      enumerable: descriptor.enumerable
    });
    var tracker = {
      getValue: function () {
        return currentValue;
      },
      setValue: function (value) {
        currentValue = '' + value;
      },
      stopTracking: function () {
        detachTracker(node);
        delete node[valueField];
      }
    };
    return tracker;
  }

  function track(node) {
    if (getTracker(node)) {
      return;
    } // TODO: Once it's just Fiber we can move this to node._wrapperState


    node._valueTracker = trackValueOnNode(node);
  }
  function updateValueIfChanged(node) {
    if (!node) {
      return false;
    }

    var tracker = getTracker(node); // if there is no tracker at this point it's unlikely
    // that trying again will succeed

    if (!tracker) {
      return true;
    }

    var lastValue = tracker.getValue();
    var nextValue = getValueFromNode(node);

    if (nextValue !== lastValue) {
      tracker.setValue(nextValue);
      return true;
    }

    return false;
  }