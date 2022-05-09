  // If those values are changed that package should be rebuilt and redeployed.

  var TotalLanes = 31;
  var NoLanes =
  /*                        */
  0;
  var NoLane =
  /*                          */
  0;
  var SyncLane =
  /*                        */
  1;
  var InputContinuousHydrationLane =
  /*    */
  2;
  var InputContinuousLane =
  /*            */
  4;
  var DefaultHydrationLane =
  /*            */
  8;
  var DefaultLane =
  /*                    */
  16;
  var TransitionHydrationLane =
  /*                */
  32;
  var TransitionLanes =
  /*                       */
  4194240;
  var TransitionLane1 =
  /*                        */
  64;
  var TransitionLane2 =
  /*                        */
  128;
  var TransitionLane3 =
  /*                        */
  256;
  var TransitionLane4 =
  /*                        */
  512;
  var TransitionLane5 =
  /*                        */
  1024;
  var TransitionLane6 =
  /*                        */
  2048;
  var TransitionLane7 =
  /*                        */
  4096;
  var TransitionLane8 =
  /*                        */
  8192;
  var TransitionLane9 =
  /*                        */
  16384;
  var TransitionLane10 =
  /*                       */
  32768;
  var TransitionLane11 =
  /*                       */
  65536;
  var TransitionLane12 =
  /*                       */
  131072;
  var TransitionLane13 =
  /*                       */
  262144;
  var TransitionLane14 =
  /*                       */
  524288;
  var TransitionLane15 =
  /*                       */
  1048576;
  var TransitionLane16 =
  /*                       */
  2097152;
  var RetryLanes =
  /*                            */
  130023424;
  var RetryLane1 =
  /*                             */
  4194304;
  var RetryLane2 =
  /*                             */
  8388608;
  var RetryLane3 =
  /*                             */
  16777216;
  var RetryLane4 =
  /*                             */
  33554432;
  var RetryLane5 =
  /*                             */
  67108864;
  var SomeRetryLane = RetryLane1;
  var SelectiveHydrationLane =
  /*          */
  134217728;
  var NonIdleLanes =
  /*                                 */
  268435455;
  var IdleHydrationLane =
  /*               */
  268435456;
  var IdleLane =
  /*                       */
  536870912;
  var OffscreenLane =
  /*                   */
  1073741824; // This function is used for the experimental timeline (react-devtools-timeline)
  // It should be kept in sync with the Lanes values above.

  function getLabelForLane(lane) {
    {
      if (lane & SyncLane) {
        return 'Sync';
      }

      if (lane & InputContinuousHydrationLane) {
        return 'InputContinuousHydration';
      }

      if (lane & InputContinuousLane) {
        return 'InputContinuous';
      }

      if (lane & DefaultHydrationLane) {
        return 'DefaultHydration';
      }

      if (lane & DefaultLane) {
        return 'Default';
      }

      if (lane & TransitionHydrationLane) {
        return 'TransitionHydration';
      }

      if (lane & TransitionLanes) {
        return 'Transition';
      }

      if (lane & RetryLanes) {
        return 'Retry';
      }

      if (lane & SelectiveHydrationLane) {
        return 'SelectiveHydration';
      }

      if (lane & IdleHydrationLane) {
        return 'IdleHydration';
      }

      if (lane & IdleLane) {
        return 'Idle';
      }

      if (lane & OffscreenLane) {
        return 'Offscreen';
      }
    }
  }
  var NoTimestamp = -1;
  var nextTransitionLane = TransitionLane1;
  var nextRetryLane = RetryLane1;

  function getHighestPriorityLanes(lanes) {
    switch (getHighestPriorityLane(lanes)) {
      case SyncLane:
        return SyncLane;

      case InputContinuousHydrationLane:
        return InputContinuousHydrationLane;

      case InputContinuousLane:
        return InputContinuousLane;

      case DefaultHydrationLane:
        return DefaultHydrationLane;

      case DefaultLane:
        return DefaultLane;

      case TransitionHydrationLane:
        return TransitionHydrationLane;

      case TransitionLane1:
      case TransitionLane2:
      case TransitionLane3:
      case TransitionLane4:
      case TransitionLane5:
      case TransitionLane6:
      case TransitionLane7:
      case TransitionLane8:
      case TransitionLane9:
      case TransitionLane10:
      case TransitionLane11:
      case TransitionLane12:
      case TransitionLane13:
      case TransitionLane14:
      case TransitionLane15:
      case TransitionLane16:
        return lanes & TransitionLanes;

      case RetryLane1:
      case RetryLane2:
      case RetryLane3:
      case RetryLane4:
      case RetryLane5:
        return lanes & RetryLanes;

      case SelectiveHydrationLane:
        return SelectiveHydrationLane;

      case IdleHydrationLane:
        return IdleHydrationLane;

      case IdleLane:
        return IdleLane;

      case OffscreenLane:
        return OffscreenLane;

      default:
        {
          error('Should have found matching lanes. This is a bug in React.');
        } // This shouldn't be reachable, but as a fallback, return the entire bitmask.


        return lanes;
    }
  }

  function getNextLanes(root, wipLanes) {
    // Early bailout if there's no pending work left.
    var pendingLanes = root.pendingLanes;

    if (pendingLanes === NoLanes) {
      return NoLanes;
    }

    var nextLanes = NoLanes;
    var suspendedLanes = root.suspendedLanes;
    var pingedLanes = root.pingedLanes; // Do not work on any idle work until all the non-idle work has finished,
    // even if the work is suspended.

    var nonIdlePendingLanes = pendingLanes & NonIdleLanes;

    if (nonIdlePendingLanes !== NoLanes) {
      var nonIdleUnblockedLanes = nonIdlePendingLanes & ~suspendedLanes;

      if (nonIdleUnblockedLanes !== NoLanes) {
        nextLanes = getHighestPriorityLanes(nonIdleUnblockedLanes);
      } else {
        var nonIdlePingedLanes = nonIdlePendingLanes & pingedLanes;

        if (nonIdlePingedLanes !== NoLanes) {
          nextLanes = getHighestPriorityLanes(nonIdlePingedLanes);
        }
      }
    } else {
      // The only remaining work is Idle.
      var unblockedLanes = pendingLanes & ~suspendedLanes;

      if (unblockedLanes !== NoLanes) {
        nextLanes = getHighestPriorityLanes(unblockedLanes);
      } else {
        if (pingedLanes !== NoLanes) {
          nextLanes = getHighestPriorityLanes(pingedLanes);
        }
      }
    }

    if (nextLanes === NoLanes) {
      // This should only be reachable if we're suspended
      // TODO: Consider warning in this path if a fallback timer is not scheduled.
      return NoLanes;
    } // If we're already in the middle of a render, switching lanes will interrupt
    // it and we'll lose our progress. We should only do this if the new lanes are
    // higher priority.


    if (wipLanes !== NoLanes && wipLanes !== nextLanes && // If we already suspended with a delay, then interrupting is fine. Don't
    // bother waiting until the root is complete.
    (wipLanes & suspendedLanes) === NoLanes) {
      var nextLane = getHighestPriorityLane(nextLanes);
      var wipLane = getHighestPriorityLane(wipLanes);

      if ( // Tests whether the next lane is equal or lower priority than the wip
      // one. This works because the bits decrease in priority as you go left.
      nextLane >= wipLane || // Default priority updates should not interrupt transition updates. The
      // only difference between default updates and transition updates is that
      // default updates do not support refresh transitions.
      nextLane === DefaultLane && (wipLane & TransitionLanes) !== NoLanes) {
        // Keep working on the existing in-progress tree. Do not interrupt.
        return wipLanes;
      }
    }

    if ((nextLanes & InputContinuousLane) !== NoLanes) {
      // When updates are sync by default, we entangle continuous priority updates
      // and default updates, so they render in the same batch. The only reason
      // they use separate lanes is because continuous updates should interrupt
      // transitions, but default updates should not.
      nextLanes |= pendingLanes & DefaultLane;
    } // Check for entangled lanes and add them to the batch.
    //
    // A lane is said to be entangled with another when it's not allowed to render
    // in a batch that does not also include the other lane. Typically we do this
    // when multiple updates have the same source, and we only want to respond to
    // the most recent event from that source.
    //
    // Note that we apply entanglements *after* checking for partial work above.
    // This means that if a lane is entangled during an interleaved event while
    // it's already rendering, we won't interrupt it. This is intentional, since
    // entanglement is usually "best effort": we'll try our best to render the
    // lanes in the same batch, but it's not worth throwing out partially
    // completed work in order to do it.
    // TODO: Reconsider this. The counter-argument is that the partial work
    // represents an intermediate state, which we don't want to show to the user.
    // And by spending extra time finishing it, we're increasing the amount of
    // time it takes to show the final state, which is what they are actually
    // waiting for.
    //
    // For those exceptions where entanglement is semantically important, like
    // useMutableSource, we should ensure that there is no partial work at the
    // time we apply the entanglement.


    var entangledLanes = root.entangledLanes;

    if (entangledLanes !== NoLanes) {
      var entanglements = root.entanglements;
      var lanes = nextLanes & entangledLanes;

      while (lanes > 0) {
        var index = pickArbitraryLaneIndex(lanes);
        var lane = 1 << index;
        nextLanes |= entanglements[index];
        lanes &= ~lane;
      }
    }

    return nextLanes;
  }
  function getMostRecentEventTime(root, lanes) {
    var eventTimes = root.eventTimes;
    var mostRecentEventTime = NoTimestamp;

    while (lanes > 0) {
      var index = pickArbitraryLaneIndex(lanes);
      var lane = 1 << index;
      var eventTime = eventTimes[index];

      if (eventTime > mostRecentEventTime) {
        mostRecentEventTime = eventTime;
      }

      lanes &= ~lane;
    }

    return mostRecentEventTime;
  }

  function computeExpirationTime(lane, currentTime) {
    switch (lane) {
      case SyncLane:
      case InputContinuousHydrationLane:
      case InputContinuousLane:
        // User interactions should expire slightly more quickly.
        //
        // NOTE: This is set to the corresponding constant as in Scheduler.js.
        // When we made it larger, a product metric in www regressed, suggesting
        // there's a user interaction that's being starved by a series of
        // synchronous updates. If that theory is correct, the proper solution is
        // to fix the starvation. However, this scenario supports the idea that
        // expiration times are an important safeguard when starvation
        // does happen.
        return currentTime + 250;

      case DefaultHydrationLane:
      case DefaultLane:
      case TransitionHydrationLane:
      case TransitionLane1:
      case TransitionLane2:
      case TransitionLane3:
      case TransitionLane4:
      case TransitionLane5:
      case TransitionLane6:
      case TransitionLane7:
      case TransitionLane8:
      case TransitionLane9:
      case TransitionLane10:
      case TransitionLane11:
      case TransitionLane12:
      case TransitionLane13:
      case TransitionLane14:
      case TransitionLane15:
      case TransitionLane16:
        return currentTime + 5000;

      case RetryLane1:
      case RetryLane2:
      case RetryLane3:
      case RetryLane4:
      case RetryLane5:
        // TODO: Retries should be allowed to expire if they are CPU bound for
        // too long, but when I made this change it caused a spike in browser
        // crashes. There must be some other underlying bug; not super urgent but
        // ideally should figure out why and fix it. Unfortunately we don't have
        // a repro for the crashes, only detected via production metrics.
        return NoTimestamp;

      case SelectiveHydrationLane:
      case IdleHydrationLane:
      case IdleLane:
      case OffscreenLane:
        // Anything idle priority or lower should never expire.
        return NoTimestamp;

      default:
        {
          error('Should have found matching lanes. This is a bug in React.');
        }

        return NoTimestamp;
    }
  }

  function markStarvedLanesAsExpired(root, currentTime) {
    // TODO: This gets called every time we yield. We can optimize by storing
    // the earliest expiration time on the root. Then use that to quickly bail out
    // of this function.
    var pendingLanes = root.pendingLanes;
    var suspendedLanes = root.suspendedLanes;
    var pingedLanes = root.pingedLanes;
    var expirationTimes = root.expirationTimes; // Iterate through the pending lanes and check if we've reached their
    // expiration time. If so, we'll assume the update is being starved and mark
    // it as expired to force it to finish.

    var lanes = pendingLanes;

    while (lanes > 0) {
      var index = pickArbitraryLaneIndex(lanes);
      var lane = 1 << index;
      var expirationTime = expirationTimes[index];

      if (expirationTime === NoTimestamp) {
        // Found a pending lane with no expiration time. If it's not suspended, or
        // if it's pinged, assume it's CPU-bound. Compute a new expiration time
        // using the current time.
        if ((lane & suspendedLanes) === NoLanes || (lane & pingedLanes) !== NoLanes) {
          // Assumes timestamps are monotonically increasing.
          expirationTimes[index] = computeExpirationTime(lane, currentTime);
        }
      } else if (expirationTime <= currentTime) {
        // This lane expired
        root.expiredLanes |= lane;
      }

      lanes &= ~lane;
    }
  } // This returns the highest priority pending lanes regardless of whether they
  // are suspended.

  function getHighestPriorityPendingLanes(root) {
    return getHighestPriorityLanes(root.pendingLanes);
  }
  function getLanesToRetrySynchronouslyOnError(root) {
    var everythingButOffscreen = root.pendingLanes & ~OffscreenLane;

    if (everythingButOffscreen !== NoLanes) {
      return everythingButOffscreen;
    }

    if (everythingButOffscreen & OffscreenLane) {
      return OffscreenLane;
    }

    return NoLanes;
  }
  function includesSyncLane(lanes) {
    return (lanes & SyncLane) !== NoLanes;
  }
  function includesNonIdleWork(lanes) {
    return (lanes & NonIdleLanes) !== NoLanes;
  }
  function includesOnlyRetries(lanes) {
    return (lanes & RetryLanes) === lanes;
  }
  function includesOnlyTransitions(lanes) {
    return (lanes & TransitionLanes) === lanes;
  }
  function includesBlockingLane(root, lanes) {

    var SyncDefaultLanes = InputContinuousHydrationLane | InputContinuousLane | DefaultHydrationLane | DefaultLane;
    return (lanes & SyncDefaultLanes) !== NoLanes;
  }
  function includesExpiredLane(root, lanes) {
    // This is a separate check from includesBlockingLane because a lane can
    // expire after a render has already started.
    return (lanes & root.expiredLanes) !== NoLanes;
  }
  function isTransitionLane(lane) {
    return (lane & TransitionLanes) !== 0;
  }
  function claimNextTransitionLane() {
    // Cycle through the lanes, assigning each new transition to the next lane.
    // In most cases, this means every transition gets its own lane, until we
    // run out of lanes and cycle back to the beginning.
    var lane = nextTransitionLane;
    nextTransitionLane <<= 1;

    if ((nextTransitionLane & TransitionLanes) === 0) {
      nextTransitionLane = TransitionLane1;
    }

    return lane;
  }
  function claimNextRetryLane() {
    var lane = nextRetryLane;
    nextRetryLane <<= 1;

    if ((nextRetryLane & RetryLanes) === 0) {
      nextRetryLane = RetryLane1;
    }

    return lane;
  }
  function getHighestPriorityLane(lanes) {
    return lanes & -lanes;
  }
  function pickArbitraryLane(lanes) {
    // This wrapper function gets inlined. Only exists so to communicate that it
    // doesn't matter which bit is selected; you can pick any bit without
    // affecting the algorithms where its used. Here I'm using
    // getHighestPriorityLane because it requires the fewest operations.
    return getHighestPriorityLane(lanes);
  }

  function pickArbitraryLaneIndex(lanes) {
    return 31 - clz32(lanes);
  }

  function laneToIndex(lane) {
    return pickArbitraryLaneIndex(lane);
  }

  function includesSomeLane(a, b) {
    return (a & b) !== NoLanes;
  }
  function isSubsetOfLanes(set, subset) {
    return (set & subset) === subset;
  }
  function mergeLanes(a, b) {
    return a | b;
  }
  function removeLanes(set, subset) {
    return set & ~subset;
  }
  function intersectLanes(a, b) {
    return a & b;
  } // Seems redundant, but it changes the type from a single lane (used for
  // updates) to a group of lanes (used for flushing work).

  function laneToLanes(lane) {
    return lane;
  }
  function higherPriorityLane(a, b) {
    // This works because the bit ranges decrease in priority as you go left.
    return a !== NoLane && a < b ? a : b;
  }
  function createLaneMap(initial) {
    // Intentionally pushing one by one.
    // https://v8.dev/blog/elements-kinds#avoid-creating-holes
    var laneMap = [];

    for (var i = 0; i < TotalLanes; i++) {
      laneMap.push(initial);
    }

    return laneMap;
  }
  function markRootUpdated(root, updateLane, eventTime) {
    root.pendingLanes |= updateLane; // If there are any suspended transitions, it's possible this new update
    // could unblock them. Clear the suspended lanes so that we can try rendering
    // them again.
    //
    // TODO: We really only need to unsuspend only lanes that are in the
    // `subtreeLanes` of the updated fiber, or the update lanes of the return
    // path. This would exclude suspended updates in an unrelated sibling tree,
    // since there's no way for this update to unblock it.
    //
    // We don't do this if the incoming update is idle, because we never process
    // idle updates until after all the regular updates have finished; there's no
    // way it could unblock a transition.

    if (updateLane !== IdleLane) {
      root.suspendedLanes = NoLanes;
      root.pingedLanes = NoLanes;
    }

    var eventTimes = root.eventTimes;
    var index = laneToIndex(updateLane); // We can always overwrite an existing timestamp because we prefer the most
    // recent event, and we assume time is monotonically increasing.

    eventTimes[index] = eventTime;
  }
  function markRootSuspended(root, suspendedLanes) {
    root.suspendedLanes |= suspendedLanes;
    root.pingedLanes &= ~suspendedLanes; // The suspended lanes are no longer CPU-bound. Clear their expiration times.

    var expirationTimes = root.expirationTimes;
    var lanes = suspendedLanes;

    while (lanes > 0) {
      var index = pickArbitraryLaneIndex(lanes);
      var lane = 1 << index;
      expirationTimes[index] = NoTimestamp;
      lanes &= ~lane;
    }
  }
  function markRootPinged(root, pingedLanes, eventTime) {
    root.pingedLanes |= root.suspendedLanes & pingedLanes;
  }
  function markRootFinished(root, remainingLanes) {
    var noLongerPendingLanes = root.pendingLanes & ~remainingLanes;
    root.pendingLanes = remainingLanes; // Let's try everything again

    root.suspendedLanes = 0;
    root.pingedLanes = 0;
    root.expiredLanes &= remainingLanes;
    root.mutableReadLanes &= remainingLanes;
    root.entangledLanes &= remainingLanes;
    var entanglements = root.entanglements;
    var eventTimes = root.eventTimes;
    var expirationTimes = root.expirationTimes; // Clear the lanes that no longer have pending work

    var lanes = noLongerPendingLanes;

    while (lanes > 0) {
      var index = pickArbitraryLaneIndex(lanes);
      var lane = 1 << index;
      entanglements[index] = NoLanes;
      eventTimes[index] = NoTimestamp;
      expirationTimes[index] = NoTimestamp;
      lanes &= ~lane;
    }
  }
  function markRootEntangled(root, entangledLanes) {
    // In addition to entangling each of the given lanes with each other, we also
    // have to consider _transitive_ entanglements. For each lane that is already
    // entangled with *any* of the given lanes, that lane is now transitively
    // entangled with *all* the given lanes.
    //
    // Translated: If C is entangled with A, then entangling A with B also
    // entangles C with B.
    //
    // If this is hard to grasp, it might help to intentionally break this
    // function and look at the tests that fail in ReactTransition-test.js. Try
    // commenting out one of the conditions below.
    var rootEntangledLanes = root.entangledLanes |= entangledLanes;
    var entanglements = root.entanglements;
    var lanes = rootEntangledLanes;

    while (lanes) {
      var index = pickArbitraryLaneIndex(lanes);
      var lane = 1 << index;

      if ( // Is this one of the newly entangled lanes?
      lane & entangledLanes | // Is this lane transitively entangled with the newly entangled lanes?
      entanglements[index] & entangledLanes) {
        entanglements[index] |= entangledLanes;
      }

      lanes &= ~lane;
    }
  }
  function getBumpedLaneForHydration(root, renderLanes) {
    var renderLane = getHighestPriorityLane(renderLanes);
    var lane;

    switch (renderLane) {
      case InputContinuousLane:
        lane = InputContinuousHydrationLane;
        break;

      case DefaultLane:
        lane = DefaultHydrationLane;
        break;

      case TransitionLane1:
      case TransitionLane2:
      case TransitionLane3:
      case TransitionLane4:
      case TransitionLane5:
      case TransitionLane6:
      case TransitionLane7:
      case TransitionLane8:
      case TransitionLane9:
      case TransitionLane10:
      case TransitionLane11:
      case TransitionLane12:
      case TransitionLane13:
      case TransitionLane14:
      case TransitionLane15:
      case TransitionLane16:
      case RetryLane1:
      case RetryLane2:
      case RetryLane3:
      case RetryLane4:
      case RetryLane5:
        lane = TransitionHydrationLane;
        break;

      case IdleLane:
        lane = IdleHydrationLane;
        break;

      default:
        // Everything else is already either a hydration lane, or shouldn't
        // be retried at a hydration lane.
        lane = NoLane;
        break;
    } // Check if the lane we chose is suspended. If so, that indicates that we
    // already attempted and failed to hydrate at that level. Also check if we're
    // already rendering that lane, which is rare but could happen.


    if ((lane & (root.suspendedLanes | renderLanes)) !== NoLane) {
      // Give up trying to hydrate and fall back to client render.
      return NoLane;
    }

    return lane;
  }
  function addFiberToLanesMap(root, fiber, lanes) {

    if (!isDevToolsPresent) {
      return;
    }

    var pendingUpdatersLaneMap = root.pendingUpdatersLaneMap;

    while (lanes > 0) {
      var index = laneToIndex(lanes);
      var lane = 1 << index;
      var updaters = pendingUpdatersLaneMap[index];
      updaters.add(fiber);
      lanes &= ~lane;
    }
  }
  function movePendingFibersToMemoized(root, lanes) {

    if (!isDevToolsPresent) {
      return;
    }

    var pendingUpdatersLaneMap = root.pendingUpdatersLaneMap;
    var memoizedUpdaters = root.memoizedUpdaters;

    while (lanes > 0) {
      var index = laneToIndex(lanes);
      var lane = 1 << index;
      var updaters = pendingUpdatersLaneMap[index];

      if (updaters.size > 0) {
        updaters.forEach(function (fiber) {
          var alternate = fiber.alternate;

          if (alternate === null || !memoizedUpdaters.has(alternate)) {
            memoizedUpdaters.add(fiber);
          }
        });
        updaters.clear();
      }

      lanes &= ~lane;
    }
  }