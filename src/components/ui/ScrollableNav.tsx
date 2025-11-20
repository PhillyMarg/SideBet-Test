"use client";

import { ReactNode } from 'react';

interface ScrollableNavProps {
  children: ReactNode;
  className?: string;
}

export function ScrollableNav({ children, className = '' }: ScrollableNavProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Scrollable content */}
      <div className="overflow-x-auto scrollbar-hide">
        {children}
      </div>

      {/* Right gradient overlay - indicates more content */}
      <div
        className="absolute top-0 right-0 h-full w-16 pointer-events-none"
        style={{
          background: 'linear-gradient(to left, #0a0a0a 0%, transparent 100%)'
        }}
      />
    </div>
  );
}

export default ScrollableNav;
