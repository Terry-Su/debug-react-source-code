  // Don't change these two values. They're used by React Dev Tools.
  var NoFlags =
  /*                      */
  0;
  var PerformedWork =
  /*                */
  1; // You can change the rest (and add more).

  var Placement =
  /*                    */
  2;
  var Update =
  /*                       */
  4;
  var PlacementAndUpdate =
  /*           */
  6;
  var Deletion =
  /*                     */
  8;
  var ContentReset =
  /*                 */
  16;
  var Callback =
  /*                     */
  32;
  var DidCapture =
  /*                   */
  64;
  var Ref =
  /*                          */
  128;
  var Snapshot =
  /*                     */
  256;
  var Passive =
  /*                      */
  512; // TODO (effects) Remove this bit once the new reconciler is synced to the old.

  var PassiveUnmountPendingDev =
  /*     */
  8192;
  var Hydrating =
  /*                    */
  1024;
  var HydratingAndUpdate =
  /*           */
  1028; // Passive & Update & Callback & Ref & Snapshot

  var LifecycleEffectMask =
  /*          */
  932; // Union of all host effects

  var HostEffectMask =
  /*               */
  2047; // These are not really side effects, but we still reuse this field.

  var Incomplete =
  /*                   */
  2048;
  var ShouldCapture =
  /*                */
  4096;
  var ForceUpdateForLegacySuspense =
  /* */
  16384; // Static tags describe aspects of a fiber that are not specific to a render,