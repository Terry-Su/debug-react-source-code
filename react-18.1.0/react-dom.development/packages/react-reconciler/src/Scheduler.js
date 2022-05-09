  var scheduleCallback = unstable_scheduleCallback;
  var cancelCallback = unstable_cancelCallback;
  var shouldYield = unstable_shouldYield;
  var requestPaint = unstable_requestPaint;
  var now = unstable_now;
  var getCurrentPriorityLevel = unstable_getCurrentPriorityLevel;
  var ImmediatePriority = unstable_ImmediatePriority;
  var UserBlockingPriority = unstable_UserBlockingPriority;
  var NormalPriority = unstable_NormalPriority;
  var LowPriority = unstable_LowPriority;
  var IdlePriority = unstable_IdlePriority;
  // this doesn't actually exist on the scheduler, but it *does*
  // on scheduler/unstable_mock, which we'll need for internal testing
  var unstable_yieldValue$1 = unstable_yieldValue;
  var unstable_setDisableYieldValue$1 = unstable_setDisableYieldValue;