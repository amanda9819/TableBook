"use client";

import { cn } from "@/lib/utils";

type Tab = {
  key: string;
  label: string;
};

type TabBarProps = {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
};

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="flex w-full rounded-lg bg-muted p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
            activeTab === tab.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
