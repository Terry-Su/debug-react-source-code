  function resolveDefaultProps(Component, baseProps) {
    if (Component && Component.defaultProps) {
      // Resolve default props. Taken from ReactElement
      var props = _assign({}, baseProps);

      var defaultProps = Component.defaultProps;

      for (var propName in defaultProps) {
        if (props[propName] === undefined) {
          props[propName] = defaultProps[propName];
        }
      }

      return props;
    }

    return baseProps;
  }
  function readLazyComponentType(lazyComponent) {
    initializeLazyComponentType(lazyComponent);

    if (lazyComponent._status !== Resolved) {
      throw lazyComponent._result;
    }

    return lazyComponent._result;
  }