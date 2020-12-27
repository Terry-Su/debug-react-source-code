  var skipSelectionChangeEvent = canUseDOM && 'documentMode' in document && document.documentMode <= 11;

  function registerEvents$3() {
    registerTwoPhaseEvent('onSelect', ['focusout', 'contextmenu', 'dragend', 'focusin', 'keydown', 'keyup', 'mousedown', 'mouseup', 'selectionchange']);
  }

  var activeElement$1 = null;
  var activeElementInst$1 = null;
  var lastSelection = null;
  var mouseDown = false;
  /**
   * Get an object which is a unique representation of the current selection.
   *
   * The return value will not be consistent across nodes or browsers, but
   * two identical selections on the same node will return identical objects.
   */

  function getSelection$1(node) {
    if ('selectionStart' in node && hasSelectionCapabilities(node)) {
      return {
        start: node.selectionStart,
        end: node.selectionEnd
      };
    } else {
      var win = node.ownerDocument && node.ownerDocument.defaultView || window;
      var selection = win.getSelection();
      return {
        anchorNode: selection.anchorNode,
        anchorOffset: selection.anchorOffset,
        focusNode: selection.focusNode,
        focusOffset: selection.focusOffset
      };
    }
  }
  /**
   * Get document associated with the event target.
   */


  function getEventTargetDocument(eventTarget) {
    return eventTarget.window === eventTarget ? eventTarget.document : eventTarget.nodeType === DOCUMENT_NODE ? eventTarget : eventTarget.ownerDocument;
  }
  /**
   * Poll selection to see whether it's changed.
   *
   * @param {object} nativeEvent
   * @param {object} nativeEventTarget
   * @return {?SyntheticEvent}
   */


  function constructSelectEvent(dispatchQueue, nativeEvent, nativeEventTarget) {
    // Ensure we have the right element, and that the user is not dragging a
    // selection (this matches native `select` event behavior). In HTML5, select
    // fires only on input and textarea thus if there's no focused element we
    // won't dispatch.
    var doc = getEventTargetDocument(nativeEventTarget);

    if (mouseDown || activeElement$1 == null || activeElement$1 !== getActiveElement(doc)) {
      return;
    } // Only fire when selection has actually changed.


    var currentSelection = getSelection$1(activeElement$1);

    if (!lastSelection || !shallowEqual(lastSelection, currentSelection)) {
      lastSelection = currentSelection;
      var listeners = accumulateTwoPhaseListeners(activeElementInst$1, 'onSelect');

      if (listeners.length > 0) {
        var event = new SyntheticEvent('onSelect', 'select', null, nativeEvent, nativeEventTarget);
        dispatchQueue.push({
          event: event,
          listeners: listeners
        });
        event.target = activeElement$1;
      }
    }
  }
  /**
   * This plugin creates an `onSelect` event that normalizes select events
   * across form elements.
   *
   * Supported elements are:
   * - input (see `isTextInputElement`)
   * - textarea
   * - contentEditable
   *
   * This differs from native browser implementations in the following ways:
   * - Fires on contentEditable fields as well as inputs.
   * - Fires for collapsed selection.
   * - Fires after user input.
   */


  function extractEvents$3(dispatchQueue, domEventName, targetInst, nativeEvent, nativeEventTarget, eventSystemFlags, targetContainer) {

    var targetNode = targetInst ? getNodeFromInstance(targetInst) : window;

    switch (domEventName) {
      // Track the input node that has focus.
      case 'focusin':
        if (isTextInputElement(targetNode) || targetNode.contentEditable === 'true') {
          activeElement$1 = targetNode;
          activeElementInst$1 = targetInst;
          lastSelection = null;
        }

        break;

      case 'focusout':
        activeElement$1 = null;
        activeElementInst$1 = null;
        lastSelection = null;
        break;
      // Don't fire the event while the user is dragging. This matches the
      // semantics of the native select event.

      case 'mousedown':
        mouseDown = true;
        break;

      case 'contextmenu':
      case 'mouseup':
      case 'dragend':
        mouseDown = false;
        constructSelectEvent(dispatchQueue, nativeEvent, nativeEventTarget);
        break;
      // Chrome and IE fire non-standard event when selection is changed (and
      // sometimes when it hasn't). IE's event fires out of order with respect
      // to key and input events on deletion, so we discard it.
      //
      // Firefox doesn't support selectionchange, so check selection status
      // after each key entry. The selection changes after keydown and before
      // keyup, but we check on keydown as well in the case of holding down a
      // key, when multiple keydown events are fired but only one keyup is.
      // This is also our approach for IE handling, for the reason above.

      case 'selectionchange':
        if (skipSelectionChangeEvent) {
          break;
        }

      // falls through

      case 'keydown':
      case 'keyup':
        constructSelectEvent(dispatchQueue, nativeEvent, nativeEventTarget);
    }
  }