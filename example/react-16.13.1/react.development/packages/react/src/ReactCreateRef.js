  // an immutable object with a single mutable value
  function createRef() {
    var refObject = {
      current: null
    };

    {
      Object.seal(refObject);
    }

    return refObject;
  }