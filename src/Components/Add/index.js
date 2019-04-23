import React, { Component } from 'react'
import { connect } from '../../react-redux';
import { bindActionCreators } from '../../redux';

import { add } from '../../Actions'

class Add extends Component {

  state = {
    text: ''
  }
  change = (e) => {
    this.setState({
      text: e.target.value
    })
  }
  add = () => {
    const text = this.state.text;
    this.props.add(text)
    this.setState({
      text:''
    })
  }
  render() {
    return (
      <div>
        <h3>增加操作</h3>
        <input type="text" value={this.state.text} onChange={this.change} />
        <button onClick={this.add}>增加</button>
      </div>
    )
  }
}




function mapDispatchToProps(dispatch) {
  return {
    add: bindActionCreators(add, dispatch)
  }
}

const AddBox = connect(null, mapDispatchToProps)(Add)

export default AddBox;