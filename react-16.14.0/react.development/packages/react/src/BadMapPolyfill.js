
  {

    try {
      var frozenObject = Object.freeze({});
      /* eslint-disable no-new */

      new Map([[frozenObject, null]]);
      new Set([frozenObject]);
      /* eslint-enable no-new */
    } catch (e) {
    }
  }