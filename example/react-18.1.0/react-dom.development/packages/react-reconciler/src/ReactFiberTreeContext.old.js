  // TODO: Use the unified fiber stack module instead of this local one?
  // Intentionally not using it yet to derisk the initial implementation, because
  // the way we push/pop these values is a bit unusual. If there's a mistake, I'd
  // rather the ids be wrong than crash the whole reconciler.
  var forkStack = [];
  var forkStackIndex = 0;
  var treeForkProvider = null;
  var treeForkCount = 0;
  var idStack = [];
  var idStackIndex = 0;
  var treeContextProvider = null;
  var treeContextId = 1;
  var treeContextOverflow = '';
  function isForkedChild(workInProgress) {
    warnIfNotHydrating();
    return (workInProgress.flags & Forked) !== NoFlags;
  }
  function getForksAtLevel(workInProgress) {
    warnIfNotHydrating();
    return treeForkCount;
  }
  function getTreeId() {
    var overflow = treeContextOverflow;
    var idWithLeadingBit = treeContextId;
    var id = idWithLeadingBit & ~getLeadingBit(idWithLeadingBit);
    return id.toString(32) + overflow;
  }
  function pushTreeFork(workInProgress, totalChildren) {
    // This is called right after we reconcile an array (or iterator) of child
    // fibers, because that's the only place where we know how many children in
    // the whole set without doing extra work later, or storing addtional
    // information on the fiber.
    //
    // That's why this function is separate from pushTreeId — it's called during
    // the render phase of the fork parent, not the child, which is where we push
    // the other context values.
    //
    // In the Fizz implementation this is much simpler because the child is
    // rendered in the same callstack as the parent.
    //
    // It might be better to just add a `forks` field to the Fiber type. It would
    // make this module simpler.
    warnIfNotHydrating();
    forkStack[forkStackIndex++] = treeForkCount;
    forkStack[forkStackIndex++] = treeForkProvider;
    treeForkProvider = workInProgress;
    treeForkCount = totalChildren;
  }
  function pushTreeId(workInProgress, totalChildren, index) {
    warnIfNotHydrating();
    idStack[idStackIndex++] = treeContextId;
    idStack[idStackIndex++] = treeContextOverflow;
    idStack[idStackIndex++] = treeContextProvider;
    treeContextProvider = workInProgress;
    var baseIdWithLeadingBit = treeContextId;
    var baseOverflow = treeContextOverflow; // The leftmost 1 marks the end of the sequence, non-inclusive. It's not part
    // of the id; we use it to account for leading 0s.

    var baseLength = getBitLength(baseIdWithLeadingBit) - 1;
    var baseId = baseIdWithLeadingBit & ~(1 << baseLength);
    var slot = index + 1;
    var length = getBitLength(totalChildren) + baseLength; // 30 is the max length we can store without overflowing, taking into
    // consideration the leading 1 we use to mark the end of the sequence.

    if (length > 30) {
      // We overflowed the bitwise-safe range. Fall back to slower algorithm.
      // This branch assumes the length of the base id is greater than 5; it won't
      // work for smaller ids, because you need 5 bits per character.
      //
      // We encode the id in multiple steps: first the base id, then the
      // remaining digits.
      //
      // Each 5 bit sequence corresponds to a single base 32 character. So for
      // example, if the current id is 23 bits long, we can convert 20 of those
      // bits into a string of 4 characters, with 3 bits left over.
      //
      // First calculate how many bits in the base id represent a complete
      // sequence of characters.
      var numberOfOverflowBits = baseLength - baseLength % 5; // Then create a bitmask that selects only those bits.

      var newOverflowBits = (1 << numberOfOverflowBits) - 1; // Select the bits, and convert them to a base 32 string.

      var newOverflow = (baseId & newOverflowBits).toString(32); // Now we can remove those bits from the base id.

      var restOfBaseId = baseId >> numberOfOverflowBits;
      var restOfBaseLength = baseLength - numberOfOverflowBits; // Finally, encode the rest of the bits using the normal algorithm. Because
      // we made more room, this time it won't overflow.

      var restOfLength = getBitLength(totalChildren) + restOfBaseLength;
      var restOfNewBits = slot << restOfBaseLength;
      var id = restOfNewBits | restOfBaseId;
      var overflow = newOverflow + baseOverflow;
      treeContextId = 1 << restOfLength | id;
      treeContextOverflow = overflow;
    } else {
      // Normal path
      var newBits = slot << baseLength;

      var _id = newBits | baseId;

      var _overflow = baseOverflow;
      treeContextId = 1 << length | _id;
      treeContextOverflow = _overflow;
    }
  }
  function pushMaterializedTreeId(workInProgress) {
    warnIfNotHydrating(); // This component materialized an id. This will affect any ids that appear
    // in its children.

    var returnFiber = workInProgress.return;

    if (returnFiber !== null) {
      var numberOfForks = 1;
      var slotIndex = 0;
      pushTreeFork(workInProgress, numberOfForks);
      pushTreeId(workInProgress, numberOfForks, slotIndex);
    }
  }

  function getBitLength(number) {
    return 32 - clz32(number);
  }

  function getLeadingBit(id) {
    return 1 << getBitLength(id) - 1;
  }

  function popTreeContext(workInProgress) {
    // Restore the previous values.
    // This is a bit more complicated than other context-like modules in Fiber
    // because the same Fiber may appear on the stack multiple times and for
    // different reasons. We have to keep popping until the work-in-progress is
    // no longer at the top of the stack.
    while (workInProgress === treeForkProvider) {
      treeForkProvider = forkStack[--forkStackIndex];
      forkStack[forkStackIndex] = null;
      treeForkCount = forkStack[--forkStackIndex];
      forkStack[forkStackIndex] = null;
    }

    while (workInProgress === treeContextProvider) {
      treeContextProvider = idStack[--idStackIndex];
      idStack[idStackIndex] = null;
      treeContextOverflow = idStack[--idStackIndex];
      idStack[idStackIndex] = null;
      treeContextId = idStack[--idStackIndex];
      idStack[idStackIndex] = null;
    }
  }
  function getSuspendedTreeContext() {
    warnIfNotHydrating();

    if (treeContextProvider !== null) {
      return {
        id: treeContextId,
        overflow: treeContextOverflow
      };
    } else {
      return null;
    }
  }
  function restoreSuspendedTreeContext(workInProgress, suspendedContext) {
    warnIfNotHydrating();
    idStack[idStackIndex++] = treeContextId;
    idStack[idStackIndex++] = treeContextOverflow;
    idStack[idStackIndex++] = treeContextProvider;
    treeContextId = suspendedContext.id;
    treeContextOverflow = suspendedContext.overflow;
    treeContextProvider = workInProgress;
  }

  function warnIfNotHydrating() {
    {
      if (!getIsHydrating()) {
        error('Expected to be hydrating. This is a bug in React. Please file ' + 'an issue.');
      }
    }
  }