import React, { Component } from 'react'

import { connect } from '../../react-redux';
import { bindActionCreators } from '../../redux';
import {
  set,
  fetchText
} from '../../Actions'

class Write extends Component {
  state = {
    text: ''
  }
  change = (e) => {
    this.setState({
      text: e.target.value
    })
  }
  set = () => {
    const text = this.state.text;
    this.props.set(text)
    this.setState({
      text: ''
    })
  }
  componentDidMount() {
    this.props.fetchText();
  }
  
  render() {
    return (
      <div>
        <h3>
          文字：「{this.props.text}」
         </h3>
        <div>
          <input type="text" onChange={this.change} />
          <button onClick={this.set}>确定</button>
        </div>
      </div>
    )
  }
}
function mapStateToProps(state,ownProps) {
  return state.setText;
}

function mapDispatchToProps(dispatch) {
  return {
    set: bindActionCreators(set, dispatch),
    fetchText: bindActionCreators(fetchText, dispatch)
  }
}

const WriteBox = connect(mapStateToProps, mapDispatchToProps)(Write)

export default WriteBox;