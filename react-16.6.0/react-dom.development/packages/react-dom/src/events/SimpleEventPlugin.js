

/**
 * Turns
 * ['abort', ...]
 * into
 * eventTypes = {
 *   'abort': {
 *     phasedRegistrationNames: {
 *       bubbled: 'onAbort',
 *       captured: 'onAbortCapture',
 *     },
 *     dependencies: [TOP_ABORT],
 *   },
 *   ...
 * };
 * topLevelEventsToDispatchConfig = new Map([
 *   [TOP_ABORT, { sameConfig }],
 * ]);
 */

var interactiveEventTypeNames = [[TOP_BLUR, 'blur'], [TOP_CANCEL, 'cancel'], [TOP_CLICK, 'click'], [TOP_CLOSE, 'close'], [TOP_CONTEXT_MENU, 'contextMenu'], [TOP_COPY, 'copy'], [TOP_CUT, 'cut'], [TOP_AUX_CLICK, 'auxClick'], [TOP_DOUBLE_CLICK, 'doubleClick'], [TOP_DRAG_END, 'dragEnd'], [TOP_DRAG_START, 'dragStart'], [TOP_DROP, 'drop'], [TOP_FOCUS, 'focus'], [TOP_INPUT, 'input'], [TOP_INVALID, 'invalid'], [TOP_KEY_DOWN, 'keyDown'], [TOP_KEY_PRESS, 'keyPress'], [TOP_KEY_UP, 'keyUp'], [TOP_MOUSE_DOWN, 'mouseDown'], [TOP_MOUSE_UP, 'mouseUp'], [TOP_PASTE, 'paste'], [TOP_PAUSE, 'pause'], [TOP_PLAY, 'play'], [TOP_POINTER_CANCEL, 'pointerCancel'], [TOP_POINTER_DOWN, 'pointerDown'], [TOP_POINTER_UP, 'pointerUp'], [TOP_RATE_CHANGE, 'rateChange'], [TOP_RESET, 'reset'], [TOP_SEEKED, 'seeked'], [TOP_SUBMIT, 'submit'], [TOP_TOUCH_CANCEL, 'touchCancel'], [TOP_TOUCH_END, 'touchEnd'], [TOP_TOUCH_START, 'touchStart'], [TOP_VOLUME_CHANGE, 'volumeChange']];
var nonInteractiveEventTypeNames = [[TOP_ABORT, 'abort'], [TOP_ANIMATION_END, 'animationEnd'], [TOP_ANIMATION_ITERATION, 'animationIteration'], [TOP_ANIMATION_START, 'animationStart'], [TOP_CAN_PLAY, 'canPlay'], [TOP_CAN_PLAY_THROUGH, 'canPlayThrough'], [TOP_DRAG, 'drag'], [TOP_DRAG_ENTER, 'dragEnter'], [TOP_DRAG_EXIT, 'dragExit'], [TOP_DRAG_LEAVE, 'dragLeave'], [TOP_DRAG_OVER, 'dragOver'], [TOP_DURATION_CHANGE, 'durationChange'], [TOP_EMPTIED, 'emptied'], [TOP_ENCRYPTED, 'encrypted'], [TOP_ENDED, 'ended'], [TOP_ERROR, 'error'], [TOP_GOT_POINTER_CAPTURE, 'gotPointerCapture'], [TOP_LOAD, 'load'], [TOP_LOADED_DATA, 'loadedData'], [TOP_LOADED_METADATA, 'loadedMetadata'], [TOP_LOAD_START, 'loadStart'], [TOP_LOST_POINTER_CAPTURE, 'lostPointerCapture'], [TOP_MOUSE_MOVE, 'mouseMove'], [TOP_MOUSE_OUT, 'mouseOut'], [TOP_MOUSE_OVER, 'mouseOver'], [TOP_PLAYING, 'playing'], [TOP_POINTER_MOVE, 'pointerMove'], [TOP_POINTER_OUT, 'pointerOut'], [TOP_POINTER_OVER, 'pointerOver'], [TOP_PROGRESS, 'progress'], [TOP_SCROLL, 'scroll'], [TOP_SEEKING, 'seeking'], [TOP_STALLED, 'stalled'], [TOP_SUSPEND, 'suspend'], [TOP_TIME_UPDATE, 'timeUpdate'], [TOP_TOGGLE, 'toggle'], [TOP_TOUCH_MOVE, 'touchMove'], [TOP_TRANSITION_END, 'transitionEnd'], [TOP_WAITING, 'waiting'], [TOP_WHEEL, 'wheel']];

var eventTypes$4 = {};
var topLevelEventsToDispatchConfig = {};

function addEventTypeNameToConfig(_ref, isInteractive) {
  var topEvent = _ref[0],
      event = _ref[1];

  var capitalizedEvent = event[0].toUpperCase() + event.slice(1);
  var onEvent = 'on' + capitalizedEvent;

  var type = {
    phasedRegistrationNames: {
      bubbled: onEvent,
      captured: onEvent + 'Capture'
    },
    dependencies: [topEvent],
    isInteractive: isInteractive
  };
  eventTypes$4[event] = type;
  topLevelEventsToDispatchConfig[topEvent] = type;
}

interactiveEventTypeNames.forEach(function (eventTuple) {
  addEventTypeNameToConfig(eventTuple, true);
});
nonInteractiveEventTypeNames.forEach(function (eventTuple) {
  addEventTypeNameToConfig(eventTuple, false);
});

// Only used in DEV for exhaustiveness validation.
var knownHTMLTopLevelTypes = [TOP_ABORT, TOP_CANCEL, TOP_CAN_PLAY, TOP_CAN_PLAY_THROUGH, TOP_CLOSE, TOP_DURATION_CHANGE, TOP_EMPTIED, TOP_ENCRYPTED, TOP_ENDED, TOP_ERROR, TOP_INPUT, TOP_INVALID, TOP_LOAD, TOP_LOADED_DATA, TOP_LOADED_METADATA, TOP_LOAD_START, TOP_PAUSE, TOP_PLAY, TOP_PLAYING, TOP_PROGRESS, TOP_RATE_CHANGE, TOP_RESET, TOP_SEEKED, TOP_SEEKING, TOP_STALLED, TOP_SUBMIT, TOP_SUSPEND, TOP_TIME_UPDATE, TOP_TOGGLE, TOP_VOLUME_CHANGE, TOP_WAITING];

var SimpleEventPlugin = {
  eventTypes: eventTypes$4,

  isInteractiveTopLevelEventType: function (topLevelType) {
    var config = topLevelEventsToDispatchConfig[topLevelType];
    return config !== undefined && config.isInteractive === true;
  },


  extractEvents: function (topLevelType, targetInst, nativeEvent, nativeEventTarget) {
    var dispatchConfig = topLevelEventsToDispatchConfig[topLevelType];
    if (!dispatchConfig) {
      return null;
    }
    var EventConstructor = void 0;
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
      case TOP_MOUSE_UP:
      // TODO: Disabled elements should not respond to mouse events
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
            warningWithoutStack$1(false, 'SimpleEventPlugin: Unhandled event type, `%s`. This warning ' + 'is likely caused by a bug in React. Please file an issue.', topLevelType);
          }
        }
        // HTML Events
        // @see http://www.w3.org/TR/html5/index.html#events-0
        EventConstructor = SyntheticEvent;
        break;
    }
    var event = EventConstructor.getPooled(dispatchConfig, targetInst, nativeEvent, nativeEventTarget);
    accumulateTwoPhaseDispatches(event);
    return event;
  }
};

