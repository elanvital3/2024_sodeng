import React from 'react'

export default function Title() {
  return (
    <>
      <div className="text-center" style={{ position: 'relative' }}>
        <h1
          className="text-center"
          onClick={() => window.location.reload()}
          style={{ cursor: 'pointer' }}
        >
          SODENG
        </h1>
        <img
          src="/favicon.ico"
          alt="icon"
          style={{
            position: 'absolute',
            top: '-1vh',
            left: '20vw',
            width: '40px',
            height: '30px',
            transform: 'rotate(-30deg)',
          }}
        />
      </div>
    </>
  )
}
