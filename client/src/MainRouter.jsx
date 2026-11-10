import { Navigate, Routes, Route } from 'react-router-dom';
import Header from './components/Header/Header.jsx';
import Home from './components/Home/Home.jsx';
import RegistrationForm from './components/RegistrationForm.jsx';
import LoginForm from './components/LoginForm.jsx';
import LogoutForm from './components/LogoutForm.jsx';
import './components/Global.css';
import Household from './components/Household/Household.jsx';

const MainRouter = () => {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/household" element={<Household />} />
        <Route path="/profile" element={<Navigate to="/household" replace />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/logout" element={<LogoutForm />} />
        <Route path="/registration" element={<RegistrationForm />} />
      </Routes>
    </>
  )
}

export default MainRouter;