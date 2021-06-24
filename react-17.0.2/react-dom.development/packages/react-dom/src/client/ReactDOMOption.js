  var didWarnSelectedSetOnOption = false;
  var didWarnInvalidChild = false;

  function flattenChildren(children) {
    var content = ''; // Flatten children. We'll warn if they are invalid
    // during validateProps() which runs for hydration too.
    // Note that this would throw on non-element objects.
    // Elements are stringified (which is normally irrelevant
    // but matters for <fbt>).

    React.Children.forEach(children, function (child) {
      if (child == null) {
        return;
      }

      content += child; // Note: we don't warn about invalid children here.
      // Instead, this is done separately below so that
      // it happens during the hydration code path too.
    });
    return content;
  }
  /**
   * Implements an <option> host component that warns when `selected` is set.
   */


  function validateProps(element, props) {
    {
      // This mirrors the code path above, but runs for hydration too.
      // Warn about invalid children here so that client and hydration are consistent.
      // TODO: this seems like it could cause a DEV-only throw for hydration
      // if children contains a non-element object. We should try to avoid that.
      if (typeof props.children === 'object' && props.children !== null) {
        React.Children.forEach(props.children, function (child) {
          if (child == null) {
            return;
          }

          if (typeof child === 'string' || typeof child === 'number') {
            return;
          }

          if (typeof child.type !== 'string') {
            return;
          }

          if (!didWarnInvalidChild) {
            didWarnInvalidChild = true;

            error('Only strings and numbers are supported as <option> children.');
          }
        });
      } // TODO: Remove support for `selected` in <option>.


      if (props.selected != null && !didWarnSelectedSetOnOption) {
        error('Use the `defaultValue` or `value` props on <select> instead of ' + 'setting `selected` on <option>.');

        didWarnSelectedSetOnOption = true;
      }
    }
  }
  function postMountWrapper$1(element, props) {
    // value="" should make a value attribute (#6219)
    if (props.value != null) {
      element.setAttribute('value', toString(getToStringValue(props.value)));
    }
  }
  function getHostProps$1(element, props) {
    var hostProps = _assign({
      children: undefined
    }, props);

    var content = flattenChildren(props.children);

    if (content) {
      hostProps.children = content;
    }

    return hostProps;
  }