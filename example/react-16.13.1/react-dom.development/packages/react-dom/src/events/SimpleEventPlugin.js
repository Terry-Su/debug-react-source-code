
  var knownHTMLTopLevelTypes = [TOP_ABORT, TOP_CANCEL, TOP_CAN_PLAY, TOP_CAN_PLAY_THROUGH, TOP_CLOSE, TOP_DURATION_CHANGE, TOP_EMPTIED, TOP_ENCRYPTED, TOP_ENDED, TOP_ERROR, TOP_INPUT, TOP_INVALID, TOP_LOAD, TOP_LOADED_DATA, TOP_LOADED_METADATA, TOP_LOAD_START, TOP_PAUSE, TOP_PLAY, TOP_PLAYING, TOP_PROGRESS, TOP_RATE_CHANGE, TOP_RESET, TOP_SEEKED, TOP_SEEKING, TOP_STALLED, TOP_SUBMIT, TOP_SUSPEND, TOP_TIME_UPDATE, TOP_TOGGLE, TOP_VOLUME_CHANGE, TOP_WAITING];
  var SimpleEventPlugin = {
    // simpleEventPluginEventTypes gets populated from
    // the DOMEventProperties module.
    eventTypes: simpleEventPluginEventTypes,
    extractEvents: function (topLevelType, targetInst, nativeEvent, nativeEventTarget, eventSystemFlags) {
      var dispatchConfig = topLevelEventsToDispatchConfig.get(topLevelType);

      if (!dispatchConfig) {
        return null;
      }

      var EventConstructor;

      switch (topLevelType) {
        case TOP_KEY_PRESS:
          // Firefox creates a keypress event for function keys too. This removes
          // the unwanted keypress events. Enter is however both printable and
          // non-printable. One would expect Tab to be as well (but it isn't).
          if (getEventCharCode(nativeEvent) === 0) {
            return null;
          }

        /* falls through */

        case TOP_KEY_DOWN:
        case TOP_KEY_UP:
          EventConstructor = SyntheticKeyboardEvent;
          break;

        case TOP_BLUR:
        case TOP_FOCUS:
          EventConstructor = SyntheticFocusEvent;
          break;

        case TOP_CLICK:
          // Firefox creates a click event on right mouse clicks. This removes the
          // unwanted click events.
          if (nativeEvent.button === 2) {
            return null;
          }

        /* falls through */

        case TOP_AUX_CLICK:
        case TOP_DOUBLE_CLICK:
        case TOP_MOUSE_DOWN:
        case TOP_MOUSE_MOVE:
        case TOP_MOUSE_UP: // TODO: Disabled elements should not respond to mouse events

        /* falls through */

        case TOP_MOUSE_OUT:
        case TOP_MOUSE_OVER:
        case TOP_CONTEXT_MENU:
          EventConstructor = SyntheticMouseEvent;
          break;

        case TOP_DRAG:
        case TOP_DRAG_END:
        case TOP_DRAG_ENTER:
        case TOP_DRAG_EXIT:
        case TOP_DRAG_LEAVE:
        case TOP_DRAG_OVER:
        case TOP_DRAG_START:
        case TOP_DROP:
          EventConstructor = SyntheticDragEvent;
          break;

        case TOP_TOUCH_CANCEL:
        case TOP_TOUCH_END:
        case TOP_TOUCH_MOVE:
        case TOP_TOUCH_START:
          EventConstructor = SyntheticTouchEvent;
          break;

        case TOP_ANIMATION_END:
        case TOP_ANIMATION_ITERATION:
        case TOP_ANIMATION_START:
          EventConstructor = SyntheticAnimationEvent;
          break;

        case TOP_TRANSITION_END:
          EventConstructor = SyntheticTransitionEvent;
          break;

        case TOP_SCROLL:
          EventConstructor = SyntheticUIEvent;
          break;

        case TOP_WHEEL:
          EventConstructor = SyntheticWheelEvent;
          break;

        case TOP_COPY:
        case TOP_CUT:
        case TOP_PASTE:
          EventConstructor = SyntheticClipboardEvent;
          break;

        case TOP_GOT_POINTER_CAPTURE:
        case TOP_LOST_POINTER_CAPTURE:
        case TOP_POINTER_CANCEL:
        case TOP_POINTER_DOWN:
        case TOP_POINTER_MOVE:
        case TOP_POINTER_OUT:
        case TOP_POINTER_OVER:
        case TOP_POINTER_UP:
          EventConstructor = SyntheticPointerEvent;
          break;

        default:
          {
            if (knownHTMLTopLevelTypes.indexOf(topLevelType) === -1) {
              error('SimpleEventPlugin: Unhandled event type, `%s`. This warning ' + 'is likely caused by a bug in React. Please file an issue.', topLevelType);
            }
          } // HTML Events
          // @see http://www.w3.org/TR/html5/index.html#events-0


          EventConstructor = SyntheticEvent;
          break;
      }

      var event = EventConstructor.getPooled(dispatchConfig, targetInst, nativeEvent, nativeEventTarget);
      accumulateTwoPhaseDispatches(event);
      return event;
    }
  };