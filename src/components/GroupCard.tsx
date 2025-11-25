"use client";

import { useRouter } from 'next/navigation';

interface GroupCardProps {
  group: {
    id: string;
    name: string;
    settings?: {
      min_bet: number;
      max_bet: number;
    };
    memberIds: string[];
    activeBetsCount?: number;
  };
}

export default function GroupCard({ group }: GroupCardProps) {
  const router = useRouter();

  // Get active bets count (defaulting to 0 if not provided)
  const activeBetsCount = group.activeBetsCount || 0;

  const handleClick = () => {
    router.push(`/groups/${group.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="
        bg-black/25
        border-2 border-[#ff6b35]
        shadow-[2px_2px_4px_0px_#ff6b35]
        rounded-md
        p-3
        flex flex-col gap-1
        cursor-pointer
        hover:bg-black/30
        transition-all
      "
    >
      {/* Row 1 - Top Row: Wager Limit and Active Bets */}
      <div className="flex items-center justify-between w-full">
        <p className="text-[#ff6b35] text-[8px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
          Wager Limit: ${group.settings?.min_bet || 0} - ${group.settings?.max_bet || 0}
        </p>
        <p className="text-[#ff6b35] text-[8px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
          {activeBetsCount} Active Bets
        </p>
      </div>

      {/* Row 2 - Group Name */}
      <div className="flex items-center w-full">
        <p className="text-white text-[12px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px] uppercase truncate">
          {group.name}
        </p>
      </div>

      {/* Row 3 - Member Count */}
      <div className="flex items-center w-full h-[12px]">
        <p className="text-[#ff6b35] text-[10px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
          {group.memberIds.length} Players
        </p>
      </div>
    </div>
  );
}
