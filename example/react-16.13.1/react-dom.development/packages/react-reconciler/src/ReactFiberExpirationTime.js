  var NoWork = 0; // TODO: Think of a better name for Never. The key difference with Idle is that
  // Never work can be committed in an inconsistent state without tearing the UI.
  // The main example is offscreen content, like a hidden subtree. So one possible
  // name is Offscreen. However, it also includes dehydrated Suspense boundaries,
  // which are inconsistent in the sense that they haven't finished yet, but
  // aren't visibly inconsistent because the server rendered HTML matches what the
  // hydrated tree would look like.

  var Never = 1; // Idle is slightly higher priority than Never. It must completely finish in
  // order to be consistent.

  var Idle = 2; // Continuous Hydration is slightly higher than Idle and is used to increase
  // priority of hover targets.

  var ContinuousHydration = 3;
  var Sync = MAX_SIGNED_31_BIT_INT;
  var Batched = Sync - 1;
  var UNIT_SIZE = 10;
  var MAGIC_NUMBER_OFFSET = Batched - 1; // 1 unit of expiration time represents 10ms.

  function msToExpirationTime(ms) {
    // Always subtract from the offset so that we don't clash with the magic number for NoWork.
    return MAGIC_NUMBER_OFFSET - (ms / UNIT_SIZE | 0);
  }
  function expirationTimeToMs(expirationTime) {
    return (MAGIC_NUMBER_OFFSET - expirationTime) * UNIT_SIZE;
  }

  function ceiling(num, precision) {
    return ((num / precision | 0) + 1) * precision;
  }

  function computeExpirationBucket(currentTime, expirationInMs, bucketSizeMs) {
    return MAGIC_NUMBER_OFFSET - ceiling(MAGIC_NUMBER_OFFSET - currentTime + expirationInMs / UNIT_SIZE, bucketSizeMs / UNIT_SIZE);
  } // TODO: This corresponds to Scheduler's NormalPriority, not LowPriority. Update
  // the names to reflect.


  var LOW_PRIORITY_EXPIRATION = 5000;
  var LOW_PRIORITY_BATCH_SIZE = 250;
  function computeAsyncExpiration(currentTime) {
    return computeExpirationBucket(currentTime, LOW_PRIORITY_EXPIRATION, LOW_PRIORITY_BATCH_SIZE);
  }
  function computeSuspenseExpiration(currentTime, timeoutMs) {
    // TODO: Should we warn if timeoutMs is lower than the normal pri expiration time?
    return computeExpirationBucket(currentTime, timeoutMs, LOW_PRIORITY_BATCH_SIZE);
  } // We intentionally set a higher expiration time for interactive updates in
  // dev than in production.
  //
  // If the main thread is being blocked so long that you hit the expiration,
  // it's a problem that could be solved with better scheduling.
  //
  // People will be more likely to notice this and fix it with the long
  // expiration time in development.
  //
  // In production we opt for better UX at the risk of masking scheduling
  // problems, by expiring fast.

  var HIGH_PRIORITY_EXPIRATION =  500 ;
  var HIGH_PRIORITY_BATCH_SIZE = 100;
  function computeInteractiveExpiration(currentTime) {
    return computeExpirationBucket(currentTime, HIGH_PRIORITY_EXPIRATION, HIGH_PRIORITY_BATCH_SIZE);
  }
  function inferPriorityFromExpirationTime(currentTime, expirationTime) {
    if (expirationTime === Sync) {
      return ImmediatePriority;
    }

    if (expirationTime === Never || expirationTime === Idle) {
      return IdlePriority;
    }

    var msUntil = expirationTimeToMs(expirationTime) - expirationTimeToMs(currentTime);

    if (msUntil <= 0) {
      return ImmediatePriority;
    }

    if (msUntil <= HIGH_PRIORITY_EXPIRATION + HIGH_PRIORITY_BATCH_SIZE) {
      return UserBlockingPriority$1;
    }

    if (msUntil <= LOW_PRIORITY_EXPIRATION + LOW_PRIORITY_BATCH_SIZE) {
      return NormalPriority;
    } // TODO: Handle LowPriority
    // Assume anything lower has idle priority


    return IdlePriority;
  }