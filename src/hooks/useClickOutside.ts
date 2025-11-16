import { useEffect, RefObject } from 'react';

/**
 * Hook that triggers a callback when user clicks outside the referenced element
 * Useful for closing modals, dropdowns, etc.
 *
 * @param ref - React ref to the element
 * @param handler - Callback function to execute on outside click
 *
 * @example
 * const modalRef = useRef<HTMLDivElement>(null);
 * useClickOutside(modalRef, () => setShowModal(false));
 *
 * return <div ref={modalRef}>Modal content</div>;
 */
export function useClickOutside(
  ref: RefObject<HTMLElement>,
  handler: (event: MouseEvent | TouchEvent) => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}
