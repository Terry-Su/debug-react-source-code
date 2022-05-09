  // TODO: This is pretty well supported by browsers. Maybe we can drop it.
  var clz32 = Math.clz32 ? Math.clz32 : clz32Fallback; // Count leading zeros.
  // Based on:
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/clz32

  var log = Math.log;
  var LN2 = Math.LN2;

  function clz32Fallback(x) {
    var asUint = x >>> 0;

    if (asUint === 0) {
      return 32;
    }

    return 31 - (log(asUint) / LN2 | 0) | 0;
  }