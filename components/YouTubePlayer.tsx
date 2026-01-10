import { twMerge } from "tailwind-merge";

export function YouTubePlayer({
  youtubeId,
  className,
}: {
  youtubeId: string | null;
  className?: string;
}) {
  if (!youtubeId) {
    return null;
  }

  return (
    <div className={twMerge("aspect-video", className)}>
      <iframe
        width="100%"
        height="100%"
        src={`https://www.youtube.com/embed/${youtubeId}`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      ></iframe>
    </div>
  );
}

export function getYouTubeIdFromUrl(youtubeURL: string): string | null {
  if (!youtubeURL) {
    return null;
  }

  const parts = /youtu\.be\/([^/\?]+)/.exec(youtubeURL);
  if (parts && parts[1]) {
    return parts[1];
  }

  try {
    const url = new URL(youtubeURL);
    return url.searchParams.get("v");
  } catch {
    return null;
  }
}
