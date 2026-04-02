"use client";

import { SectorDef } from "@/types/signaldesk";

interface SectorPillsProps {
  sectors: SectorDef[];
  activeSectorId: string;
  onSelect: (sectorId: string) => void;
}

export default function SectorPills({ sectors, activeSectorId, onSelect }: SectorPillsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {sectors.map((sector) => {
        const isActive = sector.id === activeSectorId;
        return (
          <button
            key={sector.id}
            type="button"
            onClick={() => onSelect(sector.id)}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "border-[#0F6E56] bg-[#0F6E56] text-[#E1F5EE]"
                : "border-gray-200 bg-white text-gray-700 hover:border-[var(--green)] hover:text-[var(--green)]"
            }`}
          >
            {sector.label}
          </button>
        );
      })}
    </div>
  );
}
