import React, { useState, useEffect } from 'react'
import { loginUser, getAllDocuments } from '../../services/firebase'

function Auth() {
  const [branch, setBranch] = useState('Branch 1') // Add branch selection state
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [userNames, setUserNames] = useState([])

  useEffect(() => {
    if (branch) {
      fetchUserNames(branch) // Fetch users based on selected branch
    }
  }, [branch])

  const fetchUserNames = async () => {
    // const names = await getAllDocuments(`branches/${branch}/users`, 'name') // Adjust path to include branch
    // setUserNames(names)    
    // console.log(names)
    const names = await getAllDocuments('name') // 필드명만 전달
    setUserNames(names)
    // console.log('User Names:', names)
  }

  const handleLogin = async () => {
    try {
      await loginUser(name, password)
      setName('')
      setPassword('')
    } catch (error) {
      console.error('Error logging in', error)
      alert('Incorrect password. Please try again.') // Display alert if login fails
    }
  }

  return (
    <>
      <hr />
      <div className="container mt-2">
        <div className="row justify-content-center">
          <div className="col-md-4">
            <h3 className="text-center">Login</h3>

            {/* Branch Selection */}
            <div className="form-group mb-3">
              <select
                className="form-control"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              >
                <option value="Branch 1">Branch 1</option>
                <option value="Branch 2">Branch 2</option>
                {/* <option value="Branch 3">Branch 3</option> */}
              </select>
            </div>

            {/* Name Selection */}
            <div className="form-group mb-3">
              <select
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
              >
                <option value="">Select your name</option>
                {userNames.map((userName) => (
                  <option key={userName} value={userName}>
                    {userName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group mb-3">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control"
              />
            </div>

            <button className="btn btn-primary w-100" onClick={handleLogin}>
              Login
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Auth
