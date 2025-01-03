import { initializeApp } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import {
  getFirestore,
  collection,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  query,
  where,
} from 'firebase/firestore'

// Firebase 설정
const firebaseConfig = {
  apiKey: 'AIzaSyC8z2bB9ognmMcoFt8PUxzLWa9_ATn14ik',
  authDomain: 'sodeng-e4a1d.firebaseapp.com',
  projectId: 'sodeng-e4a1d',
  storageBucket: 'sodeng-e4a1d.appspot.com',
  messagingSenderId: '678982665331',
  appId: '1:678982665331:web:8debb3628c9b422d2c9606',
  measurementId: 'G-1TBR9XSMK6',
}

// Firebase 초기화
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)


// 브랜치 목록 설정
const branches = ['Branch 1', 'Branch 2']

// 현재 로그인한 사용자 정보 가져오기
export const getUserNow = async () => {
  const user = auth.currentUser
  if (!user) return null

  for (const branch of branches) {
    const userDoc = await getDoc(doc(db, 'branches', branch, 'users', user.uid))
    if (userDoc.exists()) return userDoc.data()
  }
  return null
}

// 필드에 따라 Firebase 컬렉션 데이터를 가져오는 함수 (모든 브랜치에서)
export const getAllDocuments = async (field = null) => {
  const allData = []
  for (const branch of branches) {
    const snapshot = await getDocs(collection(db, 'branches', branch, 'users'))
    snapshot.docs.forEach((doc) => {
      const data = doc.data()
      // console.log('Parsed Data:', data)
      allData.push(field ? doc.data()[field] : doc.data())
    })
  }
  return allData
}

// 유저정보 Edit
// export const moveUserToBranch = async (userId, currentBranch, newBranch) => {
//   try {
//     // 현재 branch에서 사용자 데이터 읽기
//     const currentUserRef = doc(db, 'branches', currentBranch, 'users', userId);
//     const userSnapshot = await getDoc(currentUserRef);

//     if (!userSnapshot.exists()) {
//       throw new Error(`User with ID ${userId} not found in branch ${currentBranch}`);
//     }

//     const userData = userSnapshot.data(); // 사용자 데이터 가져오기

//     // 새로운 branch에 사용자 데이터 추가
//     const newUserRef = doc(db, 'branches', newBranch, 'users', userId);
//     await setDoc(newUserRef, userData, { merge: true });

//     // 기존 branch에서 사용자 데이터 삭제
//     await deleteDoc(currentUserRef);

//     console.log(`User ${userId} moved from ${currentBranch} to ${newBranch}`);
//   } catch (error) {
//     console.error('Error moving user:', error.message);
//   }
// };

// 특정 날짜의 근무시간 가져오기
export const getWorkHoursByDate = async (userId, date) => {
  for (const branch of branches) {
    const workHoursRef = doc(
      db,
      'branches',
      branch,
      'users',
      userId,
      'workHours',
      date
    )
    const docSnapshot = await getDoc(workHoursRef)
    if (docSnapshot.exists()) return docSnapshot.data()
  }
  return null
}

// 회원가입 함수 
export const signUpUser = async (branch, userData, uid = null) => {
  // edit 일때는 uid없이 update
  if (!userData.uid) {
    userData.uid = uid
  }
  const usersCollection = collection(db, 'branches', branch, 'users');
  const newUserRef = doc(usersCollection); // 자동 생성된 ID 사용  
  await setDoc(newUserRef, userData, { merge: true });
};

// 회원가입 함수 (auth)
export const signUpAuth = async (email, password) => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  return userCredential.user;
};

// 회원정보 수정
export const updateUser = async (selectedUser, branch, userData) => {
  // 선택된 사용자가 있는 경우 업데이트  
  const userRef = doc(db, 'branches', branch, 'users', selectedUser);
  const docSnapshot = await getDoc(userRef);

  if (docSnapshot.exists()) {
    await updateDoc(userRef, userData);
    console.log('User updated successfully!');
  } else {
    await signUpUser(branch, userData)
    // await setDoc(userRef, userData, { merge: true });
    console.log('User created successfully!');
  }
}

// 로그인 함수
export const loginUser = async (name, password) => {
  for (const branch of branches) {
    const userQuery = query(
      collection(db, 'branches', branch, 'users'),
      where('name', '==', name)
    )

    const querySnapshot = await getDocs(userQuery);
    if (!querySnapshot.empty) {
      console.log('Found documents:', querySnapshot.docs);

      querySnapshot.docs.forEach((doc) => {
        console.log('Document ID:', doc.id);
        console.log('Document Data:', doc.data());
      });
      const userDoc = querySnapshot.docs[0]
      const email = userDoc.data().name + '@fakeemail.com'
      await signInWithEmailAndPassword(auth, email, password)
      return
    }
  }
  throw new Error('User not found')
}


// 로그아웃 함수
export const logoutUser = async () => {
  return await signOut(auth)
}

// 로그인 상태 변화 감지
export const onAuthStateChangedListener = (callback) => {
  return onAuthStateChanged(auth, callback)
}
