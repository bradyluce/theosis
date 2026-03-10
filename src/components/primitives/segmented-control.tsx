"use client";

import { cn } from "@/lib/utils";

type SegmentedControlItem = {
  value: string;
  label: string;
  caption?: string;
};

type SegmentedControlProps = {
  items: SegmentedControlItem[];
  value: string;
  onChange: (value: string) => void;
};

export function SegmentedControl({
  items,
  value,
  onChange,
}: SegmentedControlProps) {
  return (
    <div className="inline-flex rounded-[12px] border border-line bg-surface p-1">
      {items.map((item) => {
        const isActive = item.value === value;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "inline-flex min-w-[88px] flex-col items-center justify-center rounded-[8px] px-3 py-2 text-center transition-colors duration-200",
              isActive ? "bg-surface-strong text-ink" : "text-ink-soft hover:text-ink",
            )}
          >
            <span className="text-xs font-medium tracking-[0.08em]">{item.label}</span>
            {item.caption ? (
              <span className="mt-0.5 text-[0.65rem] uppercase tracking-[0.16em]">
                {item.caption}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
