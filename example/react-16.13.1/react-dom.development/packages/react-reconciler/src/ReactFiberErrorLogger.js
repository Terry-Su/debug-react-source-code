  function logCapturedError(capturedError) {

    var error = capturedError.error;

    {
      var componentName = capturedError.componentName,
          componentStack = capturedError.componentStack,
          errorBoundaryName = capturedError.errorBoundaryName,
          errorBoundaryFound = capturedError.errorBoundaryFound,
          willRetry = capturedError.willRetry; // Browsers support silencing uncaught errors by calling
      // `preventDefault()` in window `error` handler.
      // We record this information as an expando on the error.

      if (error != null && error._suppressLogging) {
        if (errorBoundaryFound && willRetry) {
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

      var componentNameMessage = componentName ? "The above error occurred in the <" + componentName + "> component:" : 'The above error occurred in one of your React components:';
      var errorBoundaryMessage; // errorBoundaryFound check is sufficient; errorBoundaryName check is to satisfy Flow.

      if (errorBoundaryFound && errorBoundaryName) {
        if (willRetry) {
          errorBoundaryMessage = "React will try to recreate this component tree from scratch " + ("using the error boundary you provided, " + errorBoundaryName + ".");
        } else {
          errorBoundaryMessage = "This error was initially handled by the error boundary " + errorBoundaryName + ".\n" + "Recreating the tree from scratch failed so React will unmount the tree.";
        }
      } else {
        errorBoundaryMessage = 'Consider adding an error boundary to your tree to customize error handling behavior.\n' + 'Visit https://fb.me/react-error-boundaries to learn more about error boundaries.';
      }

      var combinedMessage = "" + componentNameMessage + componentStack + "\n\n" + ("" + errorBoundaryMessage); // In development, we provide our own message with just the component stack.
      // We don't include the original error message and JS stack because the browser
      // has already printed it. Even if the application swallows the error, it is still
      // displayed by the browser thanks to the DEV-only fake event trick in ReactErrorUtils.

      console['error'](combinedMessage); // Don't transform to our wrapper
    }
  }