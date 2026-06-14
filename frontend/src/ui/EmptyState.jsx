import React from "react";
import PillButton from "./PillButton";

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-[#F5F5F5] flex items-center justify-center text-gray-400 mb-4">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <div className="text-[#111] font-semibold text-lg mb-1">{title}</div>
      {description && <div className="text-gray-500 text-sm mb-6 max-w-sm">{description}</div>}
      {actionLabel && onAction && (
        <PillButton onClick={onAction}>
          {actionLabel}
        </PillButton>
      )}
    </div>
  );
}
