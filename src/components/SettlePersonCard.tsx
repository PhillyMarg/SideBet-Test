'use client';

import React from 'react';

interface SettlePersonCardProps {
  person: any;
  onClick?: () => void;
}

export default function SettlePersonCard({ person, onClick }: SettlePersonCardProps) {
  return (
    <div onClick={onClick} className="cursor-pointer">
      {/* Placeholder component - needs implementation */}
      <div className="p-4 bg-zinc-800 rounded-lg">
        <p className="text-white">Person Card</p>
      </div>
    </div>
  );
}
