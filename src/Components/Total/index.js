import React, { Component } from 'react'

import { connect } from '../../react-redux';
import { bindActionCreators } from '../../redux';


class Total extends Component {
  render() {
    return (
      <div>
        <h1>合计：{this.props.total}</h1>
      </div>
    )
  }
}


function mapStateToProps(state) {
  return state.calculate
}



const TotalBox = connect(mapStateToProps)(Total)

export default TotalBox;