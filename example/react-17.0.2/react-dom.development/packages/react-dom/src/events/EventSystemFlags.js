  var IS_EVENT_HANDLE_NON_MANAGED_NODE = 1;
  var IS_NON_DELEGATED = 1 << 1;
  var IS_CAPTURE_PHASE = 1 << 2;
  var IS_REPLAYED = 1 << 4;
  // set to LEGACY_FB_SUPPORT. LEGACY_FB_SUPPORT only gets set when
  // we call willDeferLaterForLegacyFBSupport, thus not bailing out
  // will result in endless cycles like an infinite loop.
  // We also don't want to defer during event replaying.

  var SHOULD_NOT_PROCESS_POLYFILL_EVENT_PLUGINS = IS_EVENT_HANDLE_NON_MANAGED_NODE | IS_NON_DELEGATED | IS_CAPTURE_PHASE;