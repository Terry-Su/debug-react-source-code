  /**
   * Specifies a deterministic ordering of `EventPlugin`s. A convenient way to
   * reason about plugins, without having to package every one of them. This
   * is better than having plugins be ordered in the same order that they
   * are injected because that ordering would be influenced by the packaging order.
   * `ResponderEventPlugin` must occur before `SimpleEventPlugin` so that
   * preventing default on events is convenient in `SimpleEventPlugin` handlers.
   */

  var DOMEventPluginOrder = ['ResponderEventPlugin', 'SimpleEventPlugin', 'EnterLeaveEventPlugin', 'ChangeEventPlugin', 'SelectEventPlugin', 'BeforeInputEventPlugin'];
  /**
   * Inject modules for resolving DOM hierarchy and plugin ordering.
   */

  injectEventPluginOrder(DOMEventPluginOrder);
  setComponentTree(getFiberCurrentPropsFromNode$1, getInstanceFromNode$1, getNodeFromInstance$1);
  /**
   * Some important event plugins included by default (without having to require
   * them).
   */

  injectEventPluginsByName({
    SimpleEventPlugin: SimpleEventPlugin,
    EnterLeaveEventPlugin: EnterLeaveEventPlugin,
    ChangeEventPlugin: ChangeEventPlugin,
    SelectEventPlugin: SelectEventPlugin,
    BeforeInputEventPlugin: BeforeInputEventPlugin
  });