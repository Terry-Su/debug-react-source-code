  var ContextRegistry$1 = ReactSharedInternals.ContextRegistry;
  function createServerContext(globalName, defaultValue) {

    var wasDefined = true;

    if (!ContextRegistry$1[globalName]) {
      wasDefined = false;
      var _context = {
        $$typeof: REACT_SERVER_CONTEXT_TYPE,
        // As a workaround to support multiple concurrent renderers, we categorize
        // some renderers as primary and others as secondary. We only expect
        // there to be two concurrent renderers at most: React Native (primary) and
        // Fabric (secondary); React DOM (primary) and React ART (secondary).
        // Secondary renderers store their context values on separate fields.
        _currentValue: defaultValue,
        _currentValue2: defaultValue,
        _defaultValue: defaultValue,
        // Used to track how many concurrent renderers this context currently
        // supports within in a single renderer. Such as parallel server rendering.
        _threadCount: 0,
        // These are circular
        Provider: null,
        Consumer: null,
        _globalName: globalName
      };
      _context.Provider = {
        $$typeof: REACT_PROVIDER_TYPE,
        _context: _context
      };

      {
        var hasWarnedAboutUsingConsumer;
        _context._currentRenderer = null;
        _context._currentRenderer2 = null;
        Object.defineProperties(_context, {
          Consumer: {
            get: function () {
              if (!hasWarnedAboutUsingConsumer) {
                error('Consumer pattern is not supported by ReactServerContext');

                hasWarnedAboutUsingConsumer = true;
              }

              return null;
            }
          }
        });
      }

      ContextRegistry$1[globalName] = _context;
    }

    var context = ContextRegistry$1[globalName];

    if (context._defaultValue === REACT_SERVER_CONTEXT_DEFAULT_VALUE_NOT_LOADED) {
      context._defaultValue = defaultValue;

      if (context._currentValue === REACT_SERVER_CONTEXT_DEFAULT_VALUE_NOT_LOADED) {
        context._currentValue = defaultValue;
      }

      if (context._currentValue2 === REACT_SERVER_CONTEXT_DEFAULT_VALUE_NOT_LOADED) {
        context._currentValue2 = defaultValue;
      }
    } else if (wasDefined) {
      throw new Error("ServerContext: " + globalName + " already defined");
    }

    return context;
  }