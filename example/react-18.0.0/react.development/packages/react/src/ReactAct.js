  var actScopeDepth = 0;
  var didWarnNoAwaitAct = false;
  function act(callback) {
    {
      // `act` calls can be nested, so we track the depth. This represents the
      // number of `act` scopes on the stack.
      var prevActScopeDepth = actScopeDepth;
      actScopeDepth++;

      if (ReactCurrentActQueue.current === null) {
        // This is the outermost `act` scope. Initialize the queue. The reconciler
        // will detect the queue and use it instead of Scheduler.
        ReactCurrentActQueue.current = [];
      }

      var prevIsBatchingLegacy = ReactCurrentActQueue.isBatchingLegacy;
      var result;

      try {
        // Used to reproduce behavior of `batchedUpdates` in legacy mode. Only
        // set to `true` while the given callback is executed, not for updates
        // triggered during an async event, because this is how the legacy
        // implementation of `act` behaved.
        ReactCurrentActQueue.isBatchingLegacy = true;
        result = callback(); // Replicate behavior of original `act` implementation in legacy mode,
        // which flushed updates immediately after the scope function exits, even
        // if it's an async function.

        if (!prevIsBatchingLegacy && ReactCurrentActQueue.didScheduleLegacyUpdate) {
          var queue = ReactCurrentActQueue.current;

          if (queue !== null) {
            ReactCurrentActQueue.didScheduleLegacyUpdate = false;
            flushActQueue(queue);
          }
        }
      } catch (error) {
        popActScope(prevActScopeDepth);
        throw error;
      } finally {
        ReactCurrentActQueue.isBatchingLegacy = prevIsBatchingLegacy;
      }

      if (result !== null && typeof result === 'object' && typeof result.then === 'function') {
        var thenableResult = result; // The callback is an async function (i.e. returned a promise). Wait
        // for it to resolve before exiting the current scope.

        var wasAwaited = false;
        var thenable = {
          then: function (resolve, reject) {
            wasAwaited = true;
            thenableResult.then(function (returnValue) {
              popActScope(prevActScopeDepth);

              if (actScopeDepth === 0) {
                // We've exited the outermost act scope. Recursively flush the
                // queue until there's no remaining work.
                recursivelyFlushAsyncActWork(returnValue, resolve, reject);
              } else {
                resolve(returnValue);
              }
            }, function (error) {
              // The callback threw an error.
              popActScope(prevActScopeDepth);
              reject(error);
            });
          }
        };

        {
          if (!didWarnNoAwaitAct && typeof Promise !== 'undefined') {
            // eslint-disable-next-line no-undef
            Promise.resolve().then(function () {}).then(function () {
              if (!wasAwaited) {
                didWarnNoAwaitAct = true;

                error('You called act(async () => ...) without await. ' + 'This could lead to unexpected testing behaviour, ' + 'interleaving multiple act calls and mixing their ' + 'scopes. ' + 'You should - await act(async () => ...);');
              }
            });
          }
        }

        return thenable;
      } else {
        var returnValue = result; // The callback is not an async function. Exit the current scope
        // immediately, without awaiting.

        popActScope(prevActScopeDepth);

        if (actScopeDepth === 0) {
          // Exiting the outermost act scope. Flush the queue.
          var _queue = ReactCurrentActQueue.current;

          if (_queue !== null) {
            flushActQueue(_queue);
            ReactCurrentActQueue.current = null;
          } // Return a thenable. If the user awaits it, we'll flush again in
          // case additional work was scheduled by a microtask.


          var _thenable = {
            then: function (resolve, reject) {
              // Confirm we haven't re-entered another `act` scope, in case
              // the user does something weird like await the thenable
              // multiple times.
              if (ReactCurrentActQueue.current === null) {
                // Recursively flush the queue until there's no remaining work.
                ReactCurrentActQueue.current = [];
                recursivelyFlushAsyncActWork(returnValue, resolve, reject);
              } else {
                resolve(returnValue);
              }
            }
          };
          return _thenable;
        } else {
          // Since we're inside a nested `act` scope, the returned thenable
          // immediately resolves. The outer scope will flush the queue.
          var _thenable2 = {
            then: function (resolve, reject) {
              resolve(returnValue);
            }
          };
          return _thenable2;
        }
      }
    }
  }

  function popActScope(prevActScopeDepth) {
    {
      if (prevActScopeDepth !== actScopeDepth - 1) {
        error('You seem to have overlapping act() calls, this is not supported. ' + 'Be sure to await previous act() calls before making a new one. ');
      }

      actScopeDepth = prevActScopeDepth;
    }
  }

  function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
    {
      var queue = ReactCurrentActQueue.current;

      if (queue !== null) {
        try {
          flushActQueue(queue);
          enqueueTask(function () {
            if (queue.length === 0) {
              // No additional work was scheduled. Finish.
              ReactCurrentActQueue.current = null;
              resolve(returnValue);
            } else {
              // Keep flushing work until there's none left.
              recursivelyFlushAsyncActWork(returnValue, resolve, reject);
            }
          });
        } catch (error) {
          reject(error);
        }
      } else {
        resolve(returnValue);
      }
    }
  }

  var isFlushing = false;

  function flushActQueue(queue) {
    {
      if (!isFlushing) {
        // Prevent re-entrance.
        isFlushing = true;
        var i = 0;

        try {
          for (; i < queue.length; i++) {
            var callback = queue[i];

            do {
              callback = callback(true);
            } while (callback !== null);
          }

          queue.length = 0;
        } catch (error) {
          // If something throws, leave the remaining callbacks on the queue.
          queue = queue.slice(i + 1);
          throw error;
        } finally {
          isFlushing = false;
        }
      }
    }
  }