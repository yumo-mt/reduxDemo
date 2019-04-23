import React, { Component } from 'react';
import Box from "./Components";
import './App.css';
import { Provider } from './react-redux'
import { createStore, applyMiddleware } from './redux';
import thunk from './redux-thunk';
// import logger from 'redux-logger';

import rootReducer from './Reducers';
debugger;
const athunk = applyMiddleware(thunk);
const store = createStore(
  rootReducer,
  athunk
)

class App extends Component {
  constructor(props, context) {
    super(props, context)
    // 来波订阅
    store.subscribe(this.change)
  }

  change = () => {
    console.log('自动执行');
    let state = store.getState()
    console.log(state);
  }

  render() {
    return (
      <div className="App">
        <Provider store={store}>
          <Box />
        </Provider>

      </div>
    );
  }
}

export default App;
