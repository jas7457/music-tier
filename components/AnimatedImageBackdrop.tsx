import { twMerge } from "tailwind-merge";

export function AnimatedImageBackdrop({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="absolute inset-0 -z-10">
      <div
        className={twMerge(
          "absolute inset-[-20%] bg-cover bg-center animate-[subtle-zoom_20s_ease-in-out_infinite]"
        )}
        style={{
          backgroundImage: `url(${imageUrl})`,
          filter: "blur(40px)",
        }}
      />
      <div className="absolute inset-0 bg-black/60" />
    </div>
  );
}
