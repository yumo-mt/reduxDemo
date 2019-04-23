import React, { Component } from 'react'
import Total from './Total';
import Add from './Add';
import Minus from './Minus';
import Write from './Write';

export default function App() {

  return (
    <div>
      <Total />
      <hr />
      <Add />
      <Minus />
      <hr/>
      <div>
        <Write />
      </div>
    </div>)
}
