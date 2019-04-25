# reduxDemo
redux源码分析

- yarn
- yarn start

## Store
一个保存数据的地方，整个项目只有一个

创建store

Redux提供 creatStore 函数来生成 Store
```
// 引入redux
import { createStore } from 'redux';  

//创建Store 需要传递一个函数fn 这里的fn是之后会提及的reducers 的 combination
const store = createStore(fn);

```


## State
状态，某时刻的数据即是Store的状态

获取状态的方法是store.getState()

## action
行为，一个普通对象，它有一个不可或缺的type属性

action还可以携带其他内容

我们可以使用action来改变State的值，

从而将我们需要的数据通过Action“运输”到 Store；

## dispatch
发送action

dispatch(action)接受一个action对象为参数，并将它发送出去，

Store接受Action，接受之后需要**计算**返回一个新的State（状态）


## reducer

而计算这个新的状态的过程就是reducer，纯函数


## Redux 有五个API
- createStore(reducer, [initialState],enhancer) 用来创建store
- combineReducers(reducers)     用来合并reducer
- applyMiddleware(...middlewares)  操作中间件
- bindActionCreators(actionCreaters, dispatch)  给actionCreater绑定dispatch
- compose(...functions)   将多个函数组合起来

## createStore 生成的 store 有四个 API
- getState()
- dispatch(action)
- subscribe(listener)
- replaceReducer(nextReducer)

## 项目中使用的流程
@#%￥……￥%%……&￥%￥%

# 源码分析


文件结构：

```
├── utils/
│     ├── warning.js # 打酱油的，负责在控制台显示警告信息
├── applyMiddleware.js   
├── bindActionCreators.js
├── combineReducers.js
├── compose.js 
├── createStore.js
├── index.js # 入口文件
```

### compose.js
```
/**
 * 工具方法 在 applyMiddleware 中使用
 * 将多个函数合并成一个函数，嵌套执行
 * compose(f, g, h): f(g(h())) 函数的执行顺序从右到左，h() g() f()，
 * 上一个函数的返回值作为下个函数的参数。
 *
 */

export default function compose(...funcs) {
  if (funcs.length === 0) {
    return arg => arg
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  /**
   * 核心语句就是这一句reduce，队列中的下一个函数b，已组合的函数a，把b作为参数扔给a，
   * 如此反复直至循环完毕。
   */
  const last = funcs[funcs.length - 1]
  const rest = funcs.slice(0, -1)
  return (...args) => rest.reduceRight((composed, f) => f(composed), last(...args))
}


```
其实就是这么一波操作
```
let fun = compose(a,b,c);

fun -> a(b(c()))

```

### combineReducers.js

```

/**
 * 
 * 将许多 reducers 合并成一个 Function，
 * 循环所有 reducers，每个 action 就像坐滑梯一样从对应的 reducer 里过一遍
 * 初始化 会 过一个 {type:'@@redux/INIT'} 的action 
 */
 
export default function combineReducers(reducers) {
  // 略去一波校验
  var reducerKeys = Object.keys(reducers)
  var finalReducers = {}
  for (var i = 0; i < reducerKeys.length; i++) {
    var key = reducerKeys[i]

    if (process.env.NODE_ENV !== 'production') {
      if (typeof reducers[key] === 'undefined') {
        warning(`No reducer provided for key "${key}"`)
      }
    }
    // finalReducers是过滤后的reducers，它的每一个属性都是一个function
    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key]
    }
  }
  // 复制一份reducers
  var finalReducerKeys = Object.keys(finalReducers)

  if (process.env.NODE_ENV !== 'production') {
    var unexpectedKeyCache = {}
  }

  var sanityError
  try {
    // 来一波检测
    assertReducerSanity(finalReducers)
  } catch (e) {
    sanityError = e
  }

  return function combination(state = {}, action) {
    debugger

    if (sanityError) {
      throw sanityError
    }

    if (process.env.NODE_ENV !== 'production') {
      var warningMessage = getUnexpectedStateShapeWarningMessage(state, finalReducers, action, unexpectedKeyCache)
      if (warningMessage) {
        warning(warningMessage)
      }
    }

    var hasChanged = false
    var nextState = {}
    // 遍历所有reducers，然后将每个reducer返回的state组合起来生成一个大的状态树，
    // 所以任何action，redux都会遍历所有的reducer,从性能上来讲，reducer是纯函数，执行性能会很高
    for (var i = 0; i < finalReducerKeys.length; i++) {
      var key = finalReducerKeys[i]
      var reducer = finalReducers[key]
      var previousStateForKey = state[key]
      var nextStateForKey = reducer(previousStateForKey, action)

      // 如果此reducer返回的新的state是undefined，抛出异常
      if (typeof nextStateForKey === 'undefined') {
        var errorMessage = getUndefinedStateErrorMessage(key, action)
        throw new Error(errorMessage)
      }
      nextState[key] = nextStateForKey
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey
    }
    // 如果当前action对应的reducer方法执行完后，该处数据没有变化，则返回原来的流程树
    return hasChanged ? nextState : state
  }
}

```

## applyMiddleware.js

```
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

```

## createStore.js

```
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
  debugger;
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

```

## bindActionCreators.js
```
/* 为 Action Creator 加装上自动 dispatch 技能 */

function bindActionCreator(actionCreator, dispatch) {
  return (...args) => dispatch(actionCreator(...args))
}

/*
 * 将action与dispatch函数绑定，生成直接可以触发action的函数，
 * 可以将第一个参数对象中所有的action都直接生成可以直接触发dispatch的函数
 * 而不需要一个一个的dispatch，生成后的方法对应原来action生成器的函数名
 * */
export default function bindActionCreators(actionCreators, dispatch) {
  if (typeof actionCreators === 'function') {
    return bindActionCreator(actionCreators, dispatch)
  }

  if (typeof actionCreators !== 'object' || actionCreators === null) {
    throw new Error(
      `bindActionCreators expected an object or a function, instead received ${actionCreators === null ? 'null' : typeof actionCreators}. ` +
      `Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?`
    )
  }
  var keys = Object.keys(actionCreators)
  var boundActionCreators = {}
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i]
    var actionCreator = actionCreators[key]
    if (typeof actionCreator === 'function') {
      // 逐个装上自动 dispatch 技能
      boundActionCreators[key] = bindActionCreator(actionCreator, dispatch)
    }
  }
  return boundActionCreators
}

```