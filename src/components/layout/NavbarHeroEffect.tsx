'use client';

import { useEffect } from 'react';

/**
 * 히어로 섹션이 보일 때 navbar를 dark(navbar-hero),
 * 스크롤 후 히어로 아래로 내려가면 navbar-scrolled 클래스를 추가.
 */
export function NavbarHeroEffect() {
  useEffect(() => {
    const navbar = document.querySelector('.navbar') as HTMLElement | null;
    if (!navbar) return;

    navbar.classList.add('navbar-hero');

    const handleScroll = () => {
      if (window.scrollY > 500) {
        navbar.classList.add('navbar-scrolled');
      } else {
        navbar.classList.remove('navbar-scrolled');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      navbar.classList.remove('navbar-hero', 'navbar-scrolled');
    };
  }, []);

  return null;
}
