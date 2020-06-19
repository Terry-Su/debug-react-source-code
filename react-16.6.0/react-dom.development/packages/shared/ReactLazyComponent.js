

var Pending = 0;
var Resolved = 1;
var Rejected = 2;

function refineResolvedLazyComponent(lazyComponent) {
  return lazyComponent._status === Resolved ? lazyComponent._result : null;
}