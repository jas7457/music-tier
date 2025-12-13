import { twMerge } from "tailwind-merge";

export function AnimatedImageBackdrop({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="absolute inset-0">
      <div
        className={twMerge(
          "absolute inset-[-20%] bg-cover bg-center animate-[subtle-zoom_20s_ease-in-out_infinite] bg-no-repeat"
        )}
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,.6), rgba(0,0,0,.6)), url(${imageUrl})`,
          filter: "blur(40px)",
        }}
      />
    </div>
  );
}
