import React, { useState } from 'react';

const UserManagement = ({ users, handleDeleteUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const handleShowModal = (user) => {
    setSelectedUser(user); // 삭제하려는 사용자 저장
    setShowModal(true); // 모달 열기
  };

  const handleConfirmDelete = () => {
    if (selectedUser) {
      handleDeleteUser(selectedUser); // 삭제 함수 호출
    }
    setShowModal(false); // 모달 닫기
    setSelectedUser(null); // 선택된 사용자 초기화
  };

  const handleCancel = () => {
    setShowModal(false); // 모달 닫기
    setSelectedUser(null); // 선택된 사용자 초기화
  };

  return (
    <div>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            {user.name}
            <button
              className="btn btn-danger btn-sm"
              onClick={() => handleShowModal(user)} // 모달 표시
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {/* 모달 */}
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <p>Are you sure you want to delete {selectedUser?.name}?</p>
            <button className="btn btn-danger" onClick={handleConfirmDelete}>
              Yes
            </button>
            <button className="btn btn-secondary" onClick={handleCancel}>
              No
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
