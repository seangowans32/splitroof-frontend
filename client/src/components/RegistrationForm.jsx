import React, { useState, useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { AuthAPI } from '../api.js';
import { useNavigate } from 'react-router-dom';

const RegistrationForm = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
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

    if(password !== retypePassword) {
      setMessage("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await AuthAPI.register({
        username,
        email,
        password
      });
      
      setMessage(response.message || 'Registration successful!');
      // Clear form
      setUsername('');
      setEmail('');
      setPassword('');
      setRetypePassword('');

      // Redirect to login page after successful registration
      setTimeout(() => {
        navigate('/Login');
      }, 1000);

    } catch (error) {
      setMessage(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="App-body registration-form">
        <div className="dotted-bg" aria-hidden="true" />
        <div className='container container-2' data-aos="zoom-in-up">
          <div className="form-container">
            <h2>Registration Form</h2>

            {message && (
              <p className={`info-box ${message.includes('successful') ? '' : 'error'}`}>
                {message}
              </p>
            )}

            <form onSubmit={handleSubmit}>
              <div className='form-group'>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder='Username' 
                  required 
                />
              </div>

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

              <div className='form-group'>
                <input
                  type="password" 
                  value={retypePassword}
                  onChange={(e) => setRetypePassword(e.target.value)}
                  placeholder='Retype Password' 
                  required 
                />
              </div>

              <button className='frontend-button' type='submit' disabled={isLoading}>
                {isLoading ? 'Registering...' : 'Register'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;