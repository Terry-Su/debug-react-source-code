  var Scheduler_now = unstable_now;

  {
    // Provide explicit error message when production+profiling bundle of e.g.
    // react-dom is used with production (non-profiling) bundle of
    // scheduler/tracing
    if (!(__interactionsRef != null && __interactionsRef.current != null)) {
      {
        throw Error( "It is not supported to run the profiling version of a renderer (for example, `react-dom/profiling`) without also replacing the `scheduler/tracing` module with `scheduler/tracing-profiling`. Your bundler might have a setting for aliasing both modules. Learn more at https://reactjs.org/link/profiling" );
      }
    }
  }
  // ascending numbers so we can compare them like numbers. They start at 90 to
  // avoid clashing with Scheduler's priorities.

  var ImmediatePriority = 99;
  var UserBlockingPriority = 98;
  var NormalPriority = 97;
  var LowPriority = 96;
  var IdlePriority = 95; // NoPriority is the absence of priority. Also React-only.

  var NoPriority = 90;
  var initialTimeMs = Scheduler_now(); // If the initial timestamp is reasonably small, use Scheduler's `now` directly.