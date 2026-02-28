import React from "react";

interface ResizeHandleProps {
  direction: "horizontal" | "vertical";
  onMouseDown: (e: React.MouseEvent) => void;
}

export function ResizeHandle({ direction, onMouseDown }: ResizeHandleProps) {
  const isHorizontal = direction === "horizontal";

  return (
    <div
      onMouseDown={onMouseDown}
      className={`
        ${isHorizontal ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize"}
        bg-slate-800 hover:bg-orange-500 active:bg-orange-600 transition-colors shrink-0 relative z-20
      `}
    />
  );
}
