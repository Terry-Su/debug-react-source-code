  // by calls to these methods by a Babel plugin.
  //
  // In PROD (or in packages without access to React internals),
  // they are left as they are instead.

  function warn(format) {
    {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      printWarning('warn', format, args);
    }
  }
  function error(format) {
    {
      for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }

      printWarning('error', format, args);
    }
  }

  function printWarning(level, format, args) {
    // When changing this logic, you might want to also
    // update consoleWithStackDev.www.js as well.
    {
      var ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;
      var stack = ReactDebugCurrentFrame.getStackAddendum();

      if (stack !== '') {
        format += '%s';
        args = args.concat([stack]);
      }

      var argsWithFormat = args.map(function (item) {
        return '' + item;
      }); // Careful: RN currently depends on this prefix

      argsWithFormat.unshift('Warning: ' + format); // We intentionally don't use spread (or .apply) directly because it
      // breaks IE9: https://github.com/facebook/react/issues/13610
      // eslint-disable-next-line react-internal/no-production-logging

      Function.prototype.apply.call(console[level], console, argsWithFormat);
    }
  }