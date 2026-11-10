import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Scroll Hook - Header scroll effects
export const useScroll = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 1);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return isScrolled;
};


// Header Current Menu Item
export const useCurrentMenuItem = () => {
  const location = useLocation();
  return location.pathname;
}

// Hamburger Hook - Toggle responsive menu
export const useHamburger = () => {
  const [isMenuActive, setIsMenuActive] = useState(false);

  useEffect(() => {
    const iconHamburger = document.querySelector('.icon-hamburger');

    const handleClick = () => {
      setIsMenuActive(prev => !prev);
    };

    if(iconHamburger) {
      iconHamburger.addEventListener('click', handleClick);
    }

    return () => {
      if(iconHamburger) {
        iconHamburger.removeEventListener('click', handleClick);
      }
    };
  }, []);

  useEffect(() => {
    const siteResponsiveMenu = document.querySelector('.site-responsive-menu');

    if(isMenuActive) {
      if(siteResponsiveMenu) {
        siteResponsiveMenu.classList.add('menu-active');
      }

      document.body.classList.add('menu-active');

    } else {
      if(siteResponsiveMenu) {
        siteResponsiveMenu.classList.remove('menu-active');
      }

      document.body.classList.remove('menu-active');
    }
  }, [isMenuActive]);

  return isMenuActive;
};