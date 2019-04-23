

import { combineReducers } from '../redux';

/**
 * reducer
 * @param {*} state 
 * @param {*} action 
 */


const calculate = (state = { total: 0 }, action) => {
  switch (action.type) {
    case 'add':
      return {
        total: state.total + +action.text
      }
      break;
    case 'minus':
      return {
        total: state.total - action.text,
      }
      break;
    case 'change':
      return {
        total: action.text,
      }
      break;
    default:
      return state;
  }
}

const setText = (state = { text: '' }, action) => {
  if (action.type === 'set') {
    return {
      text: action.text
    }
  } else if(action.type === 'fetchText'){
    return {
      text: action.text
    }
  }else{
    return {
      text: state.text
    }
  }
}

debugger
const rootReducers = combineReducers({
  calculate,
  setText,
})


export default rootReducers;


