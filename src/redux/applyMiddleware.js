import compose from './compose' // 这货的作用其实就是 compose(f, g, h)(action) => f(g(h(action)))

/** 作用是将所有中间件组成一个数组，依次执行
 * @param {...Function} middlewares.
 * @returns {Function} store 增强器.
 */
export default function applyMiddleware(...middlewares) {
  // 增强器，创建一个重载了 dispatch() 的 store
  /* 返回一个函数签名跟 createStore 一模一样的函数，即返回的是一个增强版的 createStore */
  return (createStore) => (reducer, preloadedState, enhancer) => {
    // 用原 createStore 先生成一个 store，其包含 getState / dispatch / subscribe / replaceReducer 四个 API
    var store = createStore(reducer, preloadedState, enhancer)
    var dispatch = store.dispatch
    // 中间件链
    var chain = []

    // 提供给中间件的 API（其实都是 store 的 API）
    var middlewareAPI = {
      getState: store.getState,
      dispatch: (action) => dispatch(action)
    }

    // 传入middlewareAPI参数并执行每一个外部函数，返回结果汇聚成数组
    chain = middlewares.map(middleware => middleware(middlewareAPI))


    /**
     * 用了 middleware 后 dispatch() 的真实样貌：
     * 经过 compose() 组合的中间件合体函数
     * 调用的时候真实的流程：
     * M1(M2(M3(dispatch)))(action)
     * M3 的参数是原生的 dispatch
     * M2 的参数是包含 M3 逻辑 + 原生 dispatch 的函数
     * M1 的参数是包含 M2逻辑 + M3 逻辑 + 原生 dispatch 的函数
     */
    dispatch = compose(...chain)(store.dispatch)

    return {
      ...store, // store 的 API 中保留 getState / subsribe / replaceReducer
      dispatch // 新 dispatch 覆盖原 dispatch，往后调用 dispatch 就会触发 chain 内的中间件链式串联执行
    }
  }
}
