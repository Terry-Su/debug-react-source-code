  var ReactDebugCurrentFrame$2 = null;
  var ReactControlledValuePropTypes = {
    checkPropTypes: null
  };

  {
    ReactDebugCurrentFrame$2 = ReactSharedInternals.ReactDebugCurrentFrame;
    var hasReadOnlyValue = {
      button: true,
      checkbox: true,
      image: true,
      hidden: true,
      radio: true,
      reset: true,
      submit: true
    };
    var propTypes = {
      value: function (props, propName, componentName) {
        if (hasReadOnlyValue[props.type] || props.onChange || props.readOnly || props.disabled || props[propName] == null || enableDeprecatedFlareAPI ) {
          return null;
        }

        return new Error('You provided a `value` prop to a form field without an ' + '`onChange` handler. This will render a read-only field. If ' + 'the field should be mutable use `defaultValue`. Otherwise, ' + 'set either `onChange` or `readOnly`.');
      },
      checked: function (props, propName, componentName) {
        if (props.onChange || props.readOnly || props.disabled || props[propName] == null || enableDeprecatedFlareAPI ) {
          return null;
        }

        return new Error('You provided a `checked` prop to a form field without an ' + '`onChange` handler. This will render a read-only field. If ' + 'the field should be mutable use `defaultChecked`. Otherwise, ' + 'set either `onChange` or `readOnly`.');
      }
    };
    /**
     * Provide a linked `value` attribute for controlled forms. You should not use
     * this outside of the ReactDOM controlled form components.
     */

    ReactControlledValuePropTypes.checkPropTypes = function (tagName, props) {
      checkPropTypes_1(propTypes, props, 'prop', tagName, ReactDebugCurrentFrame$2.getStackAddendum);
    };
  }