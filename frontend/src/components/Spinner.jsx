import React from 'react';
import './Spinner.css';

function Spinner({ text = '' }) {
  return (
    <div className="loading-center">
      <div className="spinner" />
      {text && <span className="loading-text">{text}</span>}
    </div>
  );
}

export default Spinner;
