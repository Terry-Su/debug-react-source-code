  function block(query, render) {
    {
      if (typeof query !== 'function') {
        error('Blocks require a query function but was given %s.', query === null ? 'null' : typeof query);
      }

      if (render != null && render.$$typeof === REACT_MEMO_TYPE) {
        error('Blocks require a render function but received a `memo` ' + 'component. Use `memo` on an inner component instead.');
      } else if (render != null && render.$$typeof === REACT_FORWARD_REF_TYPE) {
        error('Blocks require a render function but received a `forwardRef` ' + 'component. Use `forwardRef` on an inner component instead.');
      } else if (typeof render !== 'function') {
        error('Blocks require a render function but was given %s.', render === null ? 'null' : typeof render);
      } else if (render.length !== 0 && render.length !== 2) {
        // Warn if it's not accepting two args.
        // Do not warn for 0 arguments because it could be due to usage of the 'arguments' object
        error('Block render functions accept exactly two parameters: props and data. %s', render.length === 1 ? 'Did you forget to use the data parameter?' : 'Any additional parameter will be undefined.');
      }

      if (render != null && (render.defaultProps != null || render.propTypes != null)) {
        error('Block render functions do not support propTypes or defaultProps. ' + 'Did you accidentally pass a React component?');
      }
    }

    return function () {
      var args = arguments;
      return {
        $$typeof: REACT_BLOCK_TYPE,
        query: function () {
          return query.apply(null, args);
        },
        render: render
      };
    };
  }