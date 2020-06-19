  var Uninitialized = -1;
  var Pending = 0;
  var Resolved = 1;
  var Rejected = 2;
  function refineResolvedLazyComponent(lazyComponent) {
    return lazyComponent._status === Resolved ? lazyComponent._result : null;
  }
  function initializeLazyComponentType(lazyComponent) {
    if (lazyComponent._status === Uninitialized) {
      lazyComponent._status = Pending;
      var ctor = lazyComponent._ctor;
      var thenable = ctor();
      lazyComponent._result = thenable;
      thenable.then(function (moduleObject) {
        if (lazyComponent._status === Pending) {
          var defaultExport = moduleObject.default;

          {
            if (defaultExport === undefined) {
              error('lazy: Expected the result of a dynamic import() call. ' + 'Instead received: %s\n\nYour code should look like: \n  ' + "const MyComponent = lazy(() => import('./MyComponent'))", moduleObject);
            }
          }

          lazyComponent._status = Resolved;
          lazyComponent._result = defaultExport;
        }
      }, function (error) {
        if (lazyComponent._status === Pending) {
          lazyComponent._status = Rejected;
          lazyComponent._result = error;
        }
      });
    }
  }