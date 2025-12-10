"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface HorizontalCarouselProps<T> {
  items: T[];
  isActive: boolean;
  renderItem: (item: T, index: number, isItemActive: boolean) => ReactNode;
  buttonPosition?: "center" | "bottom";
  className?: string;
  onItemChange?: (newIndex: number) => void;
}

export function HorizontalCarousel<T>({
  items,
  isActive,
  renderItem,
  buttonPosition = "center",
  className,
  onItemChange,
}: HorizontalCarouselProps<T>) {
  const [currentIndex, setCurrentIndex] = useState<number | undefined>(
    isActive ? 0 : undefined
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const onItemChangeRef = useRef(onItemChange);
  // eslint-disable-next-line react-hooks/refs
  onItemChangeRef.current = onItemChange;
  useEffect(() => {
    if (currentIndex === undefined) {
      return;
    }
    onItemChangeRef.current?.(currentIndex);
  }, [currentIndex]);

  // IntersectionObserver to detect active item
  useEffect(() => {
    if (!isActive || !containerRef.current || !items || items.length === 0)
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const index = Number(entry.target.getAttribute("data-index"));
            setCurrentIndex(index);
          }
        });
      },
      {
        root: containerRef.current,
        threshold: 0.5,
      }
    );

    itemRefs.current.forEach((item) => {
      if (item) observer.observe(item);
    });

    return () => observer.disconnect();
  }, [isActive, items]);

  if (!items || items.length === 0) {
    return null;
  }

  const isAtStart = currentIndex === 0;
  const isAtEnd = currentIndex === items.length - 1;

  const handlePrevious = () => {
    if (currentIndex === undefined) {
      return;
    }
    if (!isAtStart && containerRef.current) {
      containerRef.current.scrollTo({
        left: (currentIndex - 1) * window.innerWidth,
        behavior: "smooth",
      });
    }
  };

  const handleNext = () => {
    if (currentIndex === undefined) {
      return;
    }
    if (!isAtEnd && containerRef.current) {
      containerRef.current.scrollTo({
        left: (currentIndex + 1) * window.innerWidth,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className={twMerge("relative h-full", className)}>
      {/* Horizontal scroll container */}
      <div
        ref={containerRef}
        className="h-full overflow-x-scroll snap-x snap-mandatory"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div className="flex h-full">
          {items.map((item, index) => (
            <div
              key={index}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              data-index={index}
              className="w-screen h-full shrink-0 snap-center snap-always"
            >
              {renderItem(item, index, currentIndex === index)}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div
        className={twMerge(
          "absolute inset-x-0 flex justify-between items-center px-4 pointer-events-none z-10",
          buttonPosition === "center" && "top-1/2 -translate-y-1/2",
          buttonPosition === "bottom" && "bottom-20"
        )}
      >
        <button
          onClick={handlePrevious}
          disabled={isAtStart}
          className={twMerge(
            "pointer-events-auto bg-white/10 backdrop-blur-sm text-white rounded-full p-4 transition-all duration-300 border border-white/80",
            !isActive && "opacity-0",
            isActive && !isAtStart && "opacity-100 delay-600 hover:bg-white/20",
            isActive && isAtStart && "opacity-30 delay-600 cursor-not-allowed"
          )}
          aria-label="Previous item"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <button
          onClick={handleNext}
          disabled={isAtEnd}
          className={twMerge(
            "pointer-events-auto bg-white/10 backdrop-blur-sm text-white rounded-full p-4 transition-all duration-300 border border-white/80",
            !isActive && "opacity-0",
            isActive && !isAtEnd && "opacity-100 delay-600 hover:bg-white/20",
            isActive && isAtEnd && "opacity-30 delay-600 cursor-not-allowed"
          )}
          aria-label="Next item"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
