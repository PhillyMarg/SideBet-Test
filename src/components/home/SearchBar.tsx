"use client";

import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = "Search Bets..." }: SearchBarProps) {
  return (
    <div
      style={{
        padding: "12px 16px",
        backgroundColor: "#0a0a0a",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
        }}
      >
        <Search
          size={16}
          style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#FF6B35",
          }}
        />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            backgroundColor: "#000000",
            border: "1px solid #27272A",
            borderRadius: "8px",
            paddingLeft: "40px",
            paddingRight: "16px",
            paddingTop: "10px",
            paddingBottom: "10px",
            color: "#FFFFFF",
            fontSize: "12px",
            fontWeight: "500",
            fontFamily: "'Montserrat', sans-serif",
            outline: "none",
          }}
          className="search-input"
        />
      </div>
      <style jsx>{`
        .search-input::placeholder {
          color: #71717A;
        }
        .search-input:focus {
          border-color: #FF6B35;
        }
      `}</style>
    </div>
  );
}

export default SearchBar;
