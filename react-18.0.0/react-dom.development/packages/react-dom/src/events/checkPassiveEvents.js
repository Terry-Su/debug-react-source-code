  var passiveBrowserEventsSupported = false; // Check if browser support events with passive listeners
  // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Safely_detecting_option_support

  if (canUseDOM) {
    try {
      var options = {}; // $FlowFixMe: Ignore Flow complaining about needing a value

      Object.defineProperty(options, 'passive', {
        get: function () {
          passiveBrowserEventsSupported = true;
        }
      });
      window.addEventListener('test', options, options);
      window.removeEventListener('test', options, options);
    } catch (e) {
      passiveBrowserEventsSupported = false;
    }
  }