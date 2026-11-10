import React, { useEffect } from 'react';
import { useScroll } from '../hooks/useCustomHooks';

// Component for managing all the effects
const EffectsManager = ({ children }) => {
  // Initialize all hooks
  const isScrolled = useScroll();

  // Update header class based on scroll
  useEffect(() => {
    const header = document.querySelector('header');

    if(header) {
      if(isScrolled) {
        header.classList.add('scroll-active');

      } else {
        header.classList.remove('scroll-active');
      }
    }
  }, [isScrolled]);

  return (
    <>
      {children}
    </>
  );
};

export default EffectsManager;