// import React from 'react';
import { LogOut } from "lucide-react"; 
import React, { useState } from 'react';
import '../styles/landing.css'
import { FaUser } from "react-icons/fa";

const UserProfile = ({ user, onLogout }) => {
  const [showDialog, setShowDialog] = useState(false);
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
  };

  return (
    <div className="dashboard-profile">
      <div className="user-avatar"><FaUser style={{ color: "white"}} /></div>
      <div className="user-details">
        <span className="user-name">{user.firstName} {user.lastName}</span>
        <span className="user-email">{user.email}</span>
      </div>
      <button onClick={() => setShowDialog(true)} className="btn-logout">
        Logout
      </button>

      {/* ---------- Floating overlay confirmation (top-right) ---------- */}
      {showDialog && (
        <div className="overlay-popup" role="dialog" aria-modal="true">
          <div className="overlay-card">
            <div className="overlay-header">
              <LogOut size={18} className="overlay-icon" />
              <div className="overlay-title">Confirm Logout</div>
            </div>
            <div className="overlay-body">
              <div className="overlay-text">
                Are you sure you want to log out?
                <div className="overlay-subtext">You’ll need to sign in again to continue.</div>
              </div>
              <div className="overlay-actions">
                <button className="btn-confirm" onClick={handleLogout}>
                  Yes, Logout
                </button>
                <button className="btn-cancel" onClick={() => setShowDialog(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
