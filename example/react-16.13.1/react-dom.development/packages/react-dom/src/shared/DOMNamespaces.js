  var HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
  var MATH_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';
  var SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
  var Namespaces = {
    html: HTML_NAMESPACE,
    mathml: MATH_NAMESPACE,
    svg: SVG_NAMESPACE
  }; // Assumes there is no parent namespace.

  function getIntrinsicNamespace(type) {
    switch (type) {
      case 'svg':
        return SVG_NAMESPACE;

      case 'math':
        return MATH_NAMESPACE;

      default:
        return HTML_NAMESPACE;
    }
  }
  function getChildNamespace(parentNamespace, type) {
    if (parentNamespace == null || parentNamespace === HTML_NAMESPACE) {
      // No (or default) parent namespace: potential entry point.
      return getIntrinsicNamespace(type);
    }

    if (parentNamespace === SVG_NAMESPACE && type === 'foreignObject') {
      // We're leaving SVG.
      return HTML_NAMESPACE;
    } // By default, pass namespace below.


    return parentNamespace;
  }