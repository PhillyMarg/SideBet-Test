"use client";

interface FilterTabsProps {
  selected: string;
  onSelect: (filter: string) => void;
}

export function FilterTabs({ selected, onSelect }: FilterTabsProps) {
  const filters = ["ALL", "OPEN", "MY PICKS", "PENDING", "SOON", "H2H"];

  return (
    <div
      style={{
        backgroundColor: "#0a0a0a",
        padding: "0 16px",
      }}
    >
      <div
        className="pills-scroll"
        style={{
          display: "flex",
          gap: "10px",
          overflowX: "auto",
          overflowY: "hidden",
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
          padding: "8px 0",
        }}
      >
        {filters.map((filter) => {
          const isSelected = selected === filter;
          const isH2H = filter === "H2H";

          // H2H uses purple (#A855F7), others use orange (#FF6B35)
          const selectedColor = isH2H ? "#A855F7" : "#FF6B35";

          return (
            <button
              key={filter}
              onClick={() => onSelect(filter)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: isSelected ? `2px solid ${selectedColor}` : "2px solid transparent",
                backgroundColor: "transparent",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: isSelected ? selectedColor : "#FFFFFF",
                  fontFamily: "'Montserrat', sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                {filter}
              </span>
            </button>
          );
        })}
      </div>
      <style jsx>{`
        .pills-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

export default FilterTabs;
