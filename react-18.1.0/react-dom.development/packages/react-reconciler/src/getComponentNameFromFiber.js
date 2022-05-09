
  function getWrappedName$1(outerType, innerType, wrapperName) {
    var functionName = innerType.displayName || innerType.name || '';
    return outerType.displayName || (functionName !== '' ? wrapperName + "(" + functionName + ")" : wrapperName);
  } // Keep in sync with shared/getComponentNameFromType


  function getContextName$1(type) {
    return type.displayName || 'Context';
  }

  function getComponentNameFromFiber(fiber) {
    var tag = fiber.tag,
        type = fiber.type;

    switch (tag) {
      case CacheComponent:
        return 'Cache';

      case ContextConsumer:
        var context = type;
        return getContextName$1(context) + '.Consumer';

      case ContextProvider:
        var provider = type;
        return getContextName$1(provider._context) + '.Provider';

      case DehydratedFragment:
        return 'DehydratedFragment';

      case ForwardRef:
        return getWrappedName$1(type, type.render, 'ForwardRef');

      case Fragment:
        return 'Fragment';

      case HostComponent:
        // Host component type is the display name (e.g. "div", "View")
        return type;

      case HostPortal:
        return 'Portal';

      case HostRoot:
        return 'Root';

      case HostText:
        return 'Text';

      case LazyComponent:
        // Name comes from the type in this case; we don't have a tag.
        return getComponentNameFromType(type);

      case Mode:
        if (type === REACT_STRICT_MODE_TYPE) {
          // Don't be less specific than shared/getComponentNameFromType
          return 'StrictMode';
        }

        return 'Mode';

      case OffscreenComponent:
        return 'Offscreen';

      case Profiler:
        return 'Profiler';

      case ScopeComponent:
        return 'Scope';

      case SuspenseComponent:
        return 'Suspense';

      case SuspenseListComponent:
        return 'SuspenseList';

      case TracingMarkerComponent:
        return 'TracingMarker';
      // The display name for this tags come from the user-provided type:

      case ClassComponent:
      case FunctionComponent:
      case IncompleteClassComponent:
      case IndeterminateComponent:
      case MemoComponent:
      case SimpleMemoComponent:
        if (typeof type === 'function') {
          return type.displayName || type.name || null;
        }

        if (typeof type === 'string') {
          return type;
        }

        break;

    }

    return null;
  }