import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { onAuthStateChangedListener, auth, db, } from './services/firebase'
import { doc, getDoc, query, where, collection, getDocs } from 'firebase/firestore'
import Auth from './features/login/Login'
import Attendance from './features/attendance/Attendance'
import Roster from './features/roster/Roster'
import FinancialPage from './features/financial/FinancialPage'
import UserManagement from './features/userManagement/UserManagement'
import Title from './components/Title'
import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'
import { signOut } from 'firebase/auth'

function App() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  // const [isAdmin, setIsAdmin] = useState(true)

  useEffect(() => {
    const fetchUserDataFromBranches = async (user) => {
      console.log(user.uid)
      const branchNames = ['TELOK', 'AMOY'] // 모든 branch 이름을 여기에 추가하세요      

      for (const branch of branchNames) {
        const usersCollectionRef = collection(db, 'branches', branch, 'users'); // 브랜치의 사용자 컬렉션 참조
        const q = query(usersCollectionRef, where('uid', '==', user.uid)); // uid 조건 쿼리
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data(); // 첫 번째 일치하는 문서 데이터
          console.log(userData.role);
          setIsAdmin(userData.role === 'admin'); // role 확인 후 isAdmin 설정
          return; // 일치하는 사용자 찾으면 종료
        }
      }

      // for (const branch of branchNames) {
      //   const userDocRef = doc(db, 'branches', branch, 'users', user.uid)
      //   const userSnapshot = await getDoc(userDocRef)
      //   console.log(userSnapshot.exists())
      //   if (userSnapshot.exists()) {
      //     const userData = userSnapshot.data()
      //     console.log(userData.role)
      //     setIsAdmin(userData.role === 'admin') // role 확인 후 isAdmin 설정
      //     // setIsAdmin(userData.role !== 'admin') // role 확인 후 isAdmin 설정
      //     return
      //   }
      // }

      // setIsAdmin(true) // 사용자 정보가 어떤 branch에서도 발견되지 않을 때
      setIsAdmin(false) // 사용자 정보가 어떤 branch에서도 발견되지 않을 때
    }

    const unsubscribe = onAuthStateChangedListener(async (user) => {
      setUser(user)
      if (user) {
        await fetchUserDataFromBranches(user)
      } else {
        // setIsAdmin(true)
        setIsAdmin(false)
      }
    })

    return unsubscribe
  }, [])

  const handleLogout = () => {
    signOut(auth)
  }

  return (
    <Router>
      <div className="App container mt-5">
        <Title />
        {user && (
          <nav className="navbar navbar-expand navbar-light border-bottom">
            <div className="navbar-nav">
              <Link className="nav-link" to="/attendance">
                Daily
              </Link>
              <Link className="nav-link" to="/roster">
                Roster
              </Link>
              {isAdmin && (
                <>
                  <Link className="nav-link" to="/financial">
                    Financial
                  </Link>
                  <Link className="nav-link" to="/user-management">
                    User
                  </Link>
                </>
              )}
            </div>
            <div className="ms-auto">
              {user ? (
                <button
                  className="btn btn-danger btn-sm px-1"
                  onClick={handleLogout}
                >
                  Logout ({user.email.split('@')[0].slice(0, 4)})
                  {/* Logout ({user.email.split('@')[0]}) */}
                </button>
              ) : (
                <Link className="nav-link" to="/">
                  Login
                </Link>
              )}
            </div>
          </nav>
        )}
        <Routes>
          {user ? (
            <>
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/roster" element={<Roster isAdmin={isAdmin} />} />
              <Route path="/" element={<Attendance />} />
              {isAdmin && (
                <>
                  <Route path="/financial" element={<FinancialPage />} />
                  <Route path="/user-management" element={<UserManagement />} />
                </>
              )}
            </>
          ) : (
            <Route path="*" element={<Auth />} />
          )}
        </Routes>
      </div>
    </Router>
  )
}

export default App
