import React, { useState, useEffect } from 'react'
import { db, getWorkHoursByDate, getUsers } from '../../services/firebase'
import { getDocs, collection, getDoc, doc, setDoc } from 'firebase/firestore'
import './Attendance.css'
import Loader from '../../components/Loader'

const roleOrder = {
  hall: 1,
  kitchen: 2,
  'part-time': 3,
}

function Attendance() {
  const [users, setUsers] = useState([])
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [selectedBranch, setSelectedBranch] = useState('Branch 1')
  const [workHoursByUser, setWorkHoursByUser] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [salesData, setSalesData] = useState({
    dailySales: 0,
    cashSales: 0,
    payNowSales: 0,
    cashOnHand: 0,
  })

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true)
        setWorkHoursByUser({})

        const fetchUsers = async () => {
          const userList = await getUsers([selectedBranch])
          setUsers(userList)
        }

        fetchUsers()
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchUserData()
  }, [selectedBranch])

  useEffect(() => {
    const fetchWorkHours = async () => {
      if (users.length > 0) {
        setIsLoading(true)
        await handleSearch(selectedDate)
        setIsLoading(false)
      }
    }
    fetchWorkHours()
  }, [users, selectedDate])

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const salesDocRef = doc(
          db,
          'branches',
          selectedBranch,
          'sales',
          selectedDate
        )
        const salesSnapshot = await getDoc(salesDocRef)
        if (salesSnapshot.exists()) {
          setSalesData(salesSnapshot.data())
        } else {
          setSalesData({
            dailySales: 0,
            cashSales: 0,
            payNowSales: 0,
            cashOnHand: 0,
          })
        }
      } catch (error) {
        console.error('Error fetching sales data:', error)
      }
    }
    fetchSalesData()
  }, [selectedDate, selectedBranch])

  const handleSearch = async (date) => {
    const searchDate = date || selectedDate
    if (searchDate) {
      const allWorkHours = {}
      await Promise.all(
        users.map(async (user) => {
          const workData = await getWorkHoursByDate(
            user.id,
            searchDate,
            selectedBranch
          )
          const isOff = workData && workData.onOff === 'off'
          allWorkHours[user.id] = isOff
            ? {
              startTime: '00:00',
              endTime: '00:00',
              onOff: 'off',
              confirmed: true,
            }
            : workData || {
              startTime: user.startTime || '09:00',
              endTime: user.endTime || '18:00',
              onOff: 'on',
              confirmed: false,
            }
        })
      )
      setWorkHoursByUser(allWorkHours)
    }
  }

  const calculateDailyWages = (user, actualWorkedHours) => {
    const { nominalSalary, actualSalary, workingDays, workHours, hourlyRate } =
      user
    let nominalDailyWage = 0
    let actualDailyWage = 0

    if (user.role === 'part-time') {
      const effectiveHours =
        actualWorkedHours > 8
          ? Math.max(0, actualWorkedHours - 1.5)
          : actualWorkedHours
      nominalDailyWage = hourlyRate * effectiveHours
      actualDailyWage = nominalDailyWage
    } else {
      const weekFactor = 4.25
      const nominalDailyRate = nominalSalary / weekFactor / workingDays
      const actualDailyRate = actualSalary / weekFactor / workingDays
      const hoursRatio = actualWorkedHours / workHours >= 0.75 ? 1 : 0.5

      nominalDailyWage = (nominalDailyRate * hoursRatio).toFixed(2)
      actualDailyWage = (actualDailyRate * hoursRatio).toFixed(2)
    }

    return {
      nominalDailyWage: parseFloat(nominalDailyWage),
      actualDailyWage: parseFloat(actualDailyWage),
    }
  }

  const handleDateChange = async (e) => {
    setSelectedDate(e.target.value)
    setIsLoading(true)
    await handleSearch(e.target.value)
    setIsLoading(false)
  }

  const handleSalesDataChange = (field, value) => {
    setSalesData((prev) => ({
      ...prev,
      [field]: parseFloat(parseFloat(value).toFixed(2)),
    }))
  }

  const handleTimeChange = (userId, field, value) => {
    setWorkHoursByUser((prevState) => ({
      ...prevState,
      [userId]: {
        ...prevState[userId],
        [field]: value,
        confirmed: false,
      },
    }))
  }

  const handleConfirm = (userId, value) => {
    setWorkHoursByUser((prevState) => ({
      ...prevState,
      [userId]: {
        ...prevState[userId],
        confirmed: value,
      },
    }))
  }

  const handleToggleOnOff = (userId, isOn) => {
    const user = users.find((u) => u.id === userId)
    setWorkHoursByUser((prevState) => ({
      ...prevState,
      [userId]: {
        ...prevState[userId],
        startTime: isOn ? user.startTime : '00:00',
        endTime: isOn ? user.endTime : '00:00',
        onOff: isOn ? 'on' : 'off',
        confirmed: !isOn,
      },
    }))
  }

  const handleSaveAll = async () => {
    setIsLoading(true)
    try {
      let nominalTotal = 0
      let actualTotal = 0

      const saveWorkHoursPromises = Object.keys(workHoursByUser).map(
        async (userId) => {
          const user = users.find((u) => u.id === userId)
          const { startTime, endTime, onOff, confirmed } =
            workHoursByUser[userId]

          let dailyWages = {}
          if (confirmed) {
            const start = new Date(`1970-01-01T${startTime}:00`)
            const end = new Date(`1970-01-01T${endTime}:00`)
            const actualWorkedHours = Math.max(
              0,
              (end - start) / (1000 * 60 * 60)
            )
            dailyWages = calculateDailyWages(user, actualWorkedHours)
            nominalTotal += dailyWages.nominalDailyWage || 0
            actualTotal += dailyWages.actualDailyWage || 0
          }

          const workHoursRef = doc(
            db,
            'branches',
            selectedBranch,
            'users',
            userId,
            'workHours',
            selectedDate
          )

          return setDoc(
            workHoursRef,
            {
              startTime,
              endTime,
              onOff,
              confirmed,
              ...dailyWages,
            },
            { merge: true }
          )
        }
      )

      const salesRef = doc(
        db,
        'branches',
        selectedBranch,
        'sales',
        selectedDate
      )
      const saveSalesDataPromise = setDoc(
        salesRef,
        {
          ...salesData,
          nominalPayroll: nominalTotal.toFixed(2),
          actualPayroll: actualTotal.toFixed(2),
        },
        { merge: true }
      )

      await Promise.all([...saveWorkHoursPromises, saveSalesDataPromise])
    } catch (error) {
      console.error('Error saving work hours and sales data:', error)
      alert('Failed to save work hours and sales data')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <Loader />
  }

  const getNameCellStyle = (role) => {
    switch (role) {
      case 'hall':
        return { backgroundColor: '#ffd966' }
      case 'kitchen':
        return { backgroundColor: '#ffb3b3' }
      case 'part-time':
        return { backgroundColor: '#ccccff' }
      default:
        return {}
    }
  }

  const onUsers = Object.entries(workHoursByUser)
    .filter(([, workHours]) => workHours.onOff === 'on')
    .sort(([aId], [bId]) => {
      const userA = users.find((u) => u.id === aId)
      const userB = users.find((u) => u.id === bId)

      const roleA = userA?.role ? roleOrder[userA.role] : 0
      const roleB = userB?.role ? roleOrder[userB.role] : 0

      return roleA - roleB
    })

  const offUsers = Object.entries(workHoursByUser)
    .filter(([, workHours]) => workHours.onOff === 'off')
    .sort(([aId], [bId]) => {
      const userA = users.find((u) => u.id === aId)
      const userB = users.find((u) => u.id === bId)

      const roleA = userA?.role ? roleOrder[userA.role] : 0
      const roleB = userB?.role ? roleOrder[userB.role] : 0

      return roleA - roleB
    })

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mt-2">
        <div className="col-4">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="form-control"
          >
            <option value="Branch 1">Branch 1</option>
            <option value="Branch 2">Branch 2</option>
          </select>
        </div>
        <div className="col-4 text-center">
          <h3 className="custom-text">Sales & Attendance</h3>
        </div>
        <div className="col-4 d-flex justify-content-end">
          <input
            type="date"
            id="datePicker"
            className="form-control"
            style={{ width: 'auto' }}
            value={selectedDate}
            onChange={handleDateChange}
          />
        </div>
      </div>

      <h4>Sales Data (SGD)</h4>
      <div className="sales-input-section mb-4 p-3 border rounded">
        <div className="form-group mb-2">
          <label>Daily Sales</label>
          <input
            type="number"
            className="form-control"
            value={salesData.dailySales}
            onChange={(e) =>
              handleSalesDataChange('dailySales', e.target.value)
            }
          />
        </div>
        <div className="form-group mb-2">
          <label>Cash Sales</label>
          <input
            type="number"
            className="form-control"
            value={salesData.cashSales}
            onChange={(e) => handleSalesDataChange('cashSales', e.target.value)}
          />
        </div>
        <div className="form-group mb-2">
          <label>PayNow Sales</label>
          <input
            type="number"
            className="form-control"
            value={salesData.payNowSales}
            onChange={(e) =>
              handleSalesDataChange('payNowSales', e.target.value)
            }
          />
        </div>
        <div className="form-group mb-2">
          <label>Cash on Hand</label>
          <input
            type="number"
            className="form-control"
            value={salesData.cashOnHand}
            onChange={(e) =>
              handleSalesDataChange('cashOnHand', e.target.value)
            }
          />
        </div>
      </div>

      <div>
        <h4>On-Duty List</h4>
        <table className="table table-bordered mt-2">
          <thead>
            <tr>
              <th>Name</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {onUsers.map(([userId, workHours]) => {
              const user = users.find((u) => u.id === userId)

              return (
                <tr key={userId}>
                  <td style={user?.role ? getNameCellStyle(user.role) : {}}>
                    {user?.name || 'Unknown'}
                  </td>
                  <td>
                    <input
                      type="time"
                      className="form-control"
                      value={workHours.startTime}
                      onChange={(e) =>
                        handleTimeChange(userId, 'startTime', e.target.value)
                      }
                      disabled={workHours.confirmed}
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      className="form-control"
                      value={workHours.endTime}
                      onChange={(e) =>
                        handleTimeChange(userId, 'endTime', e.target.value)
                      }
                      disabled={workHours.confirmed}
                    />
                  </td>
                  <td>
                    {workHours.confirmed ? (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleConfirm(userId, false)}
                        style={{ marginRight: '5px' }}
                      >
                        Modify
                      </button>
                    ) : (
                      <>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleConfirm(userId, true)}
                          style={{ marginRight: '1px' }}
                        >
                          OK
                        </button>
                        <button
                          className="btn btn-warning btn-sm"
                          onClick={() => handleToggleOnOff(userId, false)}
                        >
                          off
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div>
        <h4>Off-Duty List</h4>
        <table className="table table-bordered mt-2">
          <thead>
            <tr>
              <th>Name</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {offUsers.map(([userId, workHours]) => {
              const user = users.find((u) => u.id === userId)

              return (
                <tr key={userId}>
                  <td style={user?.role ? getNameCellStyle(user.role) : {}}>
                    {user?.name || 'Unknown'}
                  </td>
                  <td>{workHours.startTime}</td>
                  <td>{workHours.endTime}</td>
                  <td>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleToggleOnOff(userId, true)}
                    >
                      CHG On
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="d-flex justify-content-end">
        <button className="btn btn-primary" onClick={handleSaveAll}>
          Save All
        </button>
      </div>
    </>
  )
}

export default Attendance
