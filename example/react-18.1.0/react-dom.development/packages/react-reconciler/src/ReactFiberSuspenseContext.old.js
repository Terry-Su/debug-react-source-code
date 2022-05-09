  var DefaultSuspenseContext = 0; // The Suspense Context is split into two parts. The lower bits is
  // inherited deeply down the subtree. The upper bits only affect
  // this immediate suspense boundary and gets reset each new
  // boundary or suspense list.

  var SubtreeSuspenseContextMask = 1; // Subtree Flags:
  // InvisibleParentSuspenseContext indicates that one of our parent Suspense
  // boundaries is not currently showing visible main content.
  // Either because it is already showing a fallback or is not mounted at all.
  // We can use this to determine if it is desirable to trigger a fallback at
  // the parent. If not, then we might need to trigger undesirable boundaries
  // and/or suspend the commit to avoid hiding the parent content.

  var InvisibleParentSuspenseContext = 1; // Shallow Flags:
  // ForceSuspenseFallback can be used by SuspenseList to force newly added
  // items into their fallback state during one of the render passes.

  var ForceSuspenseFallback = 2;
  var suspenseStackCursor = createCursor(DefaultSuspenseContext);
  function hasSuspenseContext(parentContext, flag) {
    return (parentContext & flag) !== 0;
  }
  function setDefaultShallowSuspenseContext(parentContext) {
    return parentContext & SubtreeSuspenseContextMask;
  }
  function setShallowSuspenseContext(parentContext, shallowContext) {
    return parentContext & SubtreeSuspenseContextMask | shallowContext;
  }
  function addSubtreeSuspenseContext(parentContext, subtreeContext) {
    return parentContext | subtreeContext;
  }
  function pushSuspenseContext(fiber, newContext) {
    push(suspenseStackCursor, newContext, fiber);
  }
  function popSuspenseContext(fiber) {
    pop(suspenseStackCursor, fiber);
  }