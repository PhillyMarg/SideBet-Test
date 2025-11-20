"use client";

import { ReactNode } from "react";

interface SectionTitleProps {
  children: ReactNode;
}

export function SectionTitle({ children }: SectionTitleProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "12px 16px",
        backgroundColor: "#000000",
        borderTop: "1px solid #27272A",
        borderBottom: "1px solid #27272A",
      }}
    >
      <h2
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: "700",
          fontSize: "14px",
          color: "#FFFFFF",
          letterSpacing: "2px",
          textTransform: "uppercase",
          margin: "0",
        }}
      >
        {children}
      </h2>
    </div>
  );
}

export default SectionTitle;
