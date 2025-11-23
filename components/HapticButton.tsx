"use client";

import { useState } from "react";
import { twMerge } from "tailwind-merge";

interface HapticButtonProps
  extends Pick<
    JSX.IntrinsicElements["button"],
    "className" | "children" | "onClick" | "disabled" | "title" | "type"
  > {}

export function HapticButton({
  children,
  className,
  ...rest
}: HapticButtonProps &
  Pick<JSX.IntrinsicElements["button"], "className" | "children" | "onClick">) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <button
      {...rest}
      className={twMerge(
        "duration-150 ease-out active:scale-95",
        isPressed && "scale-95 opacity-90",
        className,
        "transition-all"
      )}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
    >
      {children}
    </button>
  );
}
