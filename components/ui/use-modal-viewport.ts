'use client';

import { useEffect, useRef } from 'react';

const modalStack: symbol[] = [];
let bodyLockCount = 0;
let bodyOverflow = '';

export function useModalViewport(onClose: () => void, blocked = false) {
  const closeRef = useRef(onClose);
  const blockedRef = useRef(blocked);

  useEffect(() => {
    closeRef.current = onClose;
    blockedRef.current = blocked;
  });

  useEffect(() => {
    const owner = Symbol('modal');
    modalStack.push(owner);
    if (bodyLockCount === 0) bodyOverflow = document.body.style.overflow;
    bodyLockCount += 1;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modalStack.at(-1) === owner && !blockedRef.current) closeRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      const ownerIndex = modalStack.lastIndexOf(owner);
      if (ownerIndex >= 0) modalStack.splice(ownerIndex, 1);
      bodyLockCount = Math.max(0, bodyLockCount - 1);
      document.body.style.overflow = bodyLockCount ? 'hidden' : bodyOverflow;
    };
  }, []);
}
