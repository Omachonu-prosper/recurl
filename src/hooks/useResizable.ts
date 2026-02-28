import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Custom hook for resizable panels. Uses pixel values and mouse events.
 * No third-party library needed.
 * 
 * @param initialSize - starting size in pixels
 * @param minSize - minimum size in pixels
 * @param maxSize - maximum size in pixels
 * @param direction - "horizontal" (width) or "vertical" (height)
 */
export function useResizable(
  initialSize: number,
  minSize: number,
  maxSize: number,
  direction: "horizontal" | "vertical" = "horizontal"
) {
  const [size, setSize] = useState(initialSize);
  const isResizing = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(0);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      startPos.current = direction === "horizontal" ? e.clientX : e.clientY;
      startSize.current = size;
      document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    },
    [size, direction]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const currentPos = direction === "horizontal" ? e.clientX : e.clientY;
      const delta = currentPos - startPos.current;
      const newSize = Math.min(maxSize, Math.max(minSize, startSize.current + delta));
      setSize(newSize);
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [direction, minSize, maxSize]);

  return { size, setSize, startResize };
}
