  var COMPONENT_TYPE = 0;
  var HAS_PSEUDO_CLASS_TYPE = 1;
  var ROLE_TYPE = 2;
  var TEST_NAME_TYPE = 3;
  var TEXT_TYPE = 4;

  if (typeof Symbol === 'function' && Symbol.for) {
    var symbolFor$1 = Symbol.for;
    COMPONENT_TYPE = symbolFor$1('selector.component');
    HAS_PSEUDO_CLASS_TYPE = symbolFor$1('selector.has_pseudo_class');
    ROLE_TYPE = symbolFor$1('selector.role');
    TEST_NAME_TYPE = symbolFor$1('selector.test_id');
    TEXT_TYPE = symbolFor$1('selector.text');
  }
  var commitHooks = [];
  function onCommitRoot$1() {
    {
      commitHooks.forEach(function (commitHook) {
        return commitHook();
      });
    }
  }