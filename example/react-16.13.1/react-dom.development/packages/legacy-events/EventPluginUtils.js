  var getFiberCurrentPropsFromNode = null;
  var getInstanceFromNode = null;
  var getNodeFromInstance = null;
  function setComponentTree(getFiberCurrentPropsFromNodeImpl, getInstanceFromNodeImpl, getNodeFromInstanceImpl) {
    getFiberCurrentPropsFromNode = getFiberCurrentPropsFromNodeImpl;
    getInstanceFromNode = getInstanceFromNodeImpl;
    getNodeFromInstance = getNodeFromInstanceImpl;

    {
      if (!getNodeFromInstance || !getInstanceFromNode) {
        error('EventPluginUtils.setComponentTree(...): Injected ' + 'module is missing getNodeFromInstance or getInstanceFromNode.');
      }
    }
  }
  var validateEventDispatches;

  {
    validateEventDispatches = function (event) {
      var dispatchListeners = event._dispatchListeners;
      var dispatchInstances = event._dispatchInstances;
      var listenersIsArr = Array.isArray(dispatchListeners);
      var listenersLen = listenersIsArr ? dispatchListeners.length : dispatchListeners ? 1 : 0;
      var instancesIsArr = Array.isArray(dispatchInstances);
      var instancesLen = instancesIsArr ? dispatchInstances.length : dispatchInstances ? 1 : 0;

      if (instancesIsArr !== listenersIsArr || instancesLen !== listenersLen) {
        error('EventPluginUtils: Invalid `event`.');
      }
    };
  }
  /**
   * Dispatch the event to the listener.
   * @param {SyntheticEvent} event SyntheticEvent to handle
   * @param {function} listener Application-level callback
   * @param {*} inst Internal component instance
   */


  function executeDispatch(event, listener, inst) {
    var type = event.type || 'unknown-event';
    event.currentTarget = getNodeFromInstance(inst);
    invokeGuardedCallbackAndCatchFirstError(type, listener, undefined, event);
    event.currentTarget = null;
  }
  /**
   * Standard/simple iteration through an event's collected dispatches.
   */

  function executeDispatchesInOrder(event) {
    var dispatchListeners = event._dispatchListeners;
    var dispatchInstances = event._dispatchInstances;

    {
      validateEventDispatches(event);
    }

    if (Array.isArray(dispatchListeners)) {
      for (var i = 0; i < dispatchListeners.length; i++) {
        if (event.isPropagationStopped()) {
          break;
        } // Listeners and Instances are two parallel arrays that are always in sync.


        executeDispatch(event, dispatchListeners[i], dispatchInstances[i]);
      }
    } else if (dispatchListeners) {
      executeDispatch(event, dispatchListeners, dispatchInstances);
    }

    event._dispatchListeners = null;
    event._dispatchInstances = null;
  }