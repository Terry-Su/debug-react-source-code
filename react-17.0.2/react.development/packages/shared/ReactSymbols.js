  // ATTENTION
  // When adding new symbols to this file,
  // Please consider also adding to 'react-devtools-shared/src/backend/ReactSymbols'
  // The Symbol used to tag the ReactElement-like types. If there is no native Symbol
  // nor polyfill, then a plain number is used for performance.
  var REACT_ELEMENT_TYPE = 0xeac7;
  var REACT_PORTAL_TYPE = 0xeaca;
  React.Fragment = 0xeacb;
  React.StrictMode = 0xeacc;
  React.Profiler = 0xead2;
  var REACT_PROVIDER_TYPE = 0xeacd;
  var REACT_CONTEXT_TYPE = 0xeace;
  var REACT_FORWARD_REF_TYPE = 0xead0;
  React.Suspense = 0xead1;
  React.unstable_SuspenseList = 0xead8;
  var REACT_MEMO_TYPE = 0xead3;
  var REACT_LAZY_TYPE = 0xead4;
  var REACT_BLOCK_TYPE = 0xead9;
  var REACT_SERVER_BLOCK_TYPE = 0xeada;
  var REACT_FUNDAMENTAL_TYPE = 0xead5;
  var REACT_SCOPE_TYPE = 0xead7;
  var REACT_OPAQUE_ID_TYPE = 0xeae0;
  React.unstable_DebugTracingMode = 0xeae1;
  var REACT_OFFSCREEN_TYPE = 0xeae2;
  React.unstable_LegacyHidden = 0xeae3;

  if (typeof Symbol === 'function' && Symbol.for) {
    var symbolFor = Symbol.for;
    REACT_ELEMENT_TYPE = symbolFor('react.element');
    REACT_PORTAL_TYPE = symbolFor('react.portal');
    React.Fragment = symbolFor('react.fragment');
    React.StrictMode = symbolFor('react.strict_mode');
    React.Profiler = symbolFor('react.profiler');
    REACT_PROVIDER_TYPE = symbolFor('react.provider');
    REACT_CONTEXT_TYPE = symbolFor('react.context');
    REACT_FORWARD_REF_TYPE = symbolFor('react.forward_ref');
    React.Suspense = symbolFor('react.suspense');
    React.unstable_SuspenseList = symbolFor('react.suspense_list');
    REACT_MEMO_TYPE = symbolFor('react.memo');
    REACT_LAZY_TYPE = symbolFor('react.lazy');
    REACT_BLOCK_TYPE = symbolFor('react.block');
    REACT_SERVER_BLOCK_TYPE = symbolFor('react.server.block');
    REACT_FUNDAMENTAL_TYPE = symbolFor('react.fundamental');
    REACT_SCOPE_TYPE = symbolFor('react.scope');
    REACT_OPAQUE_ID_TYPE = symbolFor('react.opaque.id');
    React.unstable_DebugTracingMode = symbolFor('react.debug_trace_mode');
    REACT_OFFSCREEN_TYPE = symbolFor('react.offscreen');
    React.unstable_LegacyHidden = symbolFor('react.legacy_hidden');
  }

  var MAYBE_ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
  var FAUX_ITERATOR_SYMBOL = '@@iterator';
  function getIteratorFn(maybeIterable) {
    if (maybeIterable === null || typeof maybeIterable !== 'object') {
      return null;
    }

    var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];

    if (typeof maybeIterator === 'function') {
      return maybeIterator;
    }

    return null;
  }