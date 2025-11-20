"use client";

import { ChevronDown, ChevronUp } from 'lucide-react';

interface SeeMoreButtonProps {
  expanded: boolean;
  onClick: () => void;
  hasMore: boolean;  // Are there more items to show?
}

export function SeeMoreButton({ expanded, onClick, hasMore }: SeeMoreButtonProps) {
  // Hide if no more items and not expanded
  if (!hasMore && !expanded) return null;

  return (
    <button
      onClick={onClick}
      className="
        w-full flex items-center justify-center gap-2
        py-2.5 px-4
        bg-[#0a0a0a]
        border-t border-b border-[#FF6B35]
        hover:bg-zinc-900
        transition-colors
        cursor-pointer
      "
      style={{
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      {expanded ? (
        <ChevronUp size={16} className="text-[#FF6B35]" />
      ) : (
        <ChevronDown size={16} className="text-[#FF6B35]" />
      )}
      <span
        className="text-[14px] font-bold text-[#FF6B35]"
        style={{
          letterSpacing: '2.1px',
        }}
      >
        {expanded ? 'SEE LESS' : 'SEE MORE'}
      </span>
      {expanded ? (
        <ChevronUp size={16} className="text-[#FF6B35]" />
      ) : (
        <ChevronDown size={16} className="text-[#FF6B35]" />
      )}
    </button>
  );
}

export default SeeMoreButton;
