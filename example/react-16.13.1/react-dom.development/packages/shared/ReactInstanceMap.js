  function get(key) {
    return key._reactInternalFiber;
  }
  function has$1(key) {
    return key._reactInternalFiber !== undefined;
  }
  function set(key, value) {
    key._reactInternalFiber = value;
  }