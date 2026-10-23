'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PopulatedLeague, PopulatedUser } from '@/lib/types';
import { ConfirmUploadButton } from './UploadThing';
import { useToast } from '@/lib/ToastContext';
import { useData } from '@/lib/DataContext';
import { HapticButton } from './HapticButton';
import { Portal } from './Portal';

/**
 * The league's cover photo: tap to view full screen (pinch to zoom), and for
 * the member who owns it, upload / replace it and pick its focal point.
 * Renders nothing when there's no photo and you can't add one.
 */
export function LeagueHero({
  league,
  user,
  className = 'relative h-56 md:h-64 overflow-hidden rounded-card bg-surface-sunken ring-1 ring-line shadow-soft',
}: {
  league: PopulatedLeague;
  user: PopulatedUser;
  className?: string;
}) {
  const toast = useToast();
  // refetch so other views of the photo (e.g. the venue wall) update
  const { refreshData } = useData();
  const [leagueImageUrl, setLeagueImageUrl] = useState(league.heroImageUrl);
  const [focalX, setFocalX] = useState(league.heroImageFocalX ?? 50);
  const [focalY, setFocalY] = useState(league.heroImageFocalY ?? 50);
  const [savingFocal, setSavingFocal] = useState(false);
  const [heroStage, setHeroState] = useState<'add' | 'edit' | 'focal'>(
    leagueImageUrl ? 'edit' : 'add',
  );
  const focalImgRef = useRef<HTMLImageElement | null>(null);
  const [markerPosition, setMarkerPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [isImageFullScreen, setIsImageFullScreen] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const [imageTranslate, setImageTranslate] = useState({ x: 0, y: 0 });
  const touchStartRef = useRef<{
    distance: number;
    scale: number;
    x: number;
    y: number;
  } | null>(null);


  // Reset zoom when closing full-screen
  useEffect(() => {
    if (!isImageFullScreen) {
      setImageScale(1);
      setImageTranslate({ x: 0, y: 0 });
    }
  }, [isImageFullScreen]);

  // Close full-screen image on Escape key
  useEffect(() => {
    if (!isImageFullScreen) {
      return;
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsImageFullScreen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isImageFullScreen]);

  const recomputeMarker = useCallback(() => {
    const img = focalImgRef.current;
    if (!img || !img.offsetWidth || !img.offsetHeight) {
      setMarkerPosition(null);
      return;
    }
    setMarkerPosition({
      left: img.offsetLeft + (focalX / 100) * img.offsetWidth,
      top: img.offsetTop + (focalY / 100) * img.offsetHeight,
    });
  }, [focalX, focalY]);

  useEffect(() => {
    if (heroStage !== 'focal') {
      setMarkerPosition(null);
      return;
    }
    recomputeMarker();
    const img = focalImgRef.current;
    if (!img || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => recomputeMarker());
    observer.observe(img);
    return () => observer.disconnect();
  }, [heroStage, recomputeMarker]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY,
      );
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      touchStartRef.current = {
        distance,
        scale: imageScale,
        x: centerX,
        y: centerY,
      };
    } else if (e.touches.length === 1 && imageScale > 1) {
      // Single touch for panning when zoomed
      e.preventDefault();
      const touch = e.touches[0];
      touchStartRef.current = {
        distance: 0,
        scale: imageScale,
        x: touch.clientX - imageTranslate.x,
        y: touch.clientY - imageTranslate.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY,
      );
      const scale =
        (distance / touchStartRef.current.distance) *
        touchStartRef.current.scale;
      // Limit scale between 1x and 5x
      const newScale = Math.min(Math.max(scale, 1), 5);
      setImageScale(newScale);

      // Reset translation when zooming back to 1x
      if (newScale === 1) {
        setImageTranslate({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && imageScale > 1) {
      e.preventDefault();
      const touch = e.touches[0];
      setImageTranslate({
        x: touch.clientX - touchStartRef.current.x,
        y: touch.clientY - touchStartRef.current.y,
      });
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  const handleFocalClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (savingFocal) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const newFocalX = ((e.clientX - rect.left) / rect.width) * 100;
    const newFocalY = ((e.clientY - rect.top) / rect.height) * 100;

    const previousFocalX = focalX;
    const previousFocalY = focalY;
    setFocalX(newFocalX);
    setFocalY(newFocalY);
    setSavingFocal(true);

    try {
      const response = await fetch(
        `/api/leagues/${league._id}/hero-image`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            heroImageFocalX: newFocalX,
            heroImageFocalY: newFocalY,
          }),
        },
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update focal point');
      }
      setHeroState('edit');
      refreshData('manual');
      toast.show({
        variant: 'success',
        message: 'Focal point updated!',
      });
    } catch (error) {
      setFocalX(previousFocalX);
      setFocalY(previousFocalY);
      toast.show({
        variant: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update focal point',
      });
    } finally {
      setSavingFocal(false);
    }
  };

  const heroButtons = (() => {
    if (league.heroImageUserId !== user._id) {
      return null;
    }
    switch (heroStage) {
      case 'add': {
        return (
          <div className="absolute inset-0 flex justify-center items-center">
            <ConfirmUploadButton
              endpoint="imageUploader"
              onCancel={() => {
                setLeagueImageUrl(league.heroImageUrl);
              }}
              onImagePreview={setLeagueImageUrl}
              onUploadComplete={async (url) => {
                try {
                  const response = await fetch(
                    `/api/leagues/${league._id}/hero-image`,
                    {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ heroImageUrl: url }),
                    },
                  );

                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error(
                      error.error || 'Failed to update hero image',
                    );
                  }

                  setLeagueImageUrl(url);
                  // New image resets the focal to center on the server.
                  setFocalX(50);
                  setFocalY(50);
                  setHeroState('edit');
                  refreshData('manual');
                  toast.show({
                    variant: 'success',
                    message: 'Hero image updated successfully!',
                  });
                } catch (error) {
                  console.error('Error updating hero image:', error);
                  toast.show({
                    variant: 'error',
                    message:
                      error instanceof Error
                        ? error.message
                        : 'Failed to update hero image',
                  });
                  // Revert to original image on error
                  setLeagueImageUrl(league.heroImageUrl);
                }
              }}
              onUploadError={(error) => {
                toast.show({
                  variant: 'error',
                  message: `Image upload failed: ${error.message}`,
                });
              }}
            />
          </div>
        );
      }
      case 'edit': {
        return (
          <div className="absolute top-4 right-4 flex gap-2">
            {leagueImageUrl && (
              <HapticButton
                className="p-2 rounded-full bg-black/25 ring-1 ring-white/25 backdrop-blur-md text-white hover:bg-black/40 transition-colors"
                onClick={() => setHeroState('focal')}
                aria-label="Set focal point"
              >
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                  <path strokeLinecap="round" d="M12 3v3M12 18v3M3 12h3M18 12h3" />
                </svg>
              </HapticButton>
            )}
            <HapticButton
              className="p-2 rounded-full bg-black/25 ring-1 ring-white/25 backdrop-blur-md text-white hover:bg-black/40 transition-colors"
              onClick={() => setHeroState('add')}
              aria-label="Change image"
            >
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </HapticButton>
          </div>
        );
      }
      case 'focal': {
        return (
          <HapticButton
            className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/40 ring-1 ring-white/25 backdrop-blur-md hover:bg-black/60 transition-colors text-white text-sm font-medium disabled:opacity-50"
            onClick={() => setHeroState('edit')}
            disabled={savingFocal}
            aria-label="Cancel focal point"
          >
            {savingFocal ? 'Saving…' : 'Cancel'}
          </HapticButton>
        );
      }
    }
  })();


  if (!leagueImageUrl && league.heroImageUserId !== user._id) {
    return null;
  }

  return (
    <>
      {/* Full-Screen Image Viewer */}
      {isImageFullScreen && leagueImageUrl && (
        <Portal>
          <div
            className="fixed inset-0 z-200 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setIsImageFullScreen(false)}
          >
            <button
              onClick={() => setIsImageFullScreen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/40 ring-1 ring-white/25 backdrop-blur-md hover:bg-black/60 transition-colors text-white"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <img
              src={leagueImageUrl}
              alt={league.title}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                transform: `scale(${imageScale}) translate(${imageTranslate.x}px, ${imageTranslate.y}px)`,
                transition: imageScale === 1 ? 'transform 0.3s ease-out' : 'none',
                touchAction: 'none',
              }}
            />
          </div>
        </Portal>
      )}

      {/* Hero Banner with Cover Photo */}
      <div className={className}>
        {/* Background Image - cover normally, contained + centered in focal-pick mode */}
        {leagueImageUrl &&
          (heroStage === 'focal' ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden">
              <img
                ref={focalImgRef}
                src={leagueImageUrl}
                alt={league.title}
                className="block max-w-full max-h-full cursor-crosshair"
                onClick={handleFocalClick}
                onLoad={recomputeMarker}
              />
              {markerPosition && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: markerPosition.left,
                    top: markerPosition.top,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div className="relative w-8 h-8 rounded-full border-2 border-white ring-2 ring-black/60 shadow-lg">
                    <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)]" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-no-repeat"
              style={{
                backgroundImage: `url(${leagueImageUrl})`,
                backgroundPosition: `${focalX}% ${focalY}%`,
              }}
            />
          ))}

        {/* Gradient Overlay for readability */}
        {heroStage !== 'focal' && (
          <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-black/10 pointer-events-none" />
        )}

        {/* Hero buttons (upload / pencil / focal / cancel) */}
        {heroButtons}

        {/* Zoom Button - Top Left */}
        {heroStage !== 'focal' && leagueImageUrl && (
          <div className="absolute top-4 left-4">
            <HapticButton
              onClick={() => setIsImageFullScreen(true)}
              className="p-2 rounded-full bg-black/25 ring-1 ring-white/25 backdrop-blur-md text-white hover:bg-black/40 transition-colors"
              aria-label="View full size"
            >
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                />
              </svg>
            </HapticButton>
          </div>
        )}

        {/* Focal-pick instruction */}
        {heroStage === 'focal' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/60 ring-1 ring-white/20 text-white text-xs font-medium rounded-full backdrop-blur-md pointer-events-none">
            {savingFocal ? 'Saving…' : 'Tap the image to set the focal point'}
          </div>
        )}

      </div>

    </>
  );
}
