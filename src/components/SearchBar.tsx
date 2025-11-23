"use client";

import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search bets...",
}: SearchBarProps) {
  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search bets"
        className="w-full pl-10 pr-10 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-orange-500 transition-colors"
      />

      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-zinc-800 rounded-full p-2 min-w-[36px] min-h-[36px] flex items-center justify-center transition-all active:scale-95"
        >
          <X className="w-4 h-4 text-zinc-400 hover:text-white" />
        </button>
      )}
    </div>
  );
}
