import React, { useState, useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { useNavigate } from 'react-router-dom';
import { AuthAPI } from '../api.js';
import { applyServerUser } from '../utils/profileStorage.js';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // AOS Animations
  useEffect(() => {
    AOS.init();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    try {
      const response = await AuthAPI.login({
        email,
        password
      });

      if (response.user) {
        applyServerUser(response.user);
      }

      setMessage('Login successful! Redirecting...');

      setTimeout(() => {
        navigate('/household');
      }, 1000);

    } catch (error) {
      setMessage(error.message || 'Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="App-body login-form">
        <div className="dotted-bg" aria-hidden="true" />
        <div className='container container-2' data-aos="zoom-in-up">
          <div className="form-container">
            <h2>Login Form</h2>

            {message && (
              <p className={`info-box ${message.includes('successful') ? '' : 'error'}`}>
                {message}
              </p>
            )}

            <form onSubmit={handleSubmit}>
              <div className='form-group'>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='Email' 
                  required 
                />
              </div>

              <div className='form-group'>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder='Password' 
                  required 
                />
              </div>

              <button className='frontend-button' type='submit' disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;