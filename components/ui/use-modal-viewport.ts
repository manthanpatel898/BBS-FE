'use client';

import { useEffect, useRef } from 'react';

export function useModalViewport(onClose: () => void, blocked = false) {
  const closeRef = useRef(onClose);
  const blockedRef = useRef(blocked);

  useEffect(() => {
    closeRef.current = onClose;
    blockedRef.current = blocked;
  });

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !blockedRef.current) closeRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, []);
}
