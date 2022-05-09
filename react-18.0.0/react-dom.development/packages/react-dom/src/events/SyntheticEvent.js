
  function functionThatReturnsTrue() {
    return true;
  }

  function functionThatReturnsFalse() {
    return false;
  } // This is intentionally a factory so that we have different returned constructors.
  // If we had a single constructor, it would be megamorphic and engines would deopt.


  function createSyntheticEvent(Interface) {
    /**
     * Synthetic events are dispatched by event plugins, typically in response to a
     * top-level event delegation handler.
     *
     * These systems should generally use pooling to reduce the frequency of garbage
     * collection. The system should check `isPersistent` to determine whether the
     * event should be released into the pool after being dispatched. Users that
     * need a persisted event should invoke `persist`.
     *
     * Synthetic events (and subclasses) implement the DOM Level 3 Events API by
     * normalizing browser quirks. Subclasses do not necessarily have to implement a
     * DOM interface; custom application-specific events can also subclass this.
     */
    function SyntheticBaseEvent(reactName, reactEventType, targetInst, nativeEvent, nativeEventTarget) {
      this._reactName = reactName;
      this._targetInst = targetInst;
      this.type = reactEventType;
      this.nativeEvent = nativeEvent;
      this.target = nativeEventTarget;
      this.currentTarget = null;

      for (var _propName in Interface) {
        if (!Interface.hasOwnProperty(_propName)) {
          continue;
        }

        var normalize = Interface[_propName];

        if (normalize) {
          this[_propName] = normalize(nativeEvent);
        } else {
          this[_propName] = nativeEvent[_propName];
        }
      }

      var defaultPrevented = nativeEvent.defaultPrevented != null ? nativeEvent.defaultPrevented : nativeEvent.returnValue === false;

      if (defaultPrevented) {
        this.isDefaultPrevented = functionThatReturnsTrue;
      } else {
        this.isDefaultPrevented = functionThatReturnsFalse;
      }

      this.isPropagationStopped = functionThatReturnsFalse;
      return this;
    }

    assign(SyntheticBaseEvent.prototype, {
      preventDefault: function () {
        this.defaultPrevented = true;
        var event = this.nativeEvent;

        if (!event) {
          return;
        }

        if (event.preventDefault) {
          event.preventDefault(); // $FlowFixMe - flow is not aware of `unknown` in IE
        } else if (typeof event.returnValue !== 'unknown') {
          event.returnValue = false;
        }

        this.isDefaultPrevented = functionThatReturnsTrue;
      },
      stopPropagation: function () {
        var event = this.nativeEvent;

        if (!event) {
          return;
        }

        if (event.stopPropagation) {
          event.stopPropagation(); // $FlowFixMe - flow is not aware of `unknown` in IE
        } else if (typeof event.cancelBubble !== 'unknown') {
          // The ChangeEventPlugin registers a "propertychange" event for
          // IE. This event does not support bubbling or cancelling, and
          // any references to cancelBubble throw "Member not found".  A
          // typeof check of "unknown" circumvents this issue (and is also
          // IE specific).
          event.cancelBubble = true;
        }

        this.isPropagationStopped = functionThatReturnsTrue;
      },

      /**
       * We release all dispatched `SyntheticEvent`s after each event loop, adding
       * them back into the pool. This allows a way to hold onto a reference that
       * won't be added back into the pool.
       */
      persist: function () {// Modern event system doesn't use pooling.
      },

      /**
       * Checks if this event should be released back into the pool.
       *
       * @return {boolean} True if this should not be released, false otherwise.
       */
      isPersistent: functionThatReturnsTrue
    });
    return SyntheticBaseEvent;
  }
  /**
   * @interface Event
   * @see http://www.w3.org/TR/DOM-Level-3-Events/
   */


  var EventInterface = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function (event) {
      return event.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  };
  var SyntheticEvent = createSyntheticEvent(EventInterface);

  var UIEventInterface = assign({}, EventInterface, {
    view: 0,
    detail: 0
  });

  var SyntheticUIEvent = createSyntheticEvent(UIEventInterface);
  var lastMovementX;
  var lastMovementY;
  var lastMouseEvent;

  function updateMouseMovementPolyfillState(event) {
    if (event !== lastMouseEvent) {
      if (lastMouseEvent && event.type === 'mousemove') {
        lastMovementX = event.screenX - lastMouseEvent.screenX;
        lastMovementY = event.screenY - lastMouseEvent.screenY;
      } else {
        lastMovementX = 0;
        lastMovementY = 0;
      }

      lastMouseEvent = event;
    }
  }
  /**
   * @interface MouseEvent
   * @see http://www.w3.org/TR/DOM-Level-3-Events/
   */


  var MouseEventInterface = assign({}, UIEventInterface, {
    screenX: 0,
    screenY: 0,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    getModifierState: getEventModifierState,
    button: 0,
    buttons: 0,
    relatedTarget: function (event) {
      if (event.relatedTarget === undefined) return event.fromElement === event.srcElement ? event.toElement : event.fromElement;
      return event.relatedTarget;
    },
    movementX: function (event) {
      if ('movementX' in event) {
        return event.movementX;
      }

      updateMouseMovementPolyfillState(event);
      return lastMovementX;
    },
    movementY: function (event) {
      if ('movementY' in event) {
        return event.movementY;
      } // Don't need to call updateMouseMovementPolyfillState() here
      // because it's guaranteed to have already run when movementX
      // was copied.


      return lastMovementY;
    }
  });

  var SyntheticMouseEvent = createSyntheticEvent(MouseEventInterface);
  /**
   * @interface DragEvent
   * @see http://www.w3.org/TR/DOM-Level-3-Events/
   */

  var DragEventInterface = assign({}, MouseEventInterface, {
    dataTransfer: 0
  });

  var SyntheticDragEvent = createSyntheticEvent(DragEventInterface);
  /**
   * @interface FocusEvent
   * @see http://www.w3.org/TR/DOM-Level-3-Events/
   */

  var FocusEventInterface = assign({}, UIEventInterface, {
    relatedTarget: 0
  });

  var SyntheticFocusEvent = createSyntheticEvent(FocusEventInterface);
  /**
   * @interface Event
   * @see http://www.w3.org/TR/css3-animations/#AnimationEvent-interface
   * @see https://developer.mozilla.org/en-US/docs/Web/API/AnimationEvent
   */

  var AnimationEventInterface = assign({}, EventInterface, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  });

  var SyntheticAnimationEvent = createSyntheticEvent(AnimationEventInterface);
  /**
   * @interface Event
   * @see http://www.w3.org/TR/clipboard-apis/
   */

  var ClipboardEventInterface = assign({}, EventInterface, {
    clipboardData: function (event) {
      return 'clipboardData' in event ? event.clipboardData : window.clipboardData;
    }
  });

  var SyntheticClipboardEvent = createSyntheticEvent(ClipboardEventInterface);
  /**
   * @interface Event
   * @see http://www.w3.org/TR/DOM-Level-3-Events/#events-compositionevents
   */

  var CompositionEventInterface = assign({}, EventInterface, {
    data: 0
  });

  var SyntheticCompositionEvent = createSyntheticEvent(CompositionEventInterface);
  /**
   * @interface Event
   * @see http://www.w3.org/TR/2013/WD-DOM-Level-3-Events-20131105
   *      /#events-inputevents
   */
  // Happens to share the same list for now.

  var SyntheticInputEvent = SyntheticCompositionEvent;
  /**
   * Normalization of deprecated HTML5 `key` values
   * @see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent#Key_names
   */

  var normalizeKey = {
    Esc: 'Escape',
    Spacebar: ' ',
    Left: 'ArrowLeft',
    Up: 'ArrowUp',
    Right: 'ArrowRight',
    Down: 'ArrowDown',
    Del: 'Delete',
    Win: 'OS',
    Menu: 'ContextMenu',
    Apps: 'ContextMenu',
    Scroll: 'ScrollLock',
    MozPrintableKey: 'Unidentified'
  };
  /**
   * Translation from legacy `keyCode` to HTML5 `key`
   * Only special keys supported, all others depend on keyboard layout or browser
   * @see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent#Key_names
   */

  var translateToKey = {
    '8': 'Backspace',
    '9': 'Tab',
    '12': 'Clear',
    '13': 'Enter',
    '16': 'Shift',
    '17': 'Control',
    '18': 'Alt',
    '19': 'Pause',
    '20': 'CapsLock',
    '27': 'Escape',
    '32': ' ',
    '33': 'PageUp',
    '34': 'PageDown',
    '35': 'End',
    '36': 'Home',
    '37': 'ArrowLeft',
    '38': 'ArrowUp',
    '39': 'ArrowRight',
    '40': 'ArrowDown',
    '45': 'Insert',
    '46': 'Delete',
    '112': 'F1',
    '113': 'F2',
    '114': 'F3',
    '115': 'F4',
    '116': 'F5',
    '117': 'F6',
    '118': 'F7',
    '119': 'F8',
    '120': 'F9',
    '121': 'F10',
    '122': 'F11',
    '123': 'F12',
    '144': 'NumLock',
    '145': 'ScrollLock',
    '224': 'Meta'
  };
  /**
   * @param {object} nativeEvent Native browser event.
   * @return {string} Normalized `key` property.
   */

  function getEventKey(nativeEvent) {
    if (nativeEvent.key) {
      // Normalize inconsistent values reported by browsers due to
      // implementations of a working draft specification.
      // FireFox implements `key` but returns `MozPrintableKey` for all
      // printable characters (normalized to `Unidentified`), ignore it.
      var key = normalizeKey[nativeEvent.key] || nativeEvent.key;

      if (key !== 'Unidentified') {
        return key;
      }
    } // Browser does not implement `key`, polyfill as much of it as we can.


    if (nativeEvent.type === 'keypress') {
      var charCode = getEventCharCode(nativeEvent); // The enter-key is technically both printable and non-printable and can
      // thus be captured by `keypress`, no other non-printable key should.

      return charCode === 13 ? 'Enter' : String.fromCharCode(charCode);
    }

    if (nativeEvent.type === 'keydown' || nativeEvent.type === 'keyup') {
      // While user keyboard layout determines the actual meaning of each
      // `keyCode` value, almost all function keys have a universal value.
      return translateToKey[nativeEvent.keyCode] || 'Unidentified';
    }

    return '';
  }
  /**
   * Translation from modifier key to the associated property in the event.
   * @see http://www.w3.org/TR/DOM-Level-3-Events/#keys-Modifiers
   */


  var modifierKeyToProp = {
    Alt: 'altKey',
    Control: 'ctrlKey',
    Meta: 'metaKey',
    Shift: 'shiftKey'
  }; // Older browsers (Safari <= 10, iOS Safari <= 10.2) do not support
  // getModifierState. If getModifierState is not supported, we map it to a set of
  // modifier keys exposed by the event. In this case, Lock-keys are not supported.

  function modifierStateGetter(keyArg) {
    var syntheticEvent = this;
    var nativeEvent = syntheticEvent.nativeEvent;

    if (nativeEvent.getModifierState) {
      return nativeEvent.getModifierState(keyArg);
    }

    var keyProp = modifierKeyToProp[keyArg];
    return keyProp ? !!nativeEvent[keyProp] : false;
  }

  function getEventModifierState(nativeEvent) {
    return modifierStateGetter;
  }
  /**
   * @interface KeyboardEvent
   * @see http://www.w3.org/TR/DOM-Level-3-Events/
   */


  var KeyboardEventInterface = assign({}, UIEventInterface, {
    key: getEventKey,
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: getEventModifierState,
    // Legacy Interface
    charCode: function (event) {
      // `charCode` is the result of a KeyPress event and represents the value of
      // the actual printable character.
      // KeyPress is deprecated, but its replacement is not yet final and not
      // implemented in any major browser. Only KeyPress has charCode.
      if (event.type === 'keypress') {
        return getEventCharCode(event);
      }

      return 0;
    },
    keyCode: function (event) {
      // `keyCode` is the result of a KeyDown/Up event and represents the value of
      // physical keyboard key.
      // The actual meaning of the value depends on the users' keyboard layout
      // which cannot be detected. Assuming that it is a US keyboard layout
      // provides a surprisingly accurate mapping for US and European users.
      // Due to this, it is left to the user to implement at this time.
      if (event.type === 'keydown' || event.type === 'keyup') {
        return event.keyCode;
      }

      return 0;
    },
    which: function (event) {
      // `which` is an alias for either `keyCode` or `charCode` depending on the
      // type of the event.
      if (event.type === 'keypress') {
        return getEventCharCode(event);
      }

      if (event.type === 'keydown' || event.type === 'keyup') {
        return event.keyCode;
      }

      return 0;
    }
  });

  var SyntheticKeyboardEvent = createSyntheticEvent(KeyboardEventInterface);
  /**
   * @interface PointerEvent
   * @see http://www.w3.org/TR/pointerevents/
   */

  var PointerEventInterface = assign({}, MouseEventInterface, {
    pointerId: 0,
    width: 0,
    height: 0,
    pressure: 0,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    pointerType: 0,
    isPrimary: 0
  });

  var SyntheticPointerEvent = createSyntheticEvent(PointerEventInterface);
  /**
   * @interface TouchEvent
   * @see http://www.w3.org/TR/touch-events/
   */

  var TouchEventInterface = assign({}, UIEventInterface, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: getEventModifierState
  });

  var SyntheticTouchEvent = createSyntheticEvent(TouchEventInterface);
  /**
   * @interface Event
   * @see http://www.w3.org/TR/2009/WD-css3-transitions-20090320/#transition-events-
   * @see https://developer.mozilla.org/en-US/docs/Web/API/TransitionEvent
   */

  var TransitionEventInterface = assign({}, EventInterface, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  });

  var SyntheticTransitionEvent = createSyntheticEvent(TransitionEventInterface);
  /**
   * @interface WheelEvent
   * @see http://www.w3.org/TR/DOM-Level-3-Events/
   */

  var WheelEventInterface = assign({}, MouseEventInterface, {
    deltaX: function (event) {
      return 'deltaX' in event ? event.deltaX : // Fallback to `wheelDeltaX` for Webkit and normalize (right is positive).
      'wheelDeltaX' in event ? -event.wheelDeltaX : 0;
    },
    deltaY: function (event) {
      return 'deltaY' in event ? event.deltaY : // Fallback to `wheelDeltaY` for Webkit and normalize (down is positive).
      'wheelDeltaY' in event ? -event.wheelDeltaY : // Fallback to `wheelDelta` for IE<9 and normalize (down is positive).
      'wheelDelta' in event ? -event.wheelDelta : 0;
    },
    deltaZ: 0,
    // Browsers without "deltaMode" is reporting in raw wheel delta where one
    // notch on the scroll is always +/- 120, roughly equivalent to pixels.
    // A good approximation of DOM_DELTA_LINE (1) is 5% of viewport size or
    // ~40 pixels, for DOM_DELTA_SCREEN (2) it is 87.5% of viewport size.
    deltaMode: 0
  });

  var SyntheticWheelEvent = createSyntheticEvent(WheelEventInterface);