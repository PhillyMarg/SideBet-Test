"use client";

import { ScrollableNav } from '../ui/ScrollableNav';

interface FilterTabsProps {
  selected: string;
  onSelect: (filter: string) => void;
}

export function FilterTabs({ selected, onSelect }: FilterTabsProps) {
  const filters = ['ALL', 'OPEN', 'MY PICKS', 'PENDING', 'SOON', 'H2H'];

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

            // H2H uses purple, others use orange
            const selectedColor = isH2H
              ? 'border-purple-500 text-purple-500'
              : 'border-[#ff6b35] text-[#ff6b35]';

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

export default FilterTabs;
