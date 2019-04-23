

const add = (text) => {
  return {
    type: 'add',
    text
  }
}

const minus = (text) => {
  return {
    type: 'minus',
    text
  }
}
const set = (text) => {
  return {
    type: 'set',
    text
  }
}

const fetchText = () => {
  return (dispatch) => {
    fetch('http://api.manster.me/p1').then(res => res.json()).then(res => {
      dispatch({ type: 'fetchText', text: res.text })
    })
  }
}

module.exports = {
  add,
  minus,
  set,
  fetchText
}