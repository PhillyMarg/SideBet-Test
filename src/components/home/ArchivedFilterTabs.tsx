"use client";

import { ScrollableNav } from '../ui/ScrollableNav';

interface ArchivedFilterTabsProps {
  selected: string;
  onSelect: (filter: string) => void;
}

export function ArchivedFilterTabs({ selected, onSelect }: ArchivedFilterTabsProps) {
  const filters = ['ALL', 'WON', 'LOST', 'H2H'];

  return (
    <div
      style={{
        backgroundColor: "#0a0a0a",
        padding: "0 16px",
      }}
    >
      <ScrollableNav className="py-2">
        <div className="flex items-center gap-2.5">
          {filters.map(filter => {
            const isSelected = selected === filter;
            const isH2H = filter === 'H2H';
            const isWon = filter === 'WON';
            const isLost = filter === 'LOST';

            // Determine colors based on filter type
            let selectedColor = 'border-[#ff6b35] text-[#ff6b35]';  // Default orange for ALL
            if (isH2H && isSelected) {
              selectedColor = 'border-purple-500 text-purple-500';  // H2H purple
            } else if (isWon && isSelected) {
              selectedColor = 'border-[#0abf00] text-[#0abf00]';  // Won green
            } else if (isLost && isSelected) {
              selectedColor = 'border-[#c21717] text-[#c21717]';  // Lost red
            }

            return (
              <button
                key={filter}
                onClick={() => onSelect(filter)}
                className={`
                  flex-shrink-0 px-3 py-0.5 rounded-lg
                  font-montserrat font-semibold text-[12px] text-center whitespace-nowrap
                  transition-all border-2 bg-transparent cursor-pointer
                  ${isSelected
                    ? selectedColor
                    : 'text-white border-transparent'
                  }
                `}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </ScrollableNav>
    </div>
  );
}

export default ArchivedFilterTabs;
