import React, { Component } from 'react'
import { connect } from '../../react-redux';
import { bindActionCreators } from '../../redux';
import { minus } from '../../Actions';

class Minus extends Component {

  state = {
    text: ''
  }
  change = (e) => {
    this.setState({
      text: e.target.value
    })
  }
  minus = () => {
    const text = this.state.text;
    this.props.minus(text)
    this.setState({
      text: ''
    })
  }
  render() {
    return (
      <div>
        <h3>减少操作</h3>
        <input type="text" value={this.state.text} onChange={this.change} />
        <button onClick={this.minus}>减少</button>
      </div>
    )
  }
}

function mapDispatchToProps(dispatch) {
  return {
    minus: bindActionCreators(minus, dispatch)
  }
}

const MinusBox = connect(null, mapDispatchToProps)(Minus)

export default MinusBox;
