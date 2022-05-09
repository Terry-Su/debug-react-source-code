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
  var ChildDeletion =
  /*                */
  16;
  var ContentReset =
  /*                 */
  32;
  var Callback =
  /*                     */
  64;
  var DidCapture =
  /*                   */
  128;
  var ForceClientRender =
  /*            */
  256;
  var Ref =
  /*                          */
  512;
  var Snapshot =
  /*                     */
  1024;
  var Passive =
  /*                      */
  2048;
  var Hydrating =
  /*                    */
  4096;
  var Visibility =
  /*                   */
  8192;
  var StoreConsistency =
  /*             */
  16384;
  var LifecycleEffectMask = Passive | Update | Callback | Ref | Snapshot | StoreConsistency; // Union of all commit flags (flags with the lifetime of a particular commit)

  var HostEffectMask =
  /*               */
  32767; // These are not really side effects, but we still reuse this field.

  var Incomplete =
  /*                   */
  32768;
  var ShouldCapture =
  /*                */
  65536;
  var ForceUpdateForLegacySuspense =
  /* */
  131072;
  var Forked =
  /*                       */
  1048576; // Static tags describe aspects of a fiber that are not specific to a render,
  // e.g. a fiber uses a passive effect (even if there are no updates on this particular render).
  // This enables us to defer more work in the unmount case,
  // since we can defer traversing the tree during layout to look for Passive effects,
  // and instead rely on the static flag as a signal that there may be cleanup work.

  var RefStatic =
  /*                    */
  2097152;
  var LayoutStatic =
  /*                 */
  4194304;
  var PassiveStatic =
  /*                */
  8388608; // These flags allow us to traverse to fibers that have effects on mount
  // without traversing the entire tree after every commit for
  // double invoking

  var MountLayoutDev =
  /*               */
  16777216;
  var MountPassiveDev =
  /*              */
  33554432; // Groups of flags that are used in the commit phase to skip over trees that
  // don't contain effects, by checking subtreeFlags.

  var BeforeMutationMask = // TODO: Remove Update flag from before mutation phase by re-landing Visibility
  // flag logic (see #20043)
  Update | Snapshot | ( 0);
  var MutationMask = Placement | Update | ChildDeletion | ContentReset | Ref | Hydrating | Visibility;
  var LayoutMask = Update | Callback | Ref | Visibility; // TODO: Split into PassiveMountMask and PassiveUnmountMask

  var PassiveMask = Passive | ChildDeletion; // Union of tags that don't get reset on clones.
  // This allows certain concepts to persist without recalculating them,
  // e.g. whether a subtree contains passive effects or portals.

  var StaticMask = LayoutStatic | PassiveStatic | RefStatic;