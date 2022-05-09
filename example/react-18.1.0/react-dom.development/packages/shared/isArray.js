  var isArrayImpl = Array.isArray; // eslint-disable-next-line no-redeclare

  function isArray(a) {
    return isArrayImpl(a);
  }