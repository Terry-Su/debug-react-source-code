  /**
   * If performance exists and supports the subset of the User Timing API that we
   * require.
   */

  var supportsUserTiming = typeof performance !== 'undefined' && typeof performance.mark === 'function';

  function formatLanes(laneOrLanes) {
    return laneOrLanes.toString();
  } // Create a mark on React initialization


  {
    if (supportsUserTiming) {
      performance.mark("--react-init-" + ReactVersion);
    }
  }

  function markCommitStarted(lanes) {
    {
      if (supportsUserTiming) {
        performance.mark("--commit-start-" + formatLanes(lanes));
      }
    }
  }
  function markCommitStopped() {
    {
      if (supportsUserTiming) {
        performance.mark('--commit-stop');
      }
    }
  }
  var PossiblyWeakMap$1 = typeof WeakMap === 'function' ? WeakMap : Map; // $FlowFixMe: Flow cannot handle polymorphic WeakMaps

  var wakeableIDs = new PossiblyWeakMap$1();
  var wakeableID = 0;

  function getWakeableID(wakeable) {
    if (!wakeableIDs.has(wakeable)) {
      wakeableIDs.set(wakeable, wakeableID++);
    }

    return wakeableIDs.get(wakeable);
  }

  function markComponentSuspended(fiber, wakeable) {
    {
      if (supportsUserTiming) {
        var id = getWakeableID(wakeable);
        var componentName = getComponentName(fiber.type) || 'Unknown'; // TODO Add component stack id

        performance.mark("--suspense-suspend-" + id + "-" + componentName);
        wakeable.then(function () {
          return performance.mark("--suspense-resolved-" + id + "-" + componentName);
        }, function () {
          return performance.mark("--suspense-rejected-" + id + "-" + componentName);
        });
      }
    }
  }
  function markLayoutEffectsStarted(lanes) {
    {
      if (supportsUserTiming) {
        performance.mark("--layout-effects-start-" + formatLanes(lanes));
      }
    }
  }
  function markLayoutEffectsStopped() {
    {
      if (supportsUserTiming) {
        performance.mark('--layout-effects-stop');
      }
    }
  }
  function markPassiveEffectsStarted(lanes) {
    {
      if (supportsUserTiming) {
        performance.mark("--passive-effects-start-" + formatLanes(lanes));
      }
    }
  }
  function markPassiveEffectsStopped() {
    {
      if (supportsUserTiming) {
        performance.mark('--passive-effects-stop');
      }
    }
  }
  function markRenderStarted(lanes) {
    {
      if (supportsUserTiming) {
        performance.mark("--render-start-" + formatLanes(lanes));
      }
    }
  }
  function markRenderYielded() {
    {
      if (supportsUserTiming) {
        performance.mark('--render-yield');
      }
    }
  }
  function markRenderStopped() {
    {
      if (supportsUserTiming) {
        performance.mark('--render-stop');
      }
    }
  }
  function markRenderScheduled(lane) {
    {
      if (supportsUserTiming) {
        performance.mark("--schedule-render-" + formatLanes(lane));
      }
    }
  }
  function markForceUpdateScheduled(fiber, lane) {
    {
      if (supportsUserTiming) {
        var componentName = getComponentName(fiber.type) || 'Unknown'; // TODO Add component stack id

        performance.mark("--schedule-forced-update-" + formatLanes(lane) + "-" + componentName);
      }
    }
  }
  function markStateUpdateScheduled(fiber, lane) {
    {
      if (supportsUserTiming) {
        var componentName = getComponentName(fiber.type) || 'Unknown'; // TODO Add component stack id

        performance.mark("--schedule-state-update-" + formatLanes(lane) + "-" + componentName);
      }
    }
  }