  var didWarnSelectedSetOnOption = false;
  var didWarnInvalidChild = false;
  var didWarnInvalidInnerHTML = false;
  /**
   * Implements an <option> host component that warns when `selected` is set.
   */

  function validateProps(element, props) {
    {
      // If a value is not provided, then the children must be simple.
      if (props.value == null) {
        if (typeof props.children === 'object' && props.children !== null) {
          React.Children.forEach(props.children, function (child) {
            if (child == null) {
              return;
            }

            if (typeof child === 'string' || typeof child === 'number') {
              return;
            }

            if (!didWarnInvalidChild) {
              didWarnInvalidChild = true;

              error('Cannot infer the option value of complex children. ' + 'Pass a `value` prop or use a plain string as children to <option>.');
            }
          });
        } else if (props.dangerouslySetInnerHTML != null) {
          if (!didWarnInvalidInnerHTML) {
            didWarnInvalidInnerHTML = true;

            error('Pass a `value` prop if you set dangerouslyInnerHTML so React knows ' + 'which value should be selected.');
          }
        }
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