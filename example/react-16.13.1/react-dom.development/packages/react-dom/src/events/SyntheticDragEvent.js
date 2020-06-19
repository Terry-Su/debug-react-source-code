  /**
   * @interface DragEvent
   * @see http://www.w3.org/TR/DOM-Level-3-Events/
   */

  var SyntheticDragEvent = SyntheticMouseEvent.extend({
    dataTransfer: null
  });