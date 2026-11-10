import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import logo from "../../assets/main-logo.png";
import { useHamburger, useCurrentMenuItem } from '../../hooks/useCustomHooks';
import { applyTheme, readTheme, THEMES } from '../../theme.js';
import "./Header.css";

const ThemeToggle = ({ theme, onChange }) => (
  <div className="theme-toggle" role="group" aria-label="Color theme">
    {THEMES.map((option) => (
      <button
        key={option.id}
        type="button"
        className={theme === option.id ? 'is-on' : ''}
        aria-pressed={theme === option.id}
        onClick={() => onChange(option.id)}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [theme, setTheme] = useState(readTheme);
  const chooseTheme = (next) => setTheme(applyTheme(next));
  const isMenuActive = useHamburger();
  const currentPath = useCurrentMenuItem();

  useEffect(() => {
    const checkAuthStatus = () => {
      const user = localStorage.getItem("user");
      setIsLoggedIn(!!user);
    };

    checkAuthStatus();
    window.addEventListener("storage", checkAuthStatus);
    window.addEventListener("authChange", checkAuthStatus);

    return () => {
      window.removeEventListener("storage", checkAuthStatus);
      window.removeEventListener("authChange", checkAuthStatus);
    };
  }, []);

  return (
    <header className="header">
      <div className="container">
        <nav className="nav-links flex gap-20">
          <Link className="header-logo" to="/">
            <img src={logo} alt="SplitRoof Logo"/>
          </Link>

          <Link className={`desktop-only ${currentPath === '/' ? 'active' : ''}`} to="/">Home</Link>

          {!isLoggedIn ? (
            <>
              <Link className={`desktop-only ${currentPath === '/login' ? 'active' : ''}`} to="/login">Login</Link>
              <Link className={`desktop-only ${currentPath === '/registration' ? 'active' : ''}`} to="/registration">Registration</Link>
            </>
          ) : (
            <>
              <Link className={`desktop-only ${currentPath === '/household' ? 'active' : ''}`} to="/household">Household</Link>
              <Link className={`desktop-only ${currentPath === '/logout' ? 'active' : ''}`} to="/logout">Logout</Link>
            </>
          )}

          <ThemeToggle theme={theme} onChange={chooseTheme} />

          <div className={`icon-hamburger trigger-menu ${isMenuActive ? 'menu-active' : ''}`}>
				    <span></span>
			    </div>
        </nav>
      </div>

      <div className={`site-responsive-menu ${isMenuActive ? 'menu-active' : ''}`}>
        <nav className="nav-links flex gap-20">
          <div className="link-wrap">
            <Link className={currentPath === '/' ? 'active' : ''} to="/">Home</Link>
          </div>

          <div className="link-wrap">
            <Link className={currentPath === '/household' ? 'active' : ''} to="/household">Household</Link>
          </div>

          {!isLoggedIn ? (
            <>
              <div className="link-wrap">
                <Link className={currentPath === '/login' ? 'active' : ''} to="/login">Login</Link>
              </div>

              <div className="link-wrap">
                <Link className={currentPath === '/registration' ? 'active' : ''} to="/registration">Registration</Link>
              </div>
            </>
          ) : (
            <>
              <div className="link-wrap">
                <Link className={currentPath === '/logout' ? 'active' : ''} to="/logout">Logout</Link>
              </div>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
