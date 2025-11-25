"use client";

import { ScrollableNav } from '../ui/ScrollableNav';

interface FilterTabsProps {
  selected: string;
  onSelect: (filter: string) => void;
}

export function FilterTabs({ selected, onSelect }: FilterTabsProps) {
  const filters = ['ALL', 'OPEN', 'MY PICKS', 'PENDING', 'SOON'];

  return (
    <div className="flex gap-2 px-6 py-2 overflow-x-auto scrollbar-hide" style={{ backgroundColor: "#0a0a0a" }}>
      {filters.map((filter) => {
        const isSelected = selected === filter;

        return (
          <button
            key={filter}
            onClick={() => onSelect(filter)}
            className={`
              px-4 py-1 rounded-md font-montserrat font-semibold text-[10px] whitespace-nowrap h-8
              border-2 border-[#ff6b35] transition-all flex-shrink-0
              ${isSelected
                ? 'bg-[#ff6b35] text-white'
                : 'bg-transparent text-white hover:bg-[#ff6b35]/10'
              }
            `}
          >
            {filter}
          </button>
        );
      })}
    </div>
  );
}

export default FilterTabs;
