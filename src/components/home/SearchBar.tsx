"use client";

import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = "Search Bets..." }: SearchBarProps) {
  return (
    <div className="px-6 py-2" style={{ backgroundColor: "#0a0a0a" }}>
      <div className="bg-[#1e1e1e] rounded-md px-3 py-2 flex items-center gap-2 h-10">
        <Search className="w-4 h-4 text-[#ff6b35] flex-shrink-0" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="
            flex-1 bg-transparent border-none outline-none
            text-[#b3b3b3] placeholder:text-[#b3b3b3]
            font-montserrat font-semibold text-[12px]
          "
        />
      </div>
    </div>
  );
}

export default SearchBar;
