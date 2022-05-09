  // This exists to avoid circular dependency between ReactDOMEventReplaying
  // and DOMPluginEventSystem.
  var currentReplayingEvent = null;
  function setReplayingEvent(event) {
    {
      if (currentReplayingEvent !== null) {
        error('Expected currently replaying event to be null. This error ' + 'is likely caused by a bug in React. Please file an issue.');
      }
    }

    currentReplayingEvent = event;
  }
  function resetReplayingEvent() {
    {
      if (currentReplayingEvent === null) {
        error('Expected currently replaying event to not be null. This error ' + 'is likely caused by a bug in React. Please file an issue.');
      }
    }

    currentReplayingEvent = null;
  }
  function isReplayingEvent(event) {
    return event === currentReplayingEvent;
  }