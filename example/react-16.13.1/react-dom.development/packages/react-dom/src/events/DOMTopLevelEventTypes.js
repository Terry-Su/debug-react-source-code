  /**
   * To identify top level events in ReactDOM, we use constants defined by this
   * module. This is the only module that uses the unsafe* methods to express
   * that the constants actually correspond to the browser event names. This lets
   * us save some bundle size by avoiding a top level type -> event name map.
   * The rest of ReactDOM code should import top level types from this file.
   */

  var TOP_ABORT = unsafeCastStringToDOMTopLevelType('abort');
  var TOP_ANIMATION_END = unsafeCastStringToDOMTopLevelType(getVendorPrefixedEventName('animationend'));
  var TOP_ANIMATION_ITERATION = unsafeCastStringToDOMTopLevelType(getVendorPrefixedEventName('animationiteration'));
  var TOP_ANIMATION_START = unsafeCastStringToDOMTopLevelType(getVendorPrefixedEventName('animationstart'));
  var TOP_BLUR = unsafeCastStringToDOMTopLevelType('blur');
  var TOP_CAN_PLAY = unsafeCastStringToDOMTopLevelType('canplay');
  var TOP_CAN_PLAY_THROUGH = unsafeCastStringToDOMTopLevelType('canplaythrough');
  var TOP_CANCEL = unsafeCastStringToDOMTopLevelType('cancel');
  var TOP_CHANGE = unsafeCastStringToDOMTopLevelType('change');
  var TOP_CLICK = unsafeCastStringToDOMTopLevelType('click');
  var TOP_CLOSE = unsafeCastStringToDOMTopLevelType('close');
  var TOP_COMPOSITION_END = unsafeCastStringToDOMTopLevelType('compositionend');
  var TOP_COMPOSITION_START = unsafeCastStringToDOMTopLevelType('compositionstart');
  var TOP_COMPOSITION_UPDATE = unsafeCastStringToDOMTopLevelType('compositionupdate');
  var TOP_CONTEXT_MENU = unsafeCastStringToDOMTopLevelType('contextmenu');
  var TOP_COPY = unsafeCastStringToDOMTopLevelType('copy');
  var TOP_CUT = unsafeCastStringToDOMTopLevelType('cut');
  var TOP_DOUBLE_CLICK = unsafeCastStringToDOMTopLevelType('dblclick');
  var TOP_AUX_CLICK = unsafeCastStringToDOMTopLevelType('auxclick');
  var TOP_DRAG = unsafeCastStringToDOMTopLevelType('drag');
  var TOP_DRAG_END = unsafeCastStringToDOMTopLevelType('dragend');
  var TOP_DRAG_ENTER = unsafeCastStringToDOMTopLevelType('dragenter');
  var TOP_DRAG_EXIT = unsafeCastStringToDOMTopLevelType('dragexit');
  var TOP_DRAG_LEAVE = unsafeCastStringToDOMTopLevelType('dragleave');
  var TOP_DRAG_OVER = unsafeCastStringToDOMTopLevelType('dragover');
  var TOP_DRAG_START = unsafeCastStringToDOMTopLevelType('dragstart');
  var TOP_DROP = unsafeCastStringToDOMTopLevelType('drop');
  var TOP_DURATION_CHANGE = unsafeCastStringToDOMTopLevelType('durationchange');
  var TOP_EMPTIED = unsafeCastStringToDOMTopLevelType('emptied');
  var TOP_ENCRYPTED = unsafeCastStringToDOMTopLevelType('encrypted');
  var TOP_ENDED = unsafeCastStringToDOMTopLevelType('ended');
  var TOP_ERROR = unsafeCastStringToDOMTopLevelType('error');
  var TOP_FOCUS = unsafeCastStringToDOMTopLevelType('focus');
  var TOP_GOT_POINTER_CAPTURE = unsafeCastStringToDOMTopLevelType('gotpointercapture');
  var TOP_INPUT = unsafeCastStringToDOMTopLevelType('input');
  var TOP_INVALID = unsafeCastStringToDOMTopLevelType('invalid');
  var TOP_KEY_DOWN = unsafeCastStringToDOMTopLevelType('keydown');
  var TOP_KEY_PRESS = unsafeCastStringToDOMTopLevelType('keypress');
  var TOP_KEY_UP = unsafeCastStringToDOMTopLevelType('keyup');
  var TOP_LOAD = unsafeCastStringToDOMTopLevelType('load');
  var TOP_LOAD_START = unsafeCastStringToDOMTopLevelType('loadstart');
  var TOP_LOADED_DATA = unsafeCastStringToDOMTopLevelType('loadeddata');
  var TOP_LOADED_METADATA = unsafeCastStringToDOMTopLevelType('loadedmetadata');
  var TOP_LOST_POINTER_CAPTURE = unsafeCastStringToDOMTopLevelType('lostpointercapture');
  var TOP_MOUSE_DOWN = unsafeCastStringToDOMTopLevelType('mousedown');
  var TOP_MOUSE_MOVE = unsafeCastStringToDOMTopLevelType('mousemove');
  var TOP_MOUSE_OUT = unsafeCastStringToDOMTopLevelType('mouseout');
  var TOP_MOUSE_OVER = unsafeCastStringToDOMTopLevelType('mouseover');
  var TOP_MOUSE_UP = unsafeCastStringToDOMTopLevelType('mouseup');
  var TOP_PASTE = unsafeCastStringToDOMTopLevelType('paste');
  var TOP_PAUSE = unsafeCastStringToDOMTopLevelType('pause');
  var TOP_PLAY = unsafeCastStringToDOMTopLevelType('play');
  var TOP_PLAYING = unsafeCastStringToDOMTopLevelType('playing');
  var TOP_POINTER_CANCEL = unsafeCastStringToDOMTopLevelType('pointercancel');
  var TOP_POINTER_DOWN = unsafeCastStringToDOMTopLevelType('pointerdown');
  var TOP_POINTER_MOVE = unsafeCastStringToDOMTopLevelType('pointermove');
  var TOP_POINTER_OUT = unsafeCastStringToDOMTopLevelType('pointerout');
  var TOP_POINTER_OVER = unsafeCastStringToDOMTopLevelType('pointerover');
  var TOP_POINTER_UP = unsafeCastStringToDOMTopLevelType('pointerup');
  var TOP_PROGRESS = unsafeCastStringToDOMTopLevelType('progress');
  var TOP_RATE_CHANGE = unsafeCastStringToDOMTopLevelType('ratechange');
  var TOP_RESET = unsafeCastStringToDOMTopLevelType('reset');
  var TOP_SCROLL = unsafeCastStringToDOMTopLevelType('scroll');
  var TOP_SEEKED = unsafeCastStringToDOMTopLevelType('seeked');
  var TOP_SEEKING = unsafeCastStringToDOMTopLevelType('seeking');
  var TOP_SELECTION_CHANGE = unsafeCastStringToDOMTopLevelType('selectionchange');
  var TOP_STALLED = unsafeCastStringToDOMTopLevelType('stalled');
  var TOP_SUBMIT = unsafeCastStringToDOMTopLevelType('submit');
  var TOP_SUSPEND = unsafeCastStringToDOMTopLevelType('suspend');
  var TOP_TEXT_INPUT = unsafeCastStringToDOMTopLevelType('textInput');
  var TOP_TIME_UPDATE = unsafeCastStringToDOMTopLevelType('timeupdate');
  var TOP_TOGGLE = unsafeCastStringToDOMTopLevelType('toggle');
  var TOP_TOUCH_CANCEL = unsafeCastStringToDOMTopLevelType('touchcancel');
  var TOP_TOUCH_END = unsafeCastStringToDOMTopLevelType('touchend');
  var TOP_TOUCH_MOVE = unsafeCastStringToDOMTopLevelType('touchmove');
  var TOP_TOUCH_START = unsafeCastStringToDOMTopLevelType('touchstart');
  var TOP_TRANSITION_END = unsafeCastStringToDOMTopLevelType(getVendorPrefixedEventName('transitionend'));
  var TOP_VOLUME_CHANGE = unsafeCastStringToDOMTopLevelType('volumechange');
  var TOP_WAITING = unsafeCastStringToDOMTopLevelType('waiting');
  var TOP_WHEEL = unsafeCastStringToDOMTopLevelType('wheel'); // List of events that need to be individually attached to media elements.
  // Note that events in this list will *not* be listened to at the top level
  // unless they're explicitly whitelisted in `ReactBrowserEventEmitter.listenTo`.

  var mediaEventTypes = [TOP_ABORT, TOP_CAN_PLAY, TOP_CAN_PLAY_THROUGH, TOP_DURATION_CHANGE, TOP_EMPTIED, TOP_ENCRYPTED, TOP_ENDED, TOP_ERROR, TOP_LOADED_DATA, TOP_LOADED_METADATA, TOP_LOAD_START, TOP_PAUSE, TOP_PLAY, TOP_PLAYING, TOP_PROGRESS, TOP_RATE_CHANGE, TOP_SEEKED, TOP_SEEKING, TOP_STALLED, TOP_SUSPEND, TOP_TIME_UPDATE, TOP_VOLUME_CHANGE, TOP_WAITING];
  function getRawEventName(topLevelType) {
    return unsafeCastDOMTopLevelTypeToString(topLevelType);
  }