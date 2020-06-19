  function forwardRef(render) {
    {
      if (render != null && render.$$typeof === REACT_MEMO_TYPE) {
        error('forwardRef requires a render function but received a `memo` ' + 'component. Instead of forwardRef(memo(...)), use ' + 'memo(forwardRef(...)).');
      } else if (typeof render !== 'function') {
        error('forwardRef requires a render function but was given %s.', render === null ? 'null' : typeof render);
      } else {
        if (render.length !== 0 && render.length !== 2) {
          error('forwardRef render functions accept exactly two parameters: props and ref. %s', render.length === 1 ? 'Did you forget to use the ref parameter?' : 'Any additional parameter will be undefined.');
        }
      }

      if (render != null) {
        if (render.defaultProps != null || render.propTypes != null) {
          error('forwardRef render functions do not support propTypes or defaultProps. ' + 'Did you accidentally pass a React component?');
        }
      }
    }

    return {
      $$typeof: REACT_FORWARD_REF_TYPE,
      render: render
    };
  }