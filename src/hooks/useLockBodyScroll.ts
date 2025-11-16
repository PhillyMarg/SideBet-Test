import { useEffect } from 'react';

/**
 * Locks body scroll when a modal is open
 * Prevents background scrolling on mobile devices
 *
 * @param lock - Whether to lock the scroll (typically tied to modal open state)
 *
 * @example
 * const [isModalOpen, setIsModalOpen] = useState(false);
 * useLockBodyScroll(isModalOpen);
 */
export function useLockBodyScroll(lock: boolean = true) {
  useEffect(() => {
    if (!lock) return;

    // Save original styles
    const originalStyle = window.getComputedStyle(document.body).overflow;
    const originalPosition = window.getComputedStyle(document.body).position;
    const originalTop = window.getComputedStyle(document.body).top;
    const scrollY = window.scrollY;

    // Lock scroll
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    // Cleanup function
    return () => {
      // Restore original styles
      document.body.style.overflow = originalStyle;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = '';

      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, [lock]);
}
