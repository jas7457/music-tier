"use client";

import {
  useState,
  useEffect,
  useRef,
  ReactNode,
  createContext,
  useMemo,
} from "react";
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
  const [previousIndex, setPreviousIndex] = useState<number | undefined>(
    undefined
  );
  const [shouldShowButtons, setShouldShowButtons] = useState(true);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
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

  // Keyboard navigation for horizontal carousel
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentIndex === undefined) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          if (currentIndex > 0 && containerRef.current) {
            containerRef.current.scrollTo({
              left: (currentIndex - 1) * window.innerWidth,
              behavior: "smooth",
            });
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (currentIndex < items.length - 1 && containerRef.current) {
            containerRef.current.scrollTo({
              left: (currentIndex + 1) * window.innerWidth,
              behavior: "smooth",
            });
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isActive, currentIndex, items.length]);

  // IntersectionObserver to detect active item
  useEffect(() => {
    if (!isActive || !containerRef.current || !items || items.length === 0)
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const index = Number(entry.target.getAttribute("data-index"));
            setCurrentIndex((prev) => {
              if (prev !== undefined && prev !== index) {
                setPreviousIndex(prev);
                setDirection(index > prev ? "forward" : "backward");
              }
              return index;
            });
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
    <CarouselContextProvider onShowButtonsChange={setShouldShowButtons}>
      <div className={twMerge("relative h-full", className)}>
        {/* Page Counter */}
        {isActive && currentIndex !== undefined && (
          <div className="absolute top-4 left-4 z-20 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20">
            <div className="flex items-center gap-1 text-white font-semibold">
              <div
                className="relative inline-block overflow-hidden"
                style={{
                  width: `${(currentIndex + 1).toString().length}ch`,
                  height: "1.2em",
                }}
              >
                {/* Previous number sliding out */}
                {previousIndex !== undefined &&
                  previousIndex !== currentIndex && (
                    <span
                      key={`prev-${previousIndex}`}
                      className="absolute top-0 left-0 tabular-nums w-full h-full flex justify-end items-center pointer-events-none"
                      style={{
                        animation:
                          direction === "forward"
                            ? "slideUpOut 400ms ease-out forwards"
                            : "slideDown 400ms ease-out forwards",
                      }}
                    >
                      {previousIndex + 1}
                    </span>
                  )}
                {/* Current number sliding in */}
                <span
                  key={currentIndex}
                  className="absolute top-0 left-0 tabular-nums w-full h-full flex justify-end items-center pointer-events-none"
                  style={{
                    animation:
                      previousIndex !== undefined &&
                      previousIndex !== currentIndex
                        ? direction === "forward"
                          ? "slideUp 400ms ease-out forwards"
                          : "slideDownIn 400ms ease-out forwards"
                        : "none",
                  }}
                >
                  {currentIndex + 1}
                </span>
              </div>
              <span className="text-white/60">/</span>
              <span className="text-white/80 tabular-nums">{items.length}</span>
            </div>
          </div>
        )}

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
                style={{
                  contentVisibility: "auto",
                  containIntrinsicSize: "100vw 100vh",
                }}
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
              isActive &&
                !isAtStart &&
                "opacity-100 delay-600 hover:bg-white/20",
              isActive &&
                isAtStart &&
                "opacity-30 delay-600 cursor-not-allowed",
              shouldShowButtons ? "" : "opacity-0"
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
              isActive && isAtEnd && "opacity-30 delay-600 cursor-not-allowed",
              shouldShowButtons ? "" : "opacity-0"
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

        {/* Animation styles */}
        <style jsx>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(16px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes slideDown {
            from {
              opacity: 1;
              transform: translateY(0);
            }
            to {
              opacity: 0;
              transform: translateY(16px);
            }
          }
          @keyframes slideUpOut {
            from {
              opacity: 1;
              transform: translateY(0);
            }
            to {
              opacity: 0;
              transform: translateY(-16px);
            }
          }
          @keyframes slideDownIn {
            from {
              opacity: 0;
              transform: translateY(-16px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </CarouselContextProvider>
  );
}

interface CarouselContext {
  showButtons: (shouldShow: boolean) => void;
}

export const CarouselContext = createContext<CarouselContext>({
  showButtons: () => {},
});

export function CarouselContextProvider({
  children,
  onShowButtonsChange,
}: {
  children: ReactNode;
  onShowButtonsChange?: (shouldShow: boolean) => void;
}) {
  const showButtonsRef = useRef(onShowButtonsChange);
  // eslint-disable-next-line react-hooks/refs
  showButtonsRef.current = onShowButtonsChange;

  const value = useMemo(() => {
    return {
      showButtons: (shouldShow: boolean) => {
        showButtonsRef.current?.(shouldShow);
      },
    };
  }, []);

  return (
    <CarouselContext.Provider value={value}>
      {children}
    </CarouselContext.Provider>
  );
}
