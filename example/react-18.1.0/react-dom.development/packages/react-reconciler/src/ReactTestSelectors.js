  var COMPONENT_TYPE = 0;
  var HAS_PSEUDO_CLASS_TYPE = 1;
  var ROLE_TYPE = 2;
  var TEST_NAME_TYPE = 3;
  var TEXT_TYPE = 4;

  if (typeof Symbol === 'function' && Symbol.for) {
    var symbolFor = Symbol.for;
    COMPONENT_TYPE = symbolFor('selector.component');
    HAS_PSEUDO_CLASS_TYPE = symbolFor('selector.has_pseudo_class');
    ROLE_TYPE = symbolFor('selector.role');
    TEST_NAME_TYPE = symbolFor('selector.test_id');
    TEXT_TYPE = symbolFor('selector.text');
  }
  var commitHooks = [];
  function onCommitRoot$1() {
    {
      commitHooks.forEach(function (commitHook) {
        return commitHook();
      });
    }
  }