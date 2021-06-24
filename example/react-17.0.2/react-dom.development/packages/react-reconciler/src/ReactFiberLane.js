  var SyncLanePriority = 15;
  var SyncBatchedLanePriority = 14;
  var InputDiscreteHydrationLanePriority = 13;
  var InputDiscreteLanePriority = 12;
  var InputContinuousHydrationLanePriority = 11;
  var InputContinuousLanePriority = 10;
  var DefaultHydrationLanePriority = 9;
  var DefaultLanePriority = 8;
  var TransitionHydrationPriority = 7;
  var TransitionPriority = 6;
  var RetryLanePriority = 5;
  var SelectiveHydrationLanePriority = 4;
  var IdleHydrationLanePriority = 3;
  var IdleLanePriority = 2;
  var OffscreenLanePriority = 1;
  var NoLanePriority = 0;
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
  var SyncBatchedLane =
  /*                 */
  2;
  var InputDiscreteHydrationLane =
  /*      */
  4;
  var InputDiscreteLanes =
  /*                    */
  24;
  var InputContinuousHydrationLane =
  /*           */
  32;
  var InputContinuousLanes =
  /*                  */
  192;
  var DefaultHydrationLane =
  /*            */
  256;
  var DefaultLanes =
  /*                   */
  3584;
  var TransitionHydrationLane =
  /*                */
  4096;
  var TransitionLanes =
  /*                       */
  4186112;
  var RetryLanes =
  /*                            */
  62914560;
  var SomeRetryLane =
  /*                  */
  33554432;
  var SelectiveHydrationLane =
  /*          */
  67108864;
  var NonIdleLanes =
  /*                                 */
  134217727;
  var IdleHydrationLane =
  /*               */
  134217728;
  var IdleLanes =
  /*                             */
  805306368;
  var OffscreenLane =
  /*                   */
  1073741824;
  var NoTimestamp = -1;
  var currentUpdateLanePriority = NoLanePriority;
  function getCurrentUpdateLanePriority() {
    return currentUpdateLanePriority;
  }
  function setCurrentUpdateLanePriority(newLanePriority) {
    currentUpdateLanePriority = newLanePriority;
  } // "Registers" used to "return" multiple values
  // Used by getHighestPriorityLanes and getNextLanes:

  var return_highestLanePriority = DefaultLanePriority;

  function getHighestPriorityLanes(lanes) {
    if ((SyncLane & lanes) !== NoLanes) {
      return_highestLanePriority = SyncLanePriority;
      return SyncLane;
    }

    if ((SyncBatchedLane & lanes) !== NoLanes) {
      return_highestLanePriority = SyncBatchedLanePriority;
      return SyncBatchedLane;
    }

    if ((InputDiscreteHydrationLane & lanes) !== NoLanes) {
      return_highestLanePriority = InputDiscreteHydrationLanePriority;
      return InputDiscreteHydrationLane;
    }

    var inputDiscreteLanes = InputDiscreteLanes & lanes;

    if (inputDiscreteLanes !== NoLanes) {
      return_highestLanePriority = InputDiscreteLanePriority;
      return inputDiscreteLanes;
    }

    if ((lanes & InputContinuousHydrationLane) !== NoLanes) {
      return_highestLanePriority = InputContinuousHydrationLanePriority;
      return InputContinuousHydrationLane;
    }

    var inputContinuousLanes = InputContinuousLanes & lanes;

    if (inputContinuousLanes !== NoLanes) {
      return_highestLanePriority = InputContinuousLanePriority;
      return inputContinuousLanes;
    }

    if ((lanes & DefaultHydrationLane) !== NoLanes) {
      return_highestLanePriority = DefaultHydrationLanePriority;
      return DefaultHydrationLane;
    }

    var defaultLanes = DefaultLanes & lanes;

    if (defaultLanes !== NoLanes) {
      return_highestLanePriority = DefaultLanePriority;
      return defaultLanes;
    }

    if ((lanes & TransitionHydrationLane) !== NoLanes) {
      return_highestLanePriority = TransitionHydrationPriority;
      return TransitionHydrationLane;
    }

    var transitionLanes = TransitionLanes & lanes;

    if (transitionLanes !== NoLanes) {
      return_highestLanePriority = TransitionPriority;
      return transitionLanes;
    }

    var retryLanes = RetryLanes & lanes;

    if (retryLanes !== NoLanes) {
      return_highestLanePriority = RetryLanePriority;
      return retryLanes;
    }

    if (lanes & SelectiveHydrationLane) {
      return_highestLanePriority = SelectiveHydrationLanePriority;
      return SelectiveHydrationLane;
    }

    if ((lanes & IdleHydrationLane) !== NoLanes) {
      return_highestLanePriority = IdleHydrationLanePriority;
      return IdleHydrationLane;
    }

    var idleLanes = IdleLanes & lanes;

    if (idleLanes !== NoLanes) {
      return_highestLanePriority = IdleLanePriority;
      return idleLanes;
    }

    if ((OffscreenLane & lanes) !== NoLanes) {
      return_highestLanePriority = OffscreenLanePriority;
      return OffscreenLane;
    }

    {
      error('Should have found matching lanes. This is a bug in React.');
    } // This shouldn't be reachable, but as a fallback, return the entire bitmask.


    return_highestLanePriority = DefaultLanePriority;
    return lanes;
  }

  function schedulerPriorityToLanePriority(schedulerPriorityLevel) {
    switch (schedulerPriorityLevel) {
      case ImmediatePriority:
        return SyncLanePriority;

      case UserBlockingPriority:
        return InputContinuousLanePriority;

      case NormalPriority:
      case LowPriority:
        // TODO: Handle LowSchedulerPriority, somehow. Maybe the same lane as hydration.
        return DefaultLanePriority;

      case IdlePriority:
        return IdleLanePriority;

      default:
        return NoLanePriority;
    }
  }
  function lanePriorityToSchedulerPriority(lanePriority) {
    switch (lanePriority) {
      case SyncLanePriority:
      case SyncBatchedLanePriority:
        return ImmediatePriority;

      case InputDiscreteHydrationLanePriority:
      case InputDiscreteLanePriority:
      case InputContinuousHydrationLanePriority:
      case InputContinuousLanePriority:
        return UserBlockingPriority;

      case DefaultHydrationLanePriority:
      case DefaultLanePriority:
      case TransitionHydrationPriority:
      case TransitionPriority:
      case SelectiveHydrationLanePriority:
      case RetryLanePriority:
        return NormalPriority;

      case IdleHydrationLanePriority:
      case IdleLanePriority:
      case OffscreenLanePriority:
        return IdlePriority;

      case NoLanePriority:
        return NoPriority;

      default:
        {
          {
            throw Error( "Invalid update priority: " + lanePriority + ". This is a bug in React." );
          }
        }

    }
  }
  function getNextLanes(root, wipLanes) {
    // Early bailout if there's no pending work left.
    var pendingLanes = root.pendingLanes;

    if (pendingLanes === NoLanes) {
      return_highestLanePriority = NoLanePriority;
      return NoLanes;
    }

    var nextLanes = NoLanes;
    var nextLanePriority = NoLanePriority;
    var expiredLanes = root.expiredLanes;
    var suspendedLanes = root.suspendedLanes;
    var pingedLanes = root.pingedLanes; // Check if any work has expired.

    if (expiredLanes !== NoLanes) {
      nextLanes = expiredLanes;
      nextLanePriority = return_highestLanePriority = SyncLanePriority;
    } else {
      // Do not work on any idle work until all the non-idle work has finished,
      // even if the work is suspended.
      var nonIdlePendingLanes = pendingLanes & NonIdleLanes;

      if (nonIdlePendingLanes !== NoLanes) {
        var nonIdleUnblockedLanes = nonIdlePendingLanes & ~suspendedLanes;

        if (nonIdleUnblockedLanes !== NoLanes) {
          nextLanes = getHighestPriorityLanes(nonIdleUnblockedLanes);
          nextLanePriority = return_highestLanePriority;
        } else {
          var nonIdlePingedLanes = nonIdlePendingLanes & pingedLanes;

          if (nonIdlePingedLanes !== NoLanes) {
            nextLanes = getHighestPriorityLanes(nonIdlePingedLanes);
            nextLanePriority = return_highestLanePriority;
          }
        }
      } else {
        // The only remaining work is Idle.
        var unblockedLanes = pendingLanes & ~suspendedLanes;

        if (unblockedLanes !== NoLanes) {
          nextLanes = getHighestPriorityLanes(unblockedLanes);
          nextLanePriority = return_highestLanePriority;
        } else {
          if (pingedLanes !== NoLanes) {
            nextLanes = getHighestPriorityLanes(pingedLanes);
            nextLanePriority = return_highestLanePriority;
          }
        }
      }
    }

    if (nextLanes === NoLanes) {
      // This should only be reachable if we're suspended
      // TODO: Consider warning in this path if a fallback timer is not scheduled.
      return NoLanes;
    } // If there are higher priority lanes, we'll include them even if they
    // are suspended.


    nextLanes = pendingLanes & getEqualOrHigherPriorityLanes(nextLanes); // If we're already in the middle of a render, switching lanes will interrupt
    // it and we'll lose our progress. We should only do this if the new lanes are
    // higher priority.

    if (wipLanes !== NoLanes && wipLanes !== nextLanes && // If we already suspended with a delay, then interrupting is fine. Don't
    // bother waiting until the root is complete.
    (wipLanes & suspendedLanes) === NoLanes) {
      getHighestPriorityLanes(wipLanes);
      var wipLanePriority = return_highestLanePriority;

      if (nextLanePriority <= wipLanePriority) {
        return wipLanes;
      } else {
        return_highestLanePriority = nextLanePriority;
      }
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
    // TODO: Expiration heuristic is constant per lane, so could use a map.
    getHighestPriorityLanes(lane);
    var priority = return_highestLanePriority;

    if (priority >= InputContinuousLanePriority) {
      // User interactions should expire slightly more quickly.
      //
      // NOTE: This is set to the corresponding constant as in Scheduler.js. When
      // we made it larger, a product metric in www regressed, suggesting there's
      // a user interaction that's being starved by a series of synchronous
      // updates. If that theory is correct, the proper solution is to fix the
      // starvation. However, this scenario supports the idea that expiration
      // times are an important safeguard when starvation does happen.
      //
      // Also note that, in the case of user input specifically, this will soon no
      // longer be an issue because we plan to make user input synchronous by
      // default (until you enter `startTransition`, of course.)
      //
      // If weren't planning to make these updates synchronous soon anyway, I
      // would probably make this number a configurable parameter.
      return currentTime + 250;
    } else if (priority >= TransitionPriority) {
      return currentTime + 5000;
    } else {
      // Anything idle priority or lower should never expire.
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
  function returnNextLanesPriority() {
    return return_highestLanePriority;
  }
  function includesNonIdleWork(lanes) {
    return (lanes & NonIdleLanes) !== NoLanes;
  }
  function includesOnlyRetries(lanes) {
    return (lanes & RetryLanes) === lanes;
  }
  function includesOnlyTransitions(lanes) {
    return (lanes & TransitionLanes) === lanes;
  } // To ensure consistency across multiple updates in the same event, this should
  // be a pure function, so that it always returns the same lane for given inputs.

  function findUpdateLane(lanePriority, wipLanes) {
    switch (lanePriority) {
      case NoLanePriority:
        break;

      case SyncLanePriority:
        return SyncLane;

      case SyncBatchedLanePriority:
        return SyncBatchedLane;

      case InputDiscreteLanePriority:
        {
          var _lane = pickArbitraryLane(InputDiscreteLanes & ~wipLanes);

          if (_lane === NoLane) {
            // Shift to the next priority level
            return findUpdateLane(InputContinuousLanePriority, wipLanes);
          }

          return _lane;
        }

      case InputContinuousLanePriority:
        {
          var _lane2 = pickArbitraryLane(InputContinuousLanes & ~wipLanes);

          if (_lane2 === NoLane) {
            // Shift to the next priority level
            return findUpdateLane(DefaultLanePriority, wipLanes);
          }

          return _lane2;
        }

      case DefaultLanePriority:
        {
          var _lane3 = pickArbitraryLane(DefaultLanes & ~wipLanes);

          if (_lane3 === NoLane) {
            // If all the default lanes are already being worked on, look for a
            // lane in the transition range.
            _lane3 = pickArbitraryLane(TransitionLanes & ~wipLanes);

            if (_lane3 === NoLane) {
              // All the transition lanes are taken, too. This should be very
              // rare, but as a last resort, pick a default lane. This will have
              // the effect of interrupting the current work-in-progress render.
              _lane3 = pickArbitraryLane(DefaultLanes);
            }
          }

          return _lane3;
        }

      case TransitionPriority: // Should be handled by findTransitionLane instead

      case RetryLanePriority:
        // Should be handled by findRetryLane instead
        break;

      case IdleLanePriority:
        var lane = pickArbitraryLane(IdleLanes & ~wipLanes);

        if (lane === NoLane) {
          lane = pickArbitraryLane(IdleLanes);
        }

        return lane;
    }

    {
      {
        throw Error( "Invalid update priority: " + lanePriority + ". This is a bug in React." );
      }
    }
  } // To ensure consistency across multiple updates in the same event, this should
  // be pure function, so that it always returns the same lane for given inputs.

  function findTransitionLane(wipLanes, pendingLanes) {
    // First look for lanes that are completely unclaimed, i.e. have no
    // pending work.
    var lane = pickArbitraryLane(TransitionLanes & ~pendingLanes);

    if (lane === NoLane) {
      // If all lanes have pending work, look for a lane that isn't currently
      // being worked on.
      lane = pickArbitraryLane(TransitionLanes & ~wipLanes);

      if (lane === NoLane) {
        // If everything is being worked on, pick any lane. This has the
        // effect of interrupting the current work-in-progress.
        lane = pickArbitraryLane(TransitionLanes);
      }
    }

    return lane;
  } // To ensure consistency across multiple updates in the same event, this should
  // be pure function, so that it always returns the same lane for given inputs.

  function findRetryLane(wipLanes) {
    // This is a fork of `findUpdateLane` designed specifically for Suspense
    // "retries" — a special update that attempts to flip a Suspense boundary
    // from its placeholder state to its primary/resolved state.
    var lane = pickArbitraryLane(RetryLanes & ~wipLanes);

    if (lane === NoLane) {
      lane = pickArbitraryLane(RetryLanes);
    }

    return lane;
  }

  function getHighestPriorityLane(lanes) {
    return lanes & -lanes;
  }

  function getLowestPriorityLane(lanes) {
    // This finds the most significant non-zero bit.
    var index = 31 - clz32(lanes);
    return index < 0 ? NoLanes : 1 << index;
  }

  function getEqualOrHigherPriorityLanes(lanes) {
    return (getLowestPriorityLane(lanes) << 1) - 1;
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
    root.pendingLanes |= updateLane; // TODO: Theoretically, any update to any lane can unblock any other lane. But
    // it's not practical to try every single possible combination. We need a
    // heuristic to decide which lanes to attempt to render, and in which batches.
    // For now, we use the same heuristic as in the old ExpirationTimes model:
    // retry any lane at equal or lower priority, but don't try updates at higher
    // priority without also including the lower priority updates. This works well
    // when considering updates across different priority levels, but isn't
    // sufficient for updates within the same priority, since we want to treat
    // those updates as parallel.
    // Unsuspend any update at equal or lower priority.

    var higherPriorityLanes = updateLane - 1; // Turns 0b1000 into 0b0111

    root.suspendedLanes &= higherPriorityLanes;
    root.pingedLanes &= higherPriorityLanes;
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
  function markRootExpired(root, expiredLanes) {
    root.expiredLanes |= expiredLanes & root.pendingLanes;
  }
  function markDiscreteUpdatesExpired(root) {
    root.expiredLanes |= InputDiscreteLanes & root.pendingLanes;
  }
  function hasDiscreteLanes(lanes) {
    return (lanes & InputDiscreteLanes) !== NoLanes;
  }
  function markRootMutableRead(root, updateLane) {
    root.mutableReadLanes |= updateLane & root.pendingLanes;
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
    root.entangledLanes |= entangledLanes;
    var entanglements = root.entanglements;
    var lanes = entangledLanes;

    while (lanes > 0) {
      var index = pickArbitraryLaneIndex(lanes);
      var lane = 1 << index;
      entanglements[index] |= entangledLanes;
      lanes &= ~lane;
    }
  }
  function getBumpedLaneForHydration(root, renderLanes) {
    getHighestPriorityLanes(renderLanes);
    var highestLanePriority = return_highestLanePriority;
    var lane;

    switch (highestLanePriority) {
      case SyncLanePriority:
      case SyncBatchedLanePriority:
        lane = NoLane;
        break;

      case InputDiscreteHydrationLanePriority:
      case InputDiscreteLanePriority:
        lane = InputDiscreteHydrationLane;
        break;

      case InputContinuousHydrationLanePriority:
      case InputContinuousLanePriority:
        lane = InputContinuousHydrationLane;
        break;

      case DefaultHydrationLanePriority:
      case DefaultLanePriority:
        lane = DefaultHydrationLane;
        break;

      case TransitionHydrationPriority:
      case TransitionPriority:
        lane = TransitionHydrationLane;
        break;

      case RetryLanePriority:
        // Shouldn't be reachable under normal circumstances, so there's no
        // dedicated lane for retry priority. Use the one for long transitions.
        lane = TransitionHydrationLane;
        break;

      case SelectiveHydrationLanePriority:
        lane = SelectiveHydrationLane;
        break;

      case IdleHydrationLanePriority:
      case IdleLanePriority:
        lane = IdleHydrationLane;
        break;

      case OffscreenLanePriority:
      case NoLanePriority:
        lane = NoLane;
        break;

      default:
        {
          {
            throw Error( "Invalid lane: " + lane + ". This is a bug in React." );
          }
        }

    } // Check if the lane we chose is suspended. If so, that indicates that we
    // already attempted and failed to hydrate at that level. Also check if we're
    // already rendering that lane, which is rare but could happen.


    if ((lane & (root.suspendedLanes | renderLanes)) !== NoLane) {
      // Give up trying to hydrate and fall back to client render.
      return NoLane;
    }

    return lane;
  }
  var clz32 = Math.clz32 ? Math.clz32 : clz32Fallback; // Count leading zeros. Only used on lanes, so assume input is an integer.
  // Based on:
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/clz32

  var log = Math.log;
  var LN2 = Math.LN2;

  function clz32Fallback(lanes) {
    if (lanes === 0) {
      return 32;
    }

    return 31 - (log(lanes) / LN2 | 0) | 0;
  }