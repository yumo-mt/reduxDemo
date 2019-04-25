import isPlainObject from 'lodash/isPlainObject'
import $$observable from 'symbol-observable'

/**
 * 在没有任何操作的时候，返回当前值
 * 如果当前state 是 undefined ，返回初始的state
 * 如果你的代码里面定义了一个type 恰到是 @@redux/INIT,那你的代码就要gg了
 */
export var ActionTypes = {
  INIT: '@@redux/INIT'
}

/**
 * 创建一个 store，持有整个 state tree。
 * 唯一改变 state 的方法就是 dispatch(action)
 *
 * 在App中应该只存在一个store，可以根据不同的state拆分为多个reducer 
 * 然后用combineReducers组合起来就ok
 *
 * @param {Function} reducer combineReducers.js 返回的 combination方法
 * @param {any} [preloadedState] 初始state
 * @param {Function} enhancer applyMiddleware() 返回的函数，重载 store 的 dispatch() 方法。
 * @returns {Store} 返回一个store
 */
export default function createStore(reducer, preloadedState, enhancer) {
  // 如果第二个参数为方法且第三个参数为空，则将两个参数交换
  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState
    preloadedState = undefined
  }

  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }

    return enhancer(createStore)(reducer, preloadedState)
  }
  // reducer 必须是个函数
  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }

  var currentReducer = reducer // 当前的reducer函数
  var currentState = preloadedState // 当前的state 树
  var currentListeners = [] // 监听函数列表
  var nextListeners = currentListeners // 监听列表的一个引用,有一些用处
  var isDispatching = false // 是否正在dispatch

  /**
   * 试想，dispatch 后，回调函数正在乖乖地被逐个执行（for 循环进行时）
   * 假设回调函数队列原本是这样的 [a, b, c, d]
   *
   * 现在 for 循环执行到第 3 步，亦即 a、b 已经被执行，准备执行 c
   * 但在这电光火石的瞬间，a 被取消订阅！！！
   *
   * 那么此时回调函数队列就变成了 [b, c, d]
   * 那么第 3 步就对应换成了 d！！！
   * c 被跳过了！！！这就是躺枪。。。
   * 
   * 作为一个回调函数，最大的耻辱就是得不到执行
   * 因此为了避免这个问题，本函数会在上述场景中把
   * currentListeners 复制给 nextListeners
   *
   * 这样的话，dispatch 后，在逐个执行回调函数的过程中
   * 如果有新增订阅或取消订阅，都在 nextListeners 中操作
   * 让 currentListeners 中的回调函数得以完整地执行
   *
   * 既然新增是在 nextListeners 中 push，因此毫无疑问
   * 新的回调函数不会在本次 currentListeners 的循环体中被触发
   *
   * （上述事件发生的几率虽然很低，但还是严谨点比较好）
   */
  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice()
    }
  }

  /**
    * 返回当前的 state
    */
  function getState() {
    return currentState
  }

  /**
   * 
   * 
   * 
   * 
   * 这个函数用于给store添加监听函数，把需要添加的监听函数作为参数传入即可
   * nextListeners 即为目前的监听函数列表，添加了之后，subscribe方法会返回一个unsubscribe()方法
   * 此方法用于注销刚才添加的监听函数。
   * @param { Function } 回调函数
   * @returns { Function } 解除绑定的方法
   */

  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected listener to be a function.')
    }

    var isSubscribed = true

    ensureCanMutateNextListeners()  // 调用一下保证平安无事

    nextListeners.push(listener)  // 新增订阅在 nextListeners 中操作

    // 返回取消订阅方法 
    return function unsubscribe() {
      if (!isSubscribed) {
        return
      }

      isSubscribed = false

      ensureCanMutateNextListeners()   // 调用一下保证平安无事
      var index = nextListeners.indexOf(listener)
      nextListeners.splice(index, 1) // 取消订阅还是在 nextListeners 中操作
    }
  }

  /**
   * dispatch 一个action是改变state的不二法门
   *
   * 调用reducer(state,action) 返回下一个state 并且会触发 listeners
   *
   * 如果 dispatch 的不是一个对象类型的 action（同步的），而是 Promise / thunk（异步的）
   * 则需引入 redux-thunk 等中间件
   *
   * @param {Object} action
   *
   * @returns {Object} 返回action ，如果使用了中间件，可能中间件会返回其他东西
   *
   */
  function dispatch(action) {
    // dispatch 是同步的 action 必须是一个对象
    if (!isPlainObject(action)) {
      throw new Error(
        'Actions must be plain objects. ' +
        'Use custom middleware for async actions.'
      )
    }

    // 必须有type
    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
        'Have you misspelled a constant?'
      )
    }
    //如果正处于isDispatching状态，报错
    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    // 关键流程
    try {
      isDispatching = true
      // 这里就是调用我们reducer方法的地方，返回一个新的state作为currentState
      currentState = currentReducer(currentState, action)
    } finally {
      isDispatching = false
    }

    // //调用所有的监听函数
    var listeners = currentListeners = nextListeners
    for (var i = 0; i < listeners.length; i++) {
      listeners[i]()
    }

    return action // 为了方便链式调用，dispatch 执行完毕后
  }



  /**
   * 动态替换 reducer
   * 替换reducer之后重新初始化状态树
   * @param {Function} nextReducer The reducer for the store to use instead.
   * @returns {void}
   */

  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.')
    }

    currentReducer = nextReducer
    dispatch({ type: ActionTypes.INIT })
  }

  /**
     * 这是留给 可观察/响应式库 的接口（详情 https://github.com/zenparsing/es-observable）
     * 如果您了解 RxJS 等响应式编程库，那可能会用到这个接口，否则请略过
     * @return {observable}
     */
  function observable() {
    var outerSubscribe = subscribe
    return {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe(observer) {
        if (typeof observer !== 'object') {
          throw new TypeError('Expected the observer to be an object.')
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState())
          }
        }

        observeState()
        var unsubscribe = outerSubscribe(observeState)
        return { unsubscribe }
      },

      [$$observable]() {
        return this
      }
    }
  }

  // 生成初始值
  dispatch({ type: ActionTypes.INIT })

  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  }
}
