  function createDeprecatedResponderListener(responder, props) {
    var eventResponderListener = {
      responder: responder,
      props: props
    };

    {
      Object.freeze(eventResponderListener);
    }

    return eventResponderListener;
  }