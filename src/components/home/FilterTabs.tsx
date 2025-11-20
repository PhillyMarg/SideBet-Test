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
        display: "flex",
        padding: "0 16px",
        backgroundColor: "#000000",
        overflow: "hidden",
      }}
    >
      <div
        className="pills-scroll"
        style={{
          display: "flex",
          gap: "8px",
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
          return (
            <button
              key={filter}
              onClick={() => onSelect(filter)}
              className="relative"
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "2px dashed #A855F7",
                backgroundColor: "transparent",
                cursor: "pointer",
                flexShrink: 0,
                position: "relative",
              }}
            >
              {/* Inner border for selected state */}
              {isSelected && (
                <div
                  style={{
                    position: "absolute",
                    inset: "3px",
                    border: "2px solid #FF6B35",
                    borderRadius: "4px",
                    pointerEvents: "none",
                  }}
                />
              )}
              <span
                style={{
                  position: "relative",
                  zIndex: 10,
                  fontSize: "12px",
                  fontWeight: "600",
                  color: isSelected ? "#FF6B35" : "#FFFFFF",
                  fontFamily: "'Montserrat', sans-serif",
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
