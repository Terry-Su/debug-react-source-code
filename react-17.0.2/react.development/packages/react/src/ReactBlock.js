
  function lazyInitializer$1(payload) {
    return {
      $$typeof: REACT_BLOCK_TYPE,
      _data: payload.load.apply(null, payload.args),
      _render: payload.render
    };
  }

  function block(render, load) {
    {
      if (load !== undefined && typeof load !== 'function') {
        error('Blocks require a load function, if provided, but was given %s.', load === null ? 'null' : typeof load);
      }

      if (render != null && render.$$typeof === REACT_MEMO_TYPE) {
        error('Blocks require a render function but received a `memo` ' + 'component. Use `memo` on an inner component instead.');
      } else if (render != null && render.$$typeof === REACT_FORWARD_REF_TYPE) {
        error('Blocks require a render function but received a `forwardRef` ' + 'component. Use `forwardRef` on an inner component instead.');
      } else if (typeof render !== 'function') {
        error('Blocks require a render function but was given %s.', render === null ? 'null' : typeof render);
      } else if (render.length !== 0 && render.length !== 2) {
        // Warn if it's not accepting two args.
        // Do not warn for 0 arguments because it could be due to usage of the 'arguments' object.
        error('Block render functions accept exactly two parameters: props and data. %s', render.length === 1 ? 'Did you forget to use the data parameter?' : 'Any additional parameter will be undefined.');
      }

      if (render != null && (render.defaultProps != null || render.propTypes != null)) {
        error('Block render functions do not support propTypes or defaultProps. ' + 'Did you accidentally pass a React component?');
      }
    }

    if (load === undefined) {
      return function () {
        var blockComponent = {
          $$typeof: REACT_BLOCK_TYPE,
          _data: undefined,
          // $FlowFixMe: Data must be void in this scenario.
          _render: render
        }; // $FlowFixMe: Upstream BlockComponent to Flow as a valid Node.

        return blockComponent;
      };
    } // Trick to let Flow refine this.


    var loadFn = load;
    return function () {
      var args = arguments;
      var payload = {
        load: loadFn,
        args: args,
        render: render
      };
      var lazyType = {
        $$typeof: REACT_LAZY_TYPE,
        _payload: payload,
        _init: lazyInitializer$1
      }; // $FlowFixMe: Upstream BlockComponent to Flow as a valid Node.

      return lazyType;
    };
  }