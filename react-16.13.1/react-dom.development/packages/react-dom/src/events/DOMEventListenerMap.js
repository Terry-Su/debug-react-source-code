  var PossiblyWeakMap = typeof WeakMap === 'function' ? WeakMap : Map; // prettier-ignore

  var elementListenerMap = new PossiblyWeakMap();
  function getListenerMapForElement(element) {
    var listenerMap = elementListenerMap.get(element);

    if (listenerMap === undefined) {
      listenerMap = new Map();
      elementListenerMap.set(element, listenerMap);
    }

    return listenerMap;
  }