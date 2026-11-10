import React, { useState, useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { useNavigate } from 'react-router-dom';
import { AuthAPI } from '../api.js';

const LogoutForm = () => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // AOS Animations
  useEffect(() => {
    AOS.init();
  }, []);

  const handleLogout = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    try {
      await AuthAPI.logout();

      // Clear user data from localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('token');

      // Dispatch custom event to update Header
      window.dispatchEvent(new Event('authChange'));

      setMessage('Logout successful! Redirecting...');

      // Redirect to home page after successful logout
      setTimeout(() => {
        navigate('/');
      }, 1000);

    } catch (error) {
      setMessage(error.message || 'Logout failed. Please try again.');
      setIsLoading(false);

      // Even if API call fails, clear local storage and redirect
      localStorage.removeItem('user');
      localStorage.removeItem('token');

      // Dispatch custom event to update Header
      window.dispatchEvent(new Event('authChange'));

      setTimeout(() => {
        navigate('/');
      }, 2000);
    }
  };

  return (
    <div className="App">
      <div className="App-body login-form">
        <div className="dotted-bg" aria-hidden="true" />
        <div className='container container-2' data-aos="zoom-in-up">
          <div className="form-container">
            <h2>Logout</h2>

            {message && (
              <p className={`info-box ${message.includes('successful') ? '' : 'error'}`}>
                {message}
              </p>
            )}

            <div className="logout-content flex gap-10">
              <p>Are you sure you want to logout?</p>

              <form onSubmit={handleLogout}>
                <button className='frontend-button' type='submit' disabled={isLoading}>
                  {isLoading ? 'Logging out...' : 'Logout'}
                </button>
              </form>

              <button className='frontend-button secondary' onClick={() => navigate('/')} disabled={isLoading}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutForm;