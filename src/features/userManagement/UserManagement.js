import React, { useState, useEffect } from 'react'
import {
  doc,
  deleteDoc,
} from 'firebase/firestore'
import { db, signUpUser, signUpAuth, updateUser, getUsers } from '../../services/firebase'
// import UserConfirmation from '../../components/UserConfirmation';

function UserManagement() {
  const [users, setUsers] = useState([])
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('hall')
  const [branch, setBranch] = useState('AMOY') // 지점 선택 상태 변수
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')
  const [nominalSalary, setNominalSalary] = useState('')
  const [actualSalary, setActualSalary] = useState('')
  const [workingDays, setWorkingDays] = useState(5)
  const [hourlyRate, setHourlyRate] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  const calculateWorkHours = (start, end) => {
    const [startHours, startMinutes] = start.split(':').map(Number)
    const [endHours, endMinutes] = end.split(':').map(Number)
    const startDate = new Date(1970, 0, 1, startHours, startMinutes)
    const endDate = new Date(1970, 0, 1, endHours, endMinutes)
    const workTime = (endDate - startDate) / (1000 * 60 * 60) // 시간 단위로 계산
    return workTime > 0 ? workTime : 24 + workTime // 음수일 경우 다음날까지 근무한 것으로 처리
  }

  useEffect(() => {
    console.log('userEffect excuted')
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const userList = await getUsers(['TELOK', 'AMOY'])
    // const userList = await getUsers(['TELOK', 'AMOY'])
    setUsers(userList)
  }

  const initInputs = () => {
    // 상태 초기화
    setName('');
    setPassword('');
    setRole('hall');
    setBranch('TELOK');
    setStartTime('09:00');
    setEndTime('18:00');
    setNominalSalary('');
    setActualSalary('');
    setWorkingDays('');
    setHourlyRate('');
    setSelectedUser(null);
    setCurrentUser(null);
  }

  const handleSaveUser = async () => {
    const workHours = calculateWorkHours(startTime, endTime)
    const userData = {
      name,
      password,
      role,
      branch,
      startTime,
      endTime,
      workHours,
    }

    if (role === 'hall' || role === 'kitchen') {
      userData.nominalSalary = nominalSalary
      userData.actualSalary = actualSalary
      userData.workingDays = workingDays
    } else if (role === 'part-time') {
      userData.hourlyRate = hourlyRate
    }

    try {
      if (selectedUser) {
        // edit
        await updateUser(selectedUser, branch, userData)
        // setSelectedUser({ ...userData, id: selectedUser });
        // console.log(branch)
        // console.log(currentUser.branch)
        if (currentUser.branch !== branch) {
          handleDeleteUser(currentUser)
        }

      } else {
        // 신규가입
        const email = name.toLowerCase() + '@fakeemail.com'; // 이메일 생성
        const newUser = await signUpAuth(email, password)
        await signUpUser(branch, userData, newUser.uid)
        console.log('New user created successfully!');
      }

      await fetchUsers();

      initInputs()
    } catch (error) {
      console.error('Error saving user:', error.message);
    }
  }

  const handleEditUser = (user) => {
    setSelectedUser(user.id)
    setCurrentUser(user)
    setName(user.name)
    setPassword(user.password || '')
    setRole(user.role)
    setBranch(user.branch || 'TELOK') // 지점 정보 설정
    setStartTime(user.startTime)
    setEndTime(user.endTime)
    setNominalSalary(user.nominalSalary || '')
    setActualSalary(user.actualSalary || '')
    setWorkingDays(user.workingDays || '')
    setHourlyRate(user.hourlyRate || '')
  }

  const handleDeleteUser = async (user) => {
    await deleteDoc(doc(db, 'branches', user.branch, 'users', user.id))
    setUsers(users.filter((u) => u.id !== user.id))
    initInputs()
  }

  // 브랜치별 사용자 분류
  const branchUsers = users.reduce(
    (acc, user) => {
      acc[user.branch === 'TELOK' ? 0 : 1].push(user);
      return acc;
    },
    [[], []]
  );

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <h3 className="text-center">
            {selectedUser ? 'Edit User' : 'Add New User'}
          </h3>

          <div className="form-group mb-3">
            <label>Name</label>
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              className="form-control"
            />
          </div>

          <div className="form-group mb-3">
            <label>Password</label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control"
            />
          </div>

          <div className="form-group mb-3">
            <label>Role</label>
            <select
              className="form-control"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {/* <option value="admin">Admin</option> */}
              <option value="hall">Hall</option>
              <option value="kitchen">Kitchen</option>
              <option value="part-time">Part-time</option>
            </select>
          </div>

          <div className="form-group mb-3">
            <label>Branch</label>
            <select
              className="form-control"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            >
              <option value="TELOK">TELOK</option>
              <option value="AMOY">AMOY</option>
            </select>
          </div>

          {(role === 'hall' || role === 'kitchen') && (
            <>
              <div className="form-group mb-3">
                <label>Nominal Salary</label>
                <input
                  type="number"
                  placeholder="Nominal Salary"
                  value={nominalSalary}
                  onChange={(e) => setNominalSalary(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group mb-3">
                <label>Actual Salary</label>
                <input
                  type="number"
                  placeholder="Actual Salary"
                  value={actualSalary}
                  onChange={(e) => setActualSalary(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group mb-3">
                <label>Working Days per Week</label>
                <input
                  type="number"
                  placeholder="Working Days"
                  value={workingDays}
                  onChange={(e) => setWorkingDays(e.target.value)}
                  className="form-control"
                />
              </div>
            </>
          )}

          {role === 'part-time' && (
            <div className="form-group mb-3">
              <label>Hourly Rate</label>
              <input
                type="number"
                placeholder="Hourly Rate"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="form-control"
              />
            </div>
          )}

          <div className="form-group mb-3">
            <label>Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="form-control"
            />
          </div>

          <div className="form-group mb-3">
            <label>End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="form-control"
            />
          </div>

          <button className="btn btn-primary w-100" onClick={handleSaveUser}>
            {selectedUser ? 'Update User' : 'Add User'}
          </button>

          <hr />

          {/* <h4 className="text-center">User List</h4> */}
          {/* <ul className="list-group mt-3">
            {users.map((user) => (
              <li
                key={user.id}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <span>
                  {user.name} - {user.role} ({user.branch})
                </span>
                <div>
                  <button
                    className="btn btn-secondary btn-sm me-2"
                    onClick={() => handleEditUser(user)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteUser(user)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul> */}
          <h4 className="text-center">TELOK</h4>
          <ul className="list-group mt-3">
            {branchUsers[0].map((user) => (
              <li
                key={user.id}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <span>
                  {user.name} - {user.role} ({user.branch})
                </span>
                <div>
                  <button
                    className="btn btn-secondary btn-sm me-2"
                    onClick={() => handleEditUser(user)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteUser(user)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <br />

          <h4 className="text-center">AMOY</h4>
          <ul className="list-group mt-3">
            {branchUsers[1].map((user) => (
              <li
                key={user.id}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <span>
                  {user.name} - {user.role} ({user.branch})
                </span>
                <div>
                  <button
                    className="btn btn-secondary btn-sm me-2"
                    onClick={() => handleEditUser(user)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteUser(user)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default UserManagement
