import { ActionTypes } from './createStore'
import isPlainObject from 'lodash/isPlainObject'
import warning from './utils/warning'
// 根据key和action生成错误信息
function getUndefinedStateErrorMessage(key, action) {
  var actionType = action && action.type
  var actionName = actionType && `"${actionType.toString()}"` || 'an action'

  return (
    `Given action ${actionName}, reducer "${key}" returned undefined. ` +
    `To ignore an action, you must explicitly return the previous state.`
  )
}

// 一些警告级别的错误
function getUnexpectedStateShapeWarningMessage(inputState, reducers, action, unexpectedKeyCache) {
  var reducerKeys = Object.keys(reducers)
  var argumentName = action && action.type === ActionTypes.INIT ?
    'preloadedState argument passed to createStore' :
    'previous state received by the reducer'

  if (reducerKeys.length === 0) {
    return (
      'Store does not have a valid reducer. Make sure the argument passed ' +
      'to combineReducers is an object whose values are reducers.'
    )
  }

  if (!isPlainObject(inputState)) {
    return (
      `The ${argumentName} has unexpected type of "` +
      ({}).toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] +
      `". Expected argument to be an object with the following ` +
      `keys: "${reducerKeys.join('", "')}"`
    )
  }

  var unexpectedKeys = Object.keys(inputState).filter(key =>
    !reducers.hasOwnProperty(key) &&
    !unexpectedKeyCache[key]
  )

  unexpectedKeys.forEach(key => {
    unexpectedKeyCache[key] = true
  })

  if (unexpectedKeys.length > 0) {
    return (
      `Unexpected ${unexpectedKeys.length > 1 ? 'keys' : 'key'} ` +
      `"${unexpectedKeys.join('", "')}" found in ${argumentName}. ` +
      `Expected to find one of the known reducer keys instead: ` +
      `"${reducerKeys.join('", "')}". Unexpected keys will be ignored.`
    )
  }
}

// 这个方法用于检测用于组合的reducer是否是符合redux规定的reducer,手段就是用初始的action去里面跑一圈
function assertReducerSanity(reducers) {
  Object.keys(reducers).forEach(key => {
    var reducer = reducers[key]
    var initialState = reducer(undefined, { type: ActionTypes.INIT })

    // 若返回的初始state为undefined，则这是一个不符合规定的reducer方法，抛出异常
    if (typeof initialState === 'undefined') {
      throw new Error(
        `Reducer "${key}" returned undefined during initialization. ` +
        `If the state passed to the reducer is undefined, you must ` +
        `explicitly return the initial state. The initial state may ` +
        `not be undefined.`
      )
    }

    var type = '@@redux/PROBE_UNKNOWN_ACTION_' + Math.random().toString(36).substring(7).split('').join('.')
    if (typeof reducer(undefined, { type }) === 'undefined') {
      throw new Error(
        `Reducer "${key}" returned undefined when probed with a random type. ` +
        `Don't try to handle ${ActionTypes.INIT} or other actions in "redux/*" ` +
        `namespace. They are considered private. Instead, you must return the ` +
        `current state for any unknown actions, unless it is undefined, ` +
        `in which case you must return the initial state, regardless of the ` +
        `action type. The initial state may not be undefined.`
      )
    }
  })
}

/**
 * 
 * 将许多 reducers 合并成一个 Function，
 * 循环所有 reducers，每个 action 就像坐滑梯一样从对应的 reducer 里过一遍
 * 初始化 会 过一个 {type:'@@redux/INIT'} 的action 
 */


export default function combineReducers(reducers) {
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
