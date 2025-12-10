export function Screen({
  background,
  children,
}: {
  background: { from: string; via: string; to: string };
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Base gradient layer */}
        <div
          className="absolute inset-0 transition-all duration-1000 ease-in-out"
          style={{
            background: `linear-gradient(135deg, ${background.from}, ${background.to})`,
          }}
        />
        {/* Blob 1 */}
        <div
          className="absolute w-[800px] h-[800px] -top-40 -left-40 opacity-50 blur-3xl transition-colors duration-1000"
          style={{
            background: `radial-gradient(circle, ${background.via} 0%, transparent 70%)`,
            animation: "gradient-swirl-1 12s ease-in-out infinite",
          }}
        />
        {/* Blob 2 */}
        <div
          className="absolute w-[600px] h-[600px] top-1/2 right-0 opacity-40 blur-3xl transition-colors duration-1000"
          style={{
            background: `radial-gradient(circle, ${background.from} 0%, transparent 70%)`,
            animation: "gradient-swirl-2 15s ease-in-out infinite",
          }}
        />
        {/* Blob 3 */}
        <div
          className="absolute w-[700px] h-[700px] bottom-0 left-1/4 opacity-30 blur-3xl transition-colors duration-1000"
          style={{
            background: `radial-gradient(circle, ${background.to} 0%, transparent 70%)`,
            animation: "gradient-swirl-3 18s ease-in-out infinite",
          }}
        />
      </div>
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
