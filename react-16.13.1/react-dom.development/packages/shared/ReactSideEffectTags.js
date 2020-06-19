  // Don't change these two values. They're used by React Dev Tools.
  var NoEffect =
  /*              */
  0;
  var PerformedWork =
  /*         */
  1; // You can change the rest (and add more).

  var Placement =
  /*             */
  2;
  var Update =
  /*                */
  4;
  var PlacementAndUpdate =
  /*    */
  6;
  var Deletion =
  /*              */
  8;
  var ContentReset =
  /*          */
  16;
  var Callback =
  /*              */
  32;
  var DidCapture =
  /*            */
  64;
  var Ref =
  /*                   */
  128;
  var Snapshot =
  /*              */
  256;
  var Passive =
  /*               */
  512;
  var Hydrating =
  /*             */
  1024;
  var HydratingAndUpdate =
  /*    */
  1028; // Passive & Update & Callback & Ref & Snapshot

  var LifecycleEffectMask =
  /*   */
  932; // Union of all host effects

  var HostEffectMask =
  /*        */
  2047;
  var Incomplete =
  /*            */
  2048;
  var ShouldCapture =
  /*         */
  4096;