  var ReactStrictModeWarnings = {
    recordUnsafeLifecycleWarnings: function (fiber, instance) {},
    flushPendingUnsafeLifecycleWarnings: function () {},
    recordLegacyContextWarning: function (fiber, instance) {},
    flushLegacyContextWarning: function () {},
    discardPendingWarnings: function () {}
  };

  {
    var findStrictRoot = function (fiber) {
      var maybeStrictRoot = null;
      var node = fiber;

      while (node !== null) {
        if (node.mode & StrictMode) {
          maybeStrictRoot = node;
        }

        node = node.return;
      }

      return maybeStrictRoot;
    };

    var setToSortedString = function (set) {
      var array = [];
      set.forEach(function (value) {
        array.push(value);
      });
      return array.sort().join(', ');
    };

    var pendingComponentWillMountWarnings = [];
    var pendingUNSAFE_ComponentWillMountWarnings = [];
    var pendingComponentWillReceivePropsWarnings = [];
    var pendingUNSAFE_ComponentWillReceivePropsWarnings = [];
    var pendingComponentWillUpdateWarnings = [];
    var pendingUNSAFE_ComponentWillUpdateWarnings = []; // Tracks components we have already warned about.

    var didWarnAboutUnsafeLifecycles = new Set();

    ReactStrictModeWarnings.recordUnsafeLifecycleWarnings = function (fiber, instance) {
      // Dedup strategy: Warn once per component.
      if (didWarnAboutUnsafeLifecycles.has(fiber.type)) {
        return;
      }

      if (typeof instance.componentWillMount === 'function' && // Don't warn about react-lifecycles-compat polyfilled components.
      instance.componentWillMount.__suppressDeprecationWarning !== true) {
        pendingComponentWillMountWarnings.push(fiber);
      }

      if (fiber.mode & StrictMode && typeof instance.UNSAFE_componentWillMount === 'function') {
        pendingUNSAFE_ComponentWillMountWarnings.push(fiber);
      }

      if (typeof instance.componentWillReceiveProps === 'function' && instance.componentWillReceiveProps.__suppressDeprecationWarning !== true) {
        pendingComponentWillReceivePropsWarnings.push(fiber);
      }

      if (fiber.mode & StrictMode && typeof instance.UNSAFE_componentWillReceiveProps === 'function') {
        pendingUNSAFE_ComponentWillReceivePropsWarnings.push(fiber);
      }

      if (typeof instance.componentWillUpdate === 'function' && instance.componentWillUpdate.__suppressDeprecationWarning !== true) {
        pendingComponentWillUpdateWarnings.push(fiber);
      }

      if (fiber.mode & StrictMode && typeof instance.UNSAFE_componentWillUpdate === 'function') {
        pendingUNSAFE_ComponentWillUpdateWarnings.push(fiber);
      }
    };

    ReactStrictModeWarnings.flushPendingUnsafeLifecycleWarnings = function () {
      // We do an initial pass to gather component names
      var componentWillMountUniqueNames = new Set();

      if (pendingComponentWillMountWarnings.length > 0) {
        pendingComponentWillMountWarnings.forEach(function (fiber) {
          componentWillMountUniqueNames.add(getComponentName(fiber.type) || 'Component');
          didWarnAboutUnsafeLifecycles.add(fiber.type);
        });
        pendingComponentWillMountWarnings = [];
      }

      var UNSAFE_componentWillMountUniqueNames = new Set();

      if (pendingUNSAFE_ComponentWillMountWarnings.length > 0) {
        pendingUNSAFE_ComponentWillMountWarnings.forEach(function (fiber) {
          UNSAFE_componentWillMountUniqueNames.add(getComponentName(fiber.type) || 'Component');
          didWarnAboutUnsafeLifecycles.add(fiber.type);
        });
        pendingUNSAFE_ComponentWillMountWarnings = [];
      }

      var componentWillReceivePropsUniqueNames = new Set();

      if (pendingComponentWillReceivePropsWarnings.length > 0) {
        pendingComponentWillReceivePropsWarnings.forEach(function (fiber) {
          componentWillReceivePropsUniqueNames.add(getComponentName(fiber.type) || 'Component');
          didWarnAboutUnsafeLifecycles.add(fiber.type);
        });
        pendingComponentWillReceivePropsWarnings = [];
      }

      var UNSAFE_componentWillReceivePropsUniqueNames = new Set();

      if (pendingUNSAFE_ComponentWillReceivePropsWarnings.length > 0) {
        pendingUNSAFE_ComponentWillReceivePropsWarnings.forEach(function (fiber) {
          UNSAFE_componentWillReceivePropsUniqueNames.add(getComponentName(fiber.type) || 'Component');
          didWarnAboutUnsafeLifecycles.add(fiber.type);
        });
        pendingUNSAFE_ComponentWillReceivePropsWarnings = [];
      }

      var componentWillUpdateUniqueNames = new Set();

      if (pendingComponentWillUpdateWarnings.length > 0) {
        pendingComponentWillUpdateWarnings.forEach(function (fiber) {
          componentWillUpdateUniqueNames.add(getComponentName(fiber.type) || 'Component');
          didWarnAboutUnsafeLifecycles.add(fiber.type);
        });
        pendingComponentWillUpdateWarnings = [];
      }

      var UNSAFE_componentWillUpdateUniqueNames = new Set();

      if (pendingUNSAFE_ComponentWillUpdateWarnings.length > 0) {
        pendingUNSAFE_ComponentWillUpdateWarnings.forEach(function (fiber) {
          UNSAFE_componentWillUpdateUniqueNames.add(getComponentName(fiber.type) || 'Component');
          didWarnAboutUnsafeLifecycles.add(fiber.type);
        });
        pendingUNSAFE_ComponentWillUpdateWarnings = [];
      } // Finally, we flush all the warnings
      // UNSAFE_ ones before the deprecated ones, since they'll be 'louder'


      if (UNSAFE_componentWillMountUniqueNames.size > 0) {
        var sortedNames = setToSortedString(UNSAFE_componentWillMountUniqueNames);

        error('Using UNSAFE_componentWillMount in strict mode is not recommended and may indicate bugs in your code. ' + 'See https://reactjs.org/link/unsafe-component-lifecycles for details.\n\n' + '* Move code with side effects to componentDidMount, and set initial state in the constructor.\n' + '\nPlease update the following components: %s', sortedNames);
      }

      if (UNSAFE_componentWillReceivePropsUniqueNames.size > 0) {
        var _sortedNames = setToSortedString(UNSAFE_componentWillReceivePropsUniqueNames);

        error('Using UNSAFE_componentWillReceiveProps in strict mode is not recommended ' + 'and may indicate bugs in your code. ' + 'See https://reactjs.org/link/unsafe-component-lifecycles for details.\n\n' + '* Move data fetching code or side effects to componentDidUpdate.\n' + "* If you're updating state whenever props change, " + 'refactor your code to use memoization techniques or move it to ' + 'static getDerivedStateFromProps. Learn more at: https://reactjs.org/link/derived-state\n' + '\nPlease update the following components: %s', _sortedNames);
      }

      if (UNSAFE_componentWillUpdateUniqueNames.size > 0) {
        var _sortedNames2 = setToSortedString(UNSAFE_componentWillUpdateUniqueNames);

        error('Using UNSAFE_componentWillUpdate in strict mode is not recommended ' + 'and may indicate bugs in your code. ' + 'See https://reactjs.org/link/unsafe-component-lifecycles for details.\n\n' + '* Move data fetching code or side effects to componentDidUpdate.\n' + '\nPlease update the following components: %s', _sortedNames2);
      }

      if (componentWillMountUniqueNames.size > 0) {
        var _sortedNames3 = setToSortedString(componentWillMountUniqueNames);

        warn('componentWillMount has been renamed, and is not recommended for use. ' + 'See https://reactjs.org/link/unsafe-component-lifecycles for details.\n\n' + '* Move code with side effects to componentDidMount, and set initial state in the constructor.\n' + '* Rename componentWillMount to UNSAFE_componentWillMount to suppress ' + 'this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. ' + 'To rename all deprecated lifecycles to their new names, you can run ' + '`npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n' + '\nPlease update the following components: %s', _sortedNames3);
      }

      if (componentWillReceivePropsUniqueNames.size > 0) {
        var _sortedNames4 = setToSortedString(componentWillReceivePropsUniqueNames);

        warn('componentWillReceiveProps has been renamed, and is not recommended for use. ' + 'See https://reactjs.org/link/unsafe-component-lifecycles for details.\n\n' + '* Move data fetching code or side effects to componentDidUpdate.\n' + "* If you're updating state whenever props change, refactor your " + 'code to use memoization techniques or move it to ' + 'static getDerivedStateFromProps. Learn more at: https://reactjs.org/link/derived-state\n' + '* Rename componentWillReceiveProps to UNSAFE_componentWillReceiveProps to suppress ' + 'this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. ' + 'To rename all deprecated lifecycles to their new names, you can run ' + '`npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n' + '\nPlease update the following components: %s', _sortedNames4);
      }

      if (componentWillUpdateUniqueNames.size > 0) {
        var _sortedNames5 = setToSortedString(componentWillUpdateUniqueNames);

        warn('componentWillUpdate has been renamed, and is not recommended for use. ' + 'See https://reactjs.org/link/unsafe-component-lifecycles for details.\n\n' + '* Move data fetching code or side effects to componentDidUpdate.\n' + '* Rename componentWillUpdate to UNSAFE_componentWillUpdate to suppress ' + 'this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. ' + 'To rename all deprecated lifecycles to their new names, you can run ' + '`npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n' + '\nPlease update the following components: %s', _sortedNames5);
      }
    };

    var pendingLegacyContextWarning = new Map(); // Tracks components we have already warned about.

    var didWarnAboutLegacyContext = new Set();

    ReactStrictModeWarnings.recordLegacyContextWarning = function (fiber, instance) {
      var strictRoot = findStrictRoot(fiber);

      if (strictRoot === null) {
        error('Expected to find a StrictMode component in a strict mode tree. ' + 'This error is likely caused by a bug in React. Please file an issue.');

        return;
      } // Dedup strategy: Warn once per component.


      if (didWarnAboutLegacyContext.has(fiber.type)) {
        return;
      }

      var warningsForRoot = pendingLegacyContextWarning.get(strictRoot);

      if (fiber.type.contextTypes != null || fiber.type.childContextTypes != null || instance !== null && typeof instance.getChildContext === 'function') {
        if (warningsForRoot === undefined) {
          warningsForRoot = [];
          pendingLegacyContextWarning.set(strictRoot, warningsForRoot);
        }

        warningsForRoot.push(fiber);
      }
    };

    ReactStrictModeWarnings.flushLegacyContextWarning = function () {
      pendingLegacyContextWarning.forEach(function (fiberArray, strictRoot) {
        if (fiberArray.length === 0) {
          return;
        }

        var firstFiber = fiberArray[0];
        var uniqueNames = new Set();
        fiberArray.forEach(function (fiber) {
          uniqueNames.add(getComponentName(fiber.type) || 'Component');
          didWarnAboutLegacyContext.add(fiber.type);
        });
        var sortedNames = setToSortedString(uniqueNames);

        try {
          setCurrentFiber(firstFiber);

          error('Legacy context API has been detected within a strict-mode tree.' + '\n\nThe old API will be supported in all 16.x releases, but applications ' + 'using it should migrate to the new version.' + '\n\nPlease update the following components: %s' + '\n\nLearn more about this warning here: https://reactjs.org/link/legacy-context', sortedNames);
        } finally {
          resetCurrentFiber();
        }
      });
    };

    ReactStrictModeWarnings.discardPendingWarnings = function () {
      pendingComponentWillMountWarnings = [];
      pendingUNSAFE_ComponentWillMountWarnings = [];
      pendingComponentWillReceivePropsWarnings = [];
      pendingUNSAFE_ComponentWillReceivePropsWarnings = [];
      pendingComponentWillUpdateWarnings = [];
      pendingUNSAFE_ComponentWillUpdateWarnings = [];
      pendingLegacyContextWarning = new Map();
    };
  }