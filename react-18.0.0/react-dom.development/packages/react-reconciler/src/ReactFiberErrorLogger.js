  function logCapturedError(boundary, errorInfo) {
    try {
      var logError = showErrorDialog(boundary, errorInfo); // Allow injected showErrorDialog() to prevent default console.error logging.
      // This enables renderers like ReactNative to better manage redbox behavior.

      if (logError === false) {
        return;
      }

      var error = errorInfo.value;

      if (true) {
        var source = errorInfo.source;
        var stack = errorInfo.stack;
        var componentStack = stack !== null ? stack : ''; // Browsers support silencing uncaught errors by calling
        // `preventDefault()` in window `error` handler.
        // We record this information as an expando on the error.

        if (error != null && error._suppressLogging) {
          if (boundary.tag === ClassComponent) {
            // The error is recoverable and was silenced.
            // Ignore it and don't print the stack addendum.
            // This is handy for testing error boundaries without noise.
            return;
          } // The error is fatal. Since the silencing might have
          // been accidental, we'll surface it anyway.
          // However, the browser would have silenced the original error
          // so we'll print it first, and then print the stack addendum.


          console['error'](error); // Don't transform to our wrapper
          // For a more detailed description of this block, see:
          // https://github.com/facebook/react/pull/13384
        }

        var componentName = source ? getComponentNameFromFiber(source) : null;
        var componentNameMessage = componentName ? "The above error occurred in the <" + componentName + "> component:" : 'The above error occurred in one of your React components:';
        var errorBoundaryMessage;

        if (boundary.tag === HostRoot) {
          errorBoundaryMessage = 'Consider adding an error boundary to your tree to customize error handling behavior.\n' + 'Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.';
        } else {
          var errorBoundaryName = getComponentNameFromFiber(boundary) || 'Anonymous';
          errorBoundaryMessage = "React will try to recreate this component tree from scratch " + ("using the error boundary you provided, " + errorBoundaryName + ".");
        }

        var combinedMessage = componentNameMessage + "\n" + componentStack + "\n\n" + ("" + errorBoundaryMessage); // In development, we provide our own message with just the component stack.
        // We don't include the original error message and JS stack because the browser
        // has already printed it. Even if the application swallows the error, it is still
        // displayed by the browser thanks to the DEV-only fake event trick in ReactErrorUtils.

        console['error'](combinedMessage); // Don't transform to our wrapper
      } else {
        // In production, we print the error directly.
        // This will include the message, the JS stack, and anything the browser wants to show.
        // We pass the error object instead of custom message so that the browser displays the error natively.
        console['error'](error); // Don't transform to our wrapper
      }
    } catch (e) {
      // This method must not throw, or React internal state will get messed up.
      // If console.error is overridden, or logCapturedError() shows a dialog that throws,
      // we want to report this error outside of the normal stack as a last resort.
      // https://github.com/facebook/react/issues/13188
      setTimeout(function () {
        throw e;
      });
    }
  }