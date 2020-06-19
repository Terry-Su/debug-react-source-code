  /**
   * @interface Event
   * @see http://www.w3.org/TR/clipboard-apis/
   */

  var SyntheticClipboardEvent = SyntheticEvent.extend({
    clipboardData: function (event) {
      return 'clipboardData' in event ? event.clipboardData : window.clipboardData;
    }
  });