// Loader.js
import React from 'react'
import { Oval } from 'react-loader-spinner'

function Loader() {
  return (
    <div
      className="loader-container"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      <Oval
        height={80}
        width={80}
        color="#FD6029"
        ariaLabel="oval-loading"
        secondaryColor="#FD6029"
        strokeWidth={2}
        strokeWidthSecondary={2}
      />
    </div>
  )
}

export default Loader
