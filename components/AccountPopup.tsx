import React, { useEffect, useState } from 'react';
import styles from '../src/styles/AccountPopup.module.css';
import '../src/styles/globals.css';

const setCookie = (name: string, value: string, days = 365) => {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
  };

  const getCookie = (name: string) => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };
  const generateRandomString = (length = 16) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

const AccountPopup: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    let storedUserId = getCookie('userId');
    if (!storedUserId) {
      storedUserId = generateRandomString(); // Generate a 16-char ID
      setCookie('userId', storedUserId); // Store it as a cookie
    }
    setUserId(storedUserId); // Set it in the state
  }, []);

  const togglePopup = () => {
    setShowPopup(!showPopup);
    // reset the user ID if the popup is closed
    if (!showPopup) {
      setUserId(getCookie('userId'));
    }
  }

  const copyToClipboard = () => {
    if (userId) {
      navigator.clipboard.writeText(userId);
      alert('User ID copied to clipboard!');
    }
  };

  const handleUserIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserId(e.target.value);
  };

  const saveUserId = () => {
    if (!userId) {
        alert('User ID cannot be empty!');
    }
    else if (userId.length != 16) {
        alert('User ID must be 16 characters long!');
    }
    else {
      setCookie('userId', userId);
      alert('User ID updated!');
    }
  };

  return (
    <>
      <button onClick={togglePopup} className={styles.button}>
        Account
      </button>

      {showPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <h2>Your User ID</h2>
            <p>This ID is used to prevent duplicate challenges. You can copy it to another device to sign in</p>
            <input type="text" value={userId || ''} onChange={handleUserIdChange} />
            <div>
              <button onClick={copyToClipboard}>Copy ID</button>
              <button onClick={saveUserId}>Save ID</button>
            </div>
            <button onClick={togglePopup}>Close</button>
          </div>
        </div>
      )}
    </>
  );
};

export default AccountPopup;
