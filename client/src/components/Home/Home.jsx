import AOS from 'aos';
import 'aos/dist/aos.css';
import { useEffect, useState } from 'react';
import './Home.css';
import HomeOpen from './HomeOpen.jsx';
import HomeStory from './HomeStory.jsx';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
      AOS.init();
    };
  }, []);

  return(
    <>
      <div className="App">
        <div className="App-body home">
          <div className="dotted-bg" aria-hidden="true" />
          <HomeOpen isLoggedIn={isLoggedIn} />
          <HomeStory isLoggedIn={isLoggedIn} />
        </div>
      </div>
    </>
  );
}
