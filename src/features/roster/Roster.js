/* eslint-disable */
import React, { useState, useEffect, useMemo } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { db, getWorkHoursByDate, getUsers } from '../../services/firebase'
import {
  AiOutlineCaretLeft,
  AiOutlineCaretRight,
  AiOutlineCheckCircle,
} from 'react-icons/ai'
import Loader from '../../components/Loader'
import './Roster.css'

const getCurrentWeek = () => {
  const today = new Date();
  const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
  const pastDaysOfYear = (today - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

function Roster({ isAdmin }) {
  const [users, setUsers] = useState([])
  const [selectedBranch, setSelectedBranch] = useState('TELOK')
  const [year, setYear] = useState(new Date().getFullYear())
  const [week, setWeek] = useState(getCurrentWeek())
  const [onOffStatus, setOnOffStatus] = useState({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = async () => {
      const userList = await getUsers([selectedBranch])
      setUsers(userList)
    }

    fetchUsers()
  }, [selectedBranch])

  useEffect(() => {
    const fetchOnOffStatus = async () => {
      if (users.length > 0) {
        setIsLoading(true)
        const allStatuses = {}
        const datesInWeek = getDatesInWeek(year, week)

        const fetchDataPromises = users.flatMap((user) =>
          datesInWeek.map(async (date) => {
            const dateStr = formatDate(date)
            const workData = await getWorkHoursByDate(
              user.id,
              dateStr,
              selectedBranch
            )

            allStatuses[`${user.id}|${dateStr}`] = {
              startTime: workData?.startTime || user.startTime,
              endTime: workData?.endTime || user.endTime,
              onOff: workData?.onOff || 'on',
              confirmed: workData?.confirmed || false,
            }
          })
        )

        await Promise.all(fetchDataPromises)
        setOnOffStatus(allStatuses)
        setIsLoading(false)
      }
    }

    fetchOnOffStatus()
  }, [users, year, week, selectedBranch])

  // const getDatesInWeek = (year, week) => {
  //   const firstDayOfYear = new Date(year, 0, 1)
  //   const daysOffset = (week - 1) * 7 - firstDayOfYear.getDay()
  //   return Array.from(
  //     { length: 7 },
  //     (_, i) => new Date(year, 0, daysOffset + i + 1)
  //   ).filter((date) => date.getDay() !== 0)
  // }

  const getDatesInWeek = (year, week) => {
    const firstDayOfYear = new Date(year, 0, 1);
    const dayOffset = (week - 1) * 7 - firstDayOfYear.getDay() + 1;

    // 기준 날짜로부터 시작
    const startOfWeek = new Date(year, 0, dayOffset);

    // 일요일 제외한 주중 날짜 생성
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    }).filter((date) => date.getDay() !== 0); // 일요일 제외
  };


  const formatDate = (date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handlePreviousWeek = () => {
    if (week === 1) {
      setYear(year - 1)
      setWeek(52)
    } else {
      setWeek(week - 1)
    }
  }

  const handleNextWeek = () => {
    if (week === 52) {
      setYear(year + 1)
      setWeek(1)
    } else {
      setWeek(week + 1)
    }
  }

  const toggleOnOff = (userId, date) => {
    if (!isAdmin) return
    const key = `${userId}|${date}`
    const currentStatus = onOffStatus[key]

    if (currentStatus?.confirmed) {
      return
    }

    setOnOffStatus((prevStatus) => ({
      ...prevStatus,
      [key]: {
        ...prevStatus[key],
        onOff: prevStatus[key]?.onOff === 'on' ? 'off' : 'on',
      },
    }))
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const savePromises = Object.keys(onOffStatus).map((userId) => {
        const [user, date] = userId.split('|')
        const workHoursRef = doc(
          db,
          'branches',
          selectedBranch,
          'users',
          user,
          'workHours',
          date
        )
        const { startTime, endTime, onOff } = onOffStatus[userId]
        return setDoc(
          workHoursRef,
          { startTime, endTime, onOff },
          { merge: true }
        )
      })

      await Promise.all(savePromises)
    } catch (error) {
      console.error('Error saving work hours:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const datesInWeek = useMemo(() => getDatesInWeek(year, week), [year, week])

  const roleOrder = {
    hall: 1,
    kitchen: 2,
    'part-time': 3,
  }

  const sortedUsers = useMemo(() => {
    return users
      .filter((user) => user.role !== 'admin')
      .sort((a, b) => roleOrder[a.role] - roleOrder[b.role])
  }, [users])

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

  if (isLoading) {
    return <Loader />
  }

  return (
    <>
      <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
        <div className="d-flex justify-content-between align-items-center mt-2">
          <div className="col-3">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="form-control"
              style={{ width: 'auto' }}
            >
              <option value="TELOK">TELOK</option>
              <option value="AMOY">AMOY</option>
            </select>
          </div>
          <div className="col-6">
            <h3>Weekly Roster</h3>
          </div>
          <div className="col-3"></div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <button
            onClick={handlePreviousWeek}
            style={{
              fontSize: '20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AiOutlineCaretLeft />
          </button>
          <h5 style={{ margin: 0 }}>
            {year} - {week}W
          </h5>
          <button
            onClick={handleNextWeek}
            style={{
              fontSize: '20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AiOutlineCaretRight />
          </button>
        </div>

        <table className="table table-bordered mt-4">
          <thead>
            <tr>
              <th>Name</th>
              {datesInWeek.map((date, idx) => {
                const dayOfWeek = date
                  .toLocaleDateString('en-US', { weekday: 'short' })
                  .toUpperCase()
                const monthDay = `${date.getMonth() + 1}/${date.getDate()}`
                const colorStyle =
                  dayOfWeek === 'SAT'
                    ? { color: 'blue' }
                    : dayOfWeek === 'SUN'
                      ? { color: 'red' }
                      : {}

                return (
                  <th key={idx} style={colorStyle}>
                    {monthDay}
                    <br />
                    <span style={{ fontSize: 'small' }}>{dayOfWeek}</span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((user) => (
              <tr key={user.id}>
                <td style={getNameCellStyle(user.role)}>{user.name}</td>
                {datesInWeek.map((date, idx) => {
                  const dateStr = formatDate(date)
                  const { startTime, endTime, onOff, confirmed } = onOffStatus[
                    `${user.id}|${dateStr}`
                  ] || {
                    startTime: user.startTime || '09:00',
                    endTime: user.endTime || '18:00',
                    onOff: 'on',
                    confirmed: false,
                  }

                  return (
                    <td
                      key={idx}
                      onClick={() => toggleOnOff(user.id, dateStr)}
                      style={{
                        backgroundColor: onOff === 'on' ? '' : '#ffcccc',
                        cursor: 'pointer',
                        padding: '5px',
                        textAlign: 'center',
                        position: 'relative',
                      }}
                    >
                      {onOff === 'on' ? (
                        <>
                          <div>{startTime}</div>
                          <div>{endTime}</div>
                        </>
                      ) : (
                        <div>OFF</div>
                      )}
                      {confirmed && (
                        <AiOutlineCheckCircle
                          style={{
                            fontSize: '12px',
                            color: 'green',
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                          }}
                        />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="d-flex justify-content-end">
        <button onClick={handleSave} className="btn btn-primary">
          Save All
        </button>
      </div>
    </>
  )
}

export default Roster
