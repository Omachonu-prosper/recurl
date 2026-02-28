import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Custom hook for resizable panels. Uses pixel values and mouse events.
 *
 * @param initialSize - starting size in pixels
 * @param minSize - minimum size in pixels
 * @param maxSize - maximum size in pixels (can be updated dynamically)
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

  // Keep maxSize in a ref so drag handler always reads the latest value
  const maxRef = useRef(maxSize);
  maxRef.current = maxSize;

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      startPos.current = direction === "horizontal" ? e.clientX : e.clientY;
      startSize.current = Math.max(minSize, Math.min(size, maxRef.current));
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
      // Always read the latest max from the ref
      const clampedMax = maxRef.current;
      const newSize = Math.min(clampedMax, Math.max(minSize, startSize.current + delta));
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
  }, [direction, minSize]);

  return { size, setSize, startResize };
}
