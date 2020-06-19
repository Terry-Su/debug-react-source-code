

// Don't change these two values. They're used by React Dev Tools.
var NoEffect = /*              */0;
var PerformedWork = /*         */1;

// You can change the rest (and add more).
var Placement = /*             */2;
var Update = /*                */4;
var PlacementAndUpdate = /*    */6;
var Deletion = /*              */8;
var ContentReset = /*          */16;
var Callback = /*              */32;
var DidCapture = /*            */64;
var Ref = /*                   */128;
var Snapshot = /*              */256;

// Update & Callback & Ref & Snapshot
var LifecycleEffectMask = /*   */420;

// Union of all host effects
var HostEffectMask = /*        */511;

var Incomplete = /*            */512;
var ShouldCapture = /*         */1024;