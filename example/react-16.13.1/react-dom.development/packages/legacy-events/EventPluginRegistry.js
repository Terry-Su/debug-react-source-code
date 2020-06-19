
  /**
   * Injectable ordering of event plugins.
   */
  var eventPluginOrder = null;
  /**
   * Injectable mapping from names to event plugin modules.
   */

  var namesToPlugins = {};
  /**
   * Recomputes the plugin list using the injected plugins and plugin ordering.
   *
   * @private
   */

  function recomputePluginOrdering() {
    if (!eventPluginOrder) {
      // Wait until an `eventPluginOrder` is injected.
      return;
    }

    for (var pluginName in namesToPlugins) {
      var pluginModule = namesToPlugins[pluginName];
      var pluginIndex = eventPluginOrder.indexOf(pluginName);

      if (!(pluginIndex > -1)) {
        {
          throw Error( "EventPluginRegistry: Cannot inject event plugins that do not exist in the plugin ordering, `" + pluginName + "`." );
        }
      }

      if (plugins[pluginIndex]) {
        continue;
      }

      if (!pluginModule.extractEvents) {
        {
          throw Error( "EventPluginRegistry: Event plugins must implement an `extractEvents` method, but `" + pluginName + "` does not." );
        }
      }

      plugins[pluginIndex] = pluginModule;
      var publishedEvents = pluginModule.eventTypes;

      for (var eventName in publishedEvents) {
        if (!publishEventForPlugin(publishedEvents[eventName], pluginModule, eventName)) {
          {
            throw Error( "EventPluginRegistry: Failed to publish event `" + eventName + "` for plugin `" + pluginName + "`." );
          }
        }
      }
    }
  }
  /**
   * Publishes an event so that it can be dispatched by the supplied plugin.
   *
   * @param {object} dispatchConfig Dispatch configuration for the event.
   * @param {object} PluginModule Plugin publishing the event.
   * @return {boolean} True if the event was successfully published.
   * @private
   */


  function publishEventForPlugin(dispatchConfig, pluginModule, eventName) {
    if (!!eventNameDispatchConfigs.hasOwnProperty(eventName)) {
      {
        throw Error( "EventPluginRegistry: More than one plugin attempted to publish the same event name, `" + eventName + "`." );
      }
    }

    eventNameDispatchConfigs[eventName] = dispatchConfig;
    var phasedRegistrationNames = dispatchConfig.phasedRegistrationNames;

    if (phasedRegistrationNames) {
      for (var phaseName in phasedRegistrationNames) {
        if (phasedRegistrationNames.hasOwnProperty(phaseName)) {
          var phasedRegistrationName = phasedRegistrationNames[phaseName];
          publishRegistrationName(phasedRegistrationName, pluginModule, eventName);
        }
      }

      return true;
    } else if (dispatchConfig.registrationName) {
      publishRegistrationName(dispatchConfig.registrationName, pluginModule, eventName);
      return true;
    }

    return false;
  }
  /**
   * Publishes a registration name that is used to identify dispatched events.
   *
   * @param {string} registrationName Registration name to add.
   * @param {object} PluginModule Plugin publishing the event.
   * @private
   */


  function publishRegistrationName(registrationName, pluginModule, eventName) {
    if (!!registrationNameModules[registrationName]) {
      {
        throw Error( "EventPluginRegistry: More than one plugin attempted to publish the same registration name, `" + registrationName + "`." );
      }
    }

    registrationNameModules[registrationName] = pluginModule;
    registrationNameDependencies[registrationName] = pluginModule.eventTypes[eventName].dependencies;

    {
      var lowerCasedName = registrationName.toLowerCase();
      possibleRegistrationNames[lowerCasedName] = registrationName;

      if (registrationName === 'onDoubleClick') {
        possibleRegistrationNames.ondblclick = registrationName;
      }
    }
  }
  /**
   * Registers plugins so that they can extract and dispatch events.
   */

  /**
   * Ordered list of injected plugins.
   */


  var plugins = [];
  /**
   * Mapping from event name to dispatch config
   */

  var eventNameDispatchConfigs = {};
  /**
   * Mapping from registration name to plugin module
   */

  var registrationNameModules = {};
  /**
   * Mapping from registration name to event name
   */

  var registrationNameDependencies = {};
  /**
   * Mapping from lowercase registration names to the properly cased version,
   * used to warn in the case of missing event handlers. Available
   * only in true.
   * @type {Object}
   */

  var possibleRegistrationNames =  {} ; // Trust the developer to only use possibleRegistrationNames in true

  /**
   * Injects an ordering of plugins (by plugin name). This allows the ordering
   * to be decoupled from injection of the actual plugins so that ordering is
   * always deterministic regardless of packaging, on-the-fly injection, etc.
   *
   * @param {array} InjectedEventPluginOrder
   * @internal
   */

  function injectEventPluginOrder(injectedEventPluginOrder) {
    if (!!eventPluginOrder) {
      {
        throw Error( "EventPluginRegistry: Cannot inject event plugin ordering more than once. You are likely trying to load more than one copy of React." );
      }
    } // Clone the ordering so it cannot be dynamically mutated.


    eventPluginOrder = Array.prototype.slice.call(injectedEventPluginOrder);
    recomputePluginOrdering();
  }
  /**
   * Injects plugins to be used by plugin event system. The plugin names must be
   * in the ordering injected by `injectEventPluginOrder`.
   *
   * Plugins can be injected as part of page initialization or on-the-fly.
   *
   * @param {object} injectedNamesToPlugins Map from names to plugin modules.
   * @internal
   */

  function injectEventPluginsByName(injectedNamesToPlugins) {
    var isOrderingDirty = false;

    for (var pluginName in injectedNamesToPlugins) {
      if (!injectedNamesToPlugins.hasOwnProperty(pluginName)) {
        continue;
      }

      var pluginModule = injectedNamesToPlugins[pluginName];

      if (!namesToPlugins.hasOwnProperty(pluginName) || namesToPlugins[pluginName] !== pluginModule) {
        if (!!namesToPlugins[pluginName]) {
          {
            throw Error( "EventPluginRegistry: Cannot inject two different event plugins using the same name, `" + pluginName + "`." );
          }
        }

        namesToPlugins[pluginName] = pluginModule;
        isOrderingDirty = true;
      }
    }

    if (isOrderingDirty) {
      recomputePluginOrdering();
    }
  }