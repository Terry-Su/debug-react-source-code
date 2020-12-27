
  function isInteractive(tag) {
    return tag === 'button' || tag === 'input' || tag === 'select' || tag === 'textarea';
  }

  function shouldPreventMouseEvent(name, type, props) {
    switch (name) {
      case 'onClick':
      case 'onClickCapture':
      case 'onDoubleClick':
      case 'onDoubleClickCapture':
      case 'onMouseDown':
      case 'onMouseDownCapture':
      case 'onMouseMove':
      case 'onMouseMoveCapture':
      case 'onMouseUp':
      case 'onMouseUpCapture':
      case 'onMouseEnter':
        return !!(props.disabled && isInteractive(type));

      default:
        return false;
    }
  }
  /**
   * @param {object} inst The instance, which is the source of events.
   * @param {string} registrationName Name of listener (e.g. `onClick`).
   * @return {?function} The stored callback.
   */


  function getListener(inst, registrationName) {
    var stateNode = inst.stateNode;

    if (stateNode === null) {
      // Work in progress (ex: onload events in incremental mode).
      return null;
    }

    var props = getFiberCurrentPropsFromNode(stateNode);

    if (props === null) {
      // Work in progress.
      return null;
    }

    var listener = props[registrationName];

    if (shouldPreventMouseEvent(registrationName, inst.type, props)) {
      return null;
    }

    if (!(!listener || typeof listener === 'function')) {
      {
        throw Error( "Expected `" + registrationName + "` listener to be a function, instead got a value of `" + typeof listener + "` type." );
      }
    }

    return listener;
  }