"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import {
  initiateSpotifyAuth,
  fetchPlaylist,
  extractPlaylistId,
} from "@/lib/spotify";

interface Item {
  id: string;
  type: "image" | "text";
  content: string;
  aspectRatio?: number;
  title?: string;
  artist?: string;
  album?: string;
}

interface Tier {
  id: number;
  name: string;
  items: Item[];
}

// localStorage helper functions
const getTierListKey = (playlistUrl: string) => {
  const playlistId = extractPlaylistId(playlistUrl);
  return `tierlist_${playlistId}`;
};

const saveTierListToStorage = (playlistUrl: string, tiers: Tier[], unrankedItems: Item[], votes: { [itemId: string]: number }) => {
  try {
    const key = getTierListKey(playlistUrl);
    const data = {
      tiers,
      unrankedItems,
      votes,
      timestamp: Date.now(),
      playlistUrl
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save tier list to localStorage:', error);
  }
};

const loadTierListFromStorage = (playlistUrl: string) => {
  try {
    const key = getTierListKey(playlistUrl);
    const stored = localStorage.getItem(key);
    if (stored) {
      const data = JSON.parse(stored);
      // Validate that the data has the expected structure
      if (data.tiers && data.unrankedItems && Array.isArray(data.tiers) && Array.isArray(data.unrankedItems)) {
        return {
          tiers: data.tiers,
          unrankedItems: data.unrankedItems,
          votes: data.votes || {},
          timestamp: data.timestamp
        };
      }
    }
  } catch (error) {
    console.warn('Failed to load tier list from localStorage:', error);
  }
  return null;
};

export default function TierListMaker() {
  const searchParams = useSearchParams();

  const [tiers, setTiers] = useState<Tier[]>([
    { id: 1, name: "Jen", items: [] },
    { id: 2, name: "Jason", items: [] },
    { id: 3, name: "Kelsey", items: [] },
    { id: 4, name: "James", items: [] },
    { id: 5, name: "Dharam", items: [] },
    { id: 6, name: "Kayla", items: [] },
    { id: 7, name: "Cody", items: [] },
    { id: 8, name: "TJ", items: [] },
  ]);

  const [unrankedItems, setUnrankedItems] = useState<Item[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [itemIdCounter, setItemIdCounter] = useState(1);
  const [tierIdCounter, setTierIdCounter] = useState(9);

  // Spotify integration state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState(
    "https://open.spotify.com/playlist/4Q2VnOr1fMv2K8qbZKpZdF?si=9aa4011ef11442b4"
  );
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [playlistName, setPlaylistName] = useState<string | null>(null);
  const [votes, setVotes] = useState<{ [itemId: string]: number }>({});
  const [totalVotes, setTotalVotes] = useState(10);

  const dragPreviewRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; element: HTMLElement | null }>({ x: 0, y: 0, element: null });
  const touchPreviewRef = useRef<HTMLDivElement | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    const token = Cookies.get("spotify_access_token");
    const wasAuthenticated = isAuthenticated;
    setIsAuthenticated(!!token);

    // Auto-load default playlist when user first authenticates
    if (token && !wasAuthenticated && !hasAutoLoaded) {
      setHasAutoLoaded(true);
      loadPlaylist();
    }

    // Check for auth errors
    const error = searchParams.get("error");
    if (error) {
      setSpotifyError(error);
    }
  }, [searchParams, isAuthenticated, hasAutoLoaded]);

  // Save tier list to localStorage whenever tiers, unranked items, or votes change
  useEffect(() => {
    if (playlistUrl && (tiers.some(tier => tier.items.length > 0) || unrankedItems.length > 0 || Object.keys(votes).length > 0)) {
      saveTierListToStorage(playlistUrl, tiers, unrankedItems, votes);
    }
  }, [tiers, unrankedItems, votes, playlistUrl]);

  useEffect(() => {
    // Removed image pasting functionality - items only come from Spotify playlists

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (!draggedItem) return;

      clearDropHighlights();

      // Auto-scroll functionality
      const scrollThreshold = 250; // pixels from top/bottom to trigger scroll
      const scrollSpeed = 10; // pixels per scroll
      const viewportHeight = window.innerHeight;
      const mouseY = e.clientY;

      // Clear any existing scroll interval
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }

      // Check if mouse is near top or bottom of viewport
      if (mouseY < scrollThreshold) {
        // Near top - scroll up
        scrollIntervalRef.current = setInterval(() => {
          window.scrollBy(0, -scrollSpeed);
        }, 16); // ~60fps
      } else if (mouseY > viewportHeight - scrollThreshold) {
        // Near bottom - scroll down
        scrollIntervalRef.current = setInterval(() => {
          window.scrollBy(0, scrollSpeed);
        }, 16); // ~60fps
      }

      const tierContent = (e.target as HTMLElement).closest(".tier-content");
      if (tierContent) {
        tierContent.classList.add("drag-over");
        return;
      }

      const unrankedItems = (e.target as HTMLElement).closest(
        ".unranked-items"
      );
      if (unrankedItems) {
        unrankedItems.classList.add("drag-over");
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      handleDropEvent(e);
      clearDropHighlights();
    };

    const handleDragEnd = () => {
      clearDragState();
    };

    // Touch event handlers for mobile
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const element = (e.target as HTMLElement).closest('.item') as HTMLElement;
      if (!element) return;

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        element: element
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current.element) return;

      e.preventDefault(); // Prevent scrolling
      const touch = e.touches[0];
      const startX = touchStartRef.current.x;
      const startY = touchStartRef.current.y;
      
      // Check if we've moved enough to start dragging
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > 10 && !draggedItem) {
        // Start dragging
        const itemId = touchStartRef.current.element.dataset.itemId;
        if (itemId) {
          setDraggedItem(itemId);
          touchStartRef.current.element.classList.add('dragging');
          
          // Add global dragging class to body for cursor styling
          document.body.classList.add("dragging");
          
          // Create touch preview
          createTouchPreview(touchStartRef.current.element, touch.clientX, touch.clientY);
        }
      }

      if (draggedItem && touchPreviewRef.current) {
        // Update preview position
        touchPreviewRef.current.style.left = `${touch.clientX - 32}px`;
        touchPreviewRef.current.style.top = `${touch.clientY - 32}px`;
        
        // Handle auto-scroll
        handleTouchScroll(touch.clientY);
        
        // Handle drop zone highlighting
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        clearDropHighlights();
        
        const tierContent = elementBelow?.closest('.tier-content');
        if (tierContent) {
          tierContent.classList.add('drag-over');
        }
        
        const unrankedItems = elementBelow?.closest('.unranked-items');
        if (unrankedItems) {
          unrankedItems.classList.add('drag-over');
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!draggedItem || !touchStartRef.current.element) {
        touchStartRef.current = { x: 0, y: 0, element: null };
        return;
      }

      const touch = e.changedTouches[0];
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      
      const tierContent = elementBelow?.closest('.tier-content') as HTMLElement;
      const unrankedItemsEl = elementBelow?.closest('.unranked-items');
      
      if (tierContent) {
        const targetTierId = parseInt(tierContent.dataset.tierId || "0");
        moveItemToTier(draggedItem, targetTierId);
      } else if (unrankedItemsEl) {
        moveItemToUnranked(draggedItem);
      }
      
      clearTouchDragState();
    };

    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);
    document.addEventListener("dragend", handleDragEnd);
    
    // Add touch event listeners
    document.addEventListener("touchstart", handleTouchStart, { passive: false });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDrop);
      document.removeEventListener("dragend", handleDragEnd);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);

      // Clean up any active scroll interval
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
      
      // Clean up touch preview
      if (touchPreviewRef.current) {
        document.body.removeChild(touchPreviewRef.current);
        touchPreviewRef.current = null;
      }
    };
  }, [draggedItem, itemIdCounter]);

  const getTierColorClass = (index: number) => {
    const colors = ["s", "a", "b", "c", "d", "e", "f"];
    return colors[index % colors.length];
  };

  // Removed tier and item management functions - fixed tiers, Spotify-only items

  const handleSpotifyAuth = () => {
    setSpotifyError(null);
    initiateSpotifyAuth();
  };

  const handleLogout = () => {
    Cookies.remove("spotify_access_token");
    setIsAuthenticated(false);
  };

  const loadPlaylist = async () => {
    if (!playlistUrl.trim()) return;

    setIsLoadingPlaylist(true);
    setSpotifyError(null);

    try {
      const playlistId = extractPlaylistId(playlistUrl);
      if (!playlistId) {
        throw new Error("Invalid Spotify playlist URL");
      }

      const accessToken = Cookies.get("spotify_access_token");
      if (!accessToken) {
        throw new Error("No access token found");
      }

      const playlistData = await fetchPlaylist(playlistId, accessToken);

      // Set the playlist name
      setPlaylistName(playlistData.name);

      // Transform Spotify tracks to items
      const newItems: Item[] = playlistData.tracks.items
        .filter((item) => item.track && item.track.album.images.length > 0)
        .map((item) => ({
          id: `spotify-${item.track.id}`, // Use Spotify track ID for consistency
          type: "image" as const,
          content: item.track.album.images[0]?.url || "",
          aspectRatio: 1, // Album covers are square
          title: item.track.name,
          artist: item.track.artists.map((a) => a.name).join(", "),
          album: item.track.album.name,
        }));

      // Check for saved tier list data
      const savedData = loadTierListFromStorage(playlistUrl);
      
      if (savedData) {
        // Restore saved tier list, but ensure we only include tracks that are still in the playlist
        const newItemIds = new Set(newItems.map(item => item.id));
        
        // Filter saved tiers to only include items that are still in the playlist
        const restoredTiers = savedData.tiers.map((tier: Tier) => ({
          ...tier,
          items: tier.items.filter((item: Item) => newItemIds.has(item.id))
        }));
        
        // Get items that were in saved tiers
        const tieredItemIds = new Set();
        restoredTiers.forEach((tier: Tier) => {
          tier.items.forEach((item: Item) => tieredItemIds.add(item.id));
        });
        
        // Unranked items are those not in any tier
        const restoredUnrankedItems = newItems.filter(item => !tieredItemIds.has(item.id));
        
        setTiers(restoredTiers);
        setUnrankedItems(restoredUnrankedItems);
        
        // Restore votes, but only for items that are still in the playlist
        const restoredVotes: { [itemId: string]: number } = {};
        Object.keys(savedData.votes || {}).forEach(itemId => {
          if (newItemIds.has(itemId)) {
            restoredVotes[itemId] = savedData.votes[itemId];
          }
        });
        setVotes(restoredVotes);
      } else {
        // No saved data, start fresh
        // Clear all existing items from tiers and unranked
        setTiers((prev) => prev.map((tier) => ({ ...tier, items: [] })));
        setUnrankedItems(newItems); // Replace all items instead of adding
        setVotes({}); // Clear votes
      }
      
      setItemIdCounter((prev) => prev + newItems.length);
      // Don't clear the URL so user can load it again or modify it
    } catch (error) {
      console.error("Error loading playlist:", error);
      setSpotifyError(
        error instanceof Error ? error.message : "Failed to load playlist"
      );
    } finally {
      setIsLoadingPlaylist(false);
    }
  };

  // Touch helper functions
  const createTouchPreview = (element: HTMLElement, x: number, y: number) => {
    if (touchPreviewRef.current) {
      document.body.removeChild(touchPreviewRef.current);
    }

    const preview = document.createElement('div');
    preview.style.position = 'fixed';
    preview.style.left = `${x - 32}px`;
    preview.style.top = `${y - 32}px`;
    preview.style.width = '64px';
    preview.style.height = '64px';
    preview.style.pointerEvents = 'none';
    preview.style.zIndex = '10000';
    preview.style.opacity = '0.8';
    preview.style.transform = 'rotate(5deg)';
    preview.style.borderRadius = '6px';
    preview.style.overflow = 'hidden';
    preview.style.backgroundColor = '#333';
    preview.style.display = 'flex';
    preview.style.alignItems = 'center';
    preview.style.justifyContent = 'center';

    const img = element.querySelector('img');
    if (img) {
      const previewImg = document.createElement('img');
      previewImg.src = img.src;
      previewImg.style.width = '100%';
      previewImg.style.height = '100%';
      previewImg.style.objectFit = 'cover';
      preview.appendChild(previewImg);
    } else {
      preview.style.background = 'linear-gradient(135deg, #4a5568, #2d3748)';
      preview.style.fontSize = '12px';
      preview.style.fontWeight = 'bold';
      preview.style.color = 'white';
      preview.textContent = element.textContent?.replace('×', '') || '';
    }

    document.body.appendChild(preview);
    touchPreviewRef.current = preview;
  };

  const handleTouchScroll = (touchY: number) => {
    const scrollThreshold = 250;
    const scrollSpeed = 10;
    const viewportHeight = window.innerHeight;

    // Clear any existing scroll interval
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    // Check if touch is near top or bottom of viewport
    if (touchY < scrollThreshold) {
      scrollIntervalRef.current = setInterval(() => {
        window.scrollBy(0, -scrollSpeed);
      }, 16);
    } else if (touchY > viewportHeight - scrollThreshold) {
      scrollIntervalRef.current = setInterval(() => {
        window.scrollBy(0, scrollSpeed);
      }, 16);
    }
  };

  const clearTouchDragState = () => {
    document.querySelectorAll(".dragging").forEach((el) => {
      el.classList.remove("dragging");
    });
    
    // Remove global dragging class from body
    document.body.classList.remove("dragging");
    
    setDraggedItem(null);
    clearDropHighlights();
    touchStartRef.current = { x: 0, y: 0, element: null };

    // Clear auto-scroll interval
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    // Remove touch preview
    if (touchPreviewRef.current) {
      document.body.removeChild(touchPreviewRef.current);
      touchPreviewRef.current = null;
    }
  };

  // Voting functionality
  const getUsedVotes = () => {
    return Object.values(votes).reduce((sum, count) => sum + count, 0);
  };

  const getRemainingVotes = () => {
    return totalVotes - getUsedVotes();
  };

  const addVote = (itemId: string) => {
    if (getRemainingVotes() > 0) {
      setVotes(prev => ({
        ...prev,
        [itemId]: (prev[itemId] || 0) + 1
      }));
    }
  };

  const removeVote = (itemId: string) => {
    if (votes[itemId] > 0) {
      setVotes(prev => {
        const newVotes = { ...prev };
        if (newVotes[itemId] === 1) {
          delete newVotes[itemId];
        } else {
          newVotes[itemId] = newVotes[itemId] - 1;
        }
        return newVotes;
      });
    }
  };

  const resetAllVotes = () => {
    setVotes({});
  };

  // Click-to-select and click-to-move functionality
  const handleItemClick = (e: React.MouseEvent, itemId: string) => {
    // Prevent triggering if this was part of a drag operation
    if (e.defaultPrevented) return;
    
    e.stopPropagation();
    
    if (selectedItem === itemId) {
      // Clicking the same item again deselects it
      setSelectedItem(null);
    } else {
      // Select this item
      setSelectedItem(itemId);
    }
  };

  const handleTierClick = (e: React.MouseEvent, tierId: number) => {
    if (!selectedItem) return;
    
    e.stopPropagation();
    
    // Move selected item to this tier
    moveItemToTier(selectedItem, tierId);
    setSelectedItem(null);
  };

  const handleUnrankedClick = (e: React.MouseEvent) => {
    if (!selectedItem) return;
    
    e.stopPropagation();
    
    // Move selected item to unranked
    moveItemToUnranked(selectedItem);
    setSelectedItem(null);
  };

  const dragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    const itemElement = (e.target as HTMLElement).closest(
      ".item"
    ) as HTMLElement;
    itemElement.classList.add("dragging");
    
    // Add global dragging class to body for cursor styling
    document.body.classList.add("dragging");

    const dragPreview = dragPreviewRef.current;
    if (dragPreview && itemElement) {
      const img = itemElement.querySelector("img");
      if (img) {
        dragPreview.innerHTML = `<img src="${img.src}" style="width: 100%; height: 100%; object-fit: cover;">`;
      } else {
        dragPreview.innerHTML = itemElement.textContent?.replace("×", "") || "";
        dragPreview.style.background =
          "linear-gradient(135deg, #4a5568, #2d3748)";
        dragPreview.style.display = "flex";
        dragPreview.style.alignItems = "center";
        dragPreview.style.justifyContent = "center";
        dragPreview.style.fontSize = "12px";
        dragPreview.style.fontWeight = "bold";
        dragPreview.style.color = "white";
        dragPreview.style.textAlign = "center";
      }

      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setDragImage(dragPreview, 32, 32);
    }
  };

  const handleDropEvent = (e: DragEvent) => {
    if (!draggedItem) return;

    const tierContent = (e.target as HTMLElement).closest(
      ".tier-content"
    ) as HTMLElement;
    const unrankedItemsEl = (e.target as HTMLElement).closest(
      ".unranked-items"
    );

    if (tierContent) {
      const targetTierId = parseInt(tierContent.dataset.tierId || "0");
      moveItemToTier(draggedItem, targetTierId);
    } else if (unrankedItemsEl) {
      moveItemToUnranked(draggedItem);
    }

    clearDragState();
  };

  const moveItemToTier = (itemId: string, targetTierId: number) => {
    let foundItem: Item | null = null;

    // First, find the item in unranked items
    const unrankedIndex = unrankedItems.findIndex((i) => i.id === itemId);
    if (unrankedIndex !== -1) {
      foundItem = unrankedItems[unrankedIndex];
      setUnrankedItems((prev) => prev.filter((item) => item.id !== itemId));
      setTiers((prev) =>
        prev.map((tier) =>
          tier.id === targetTierId
            ? { ...tier, items: [...tier.items, foundItem!] }
            : tier
        )
      );
      return;
    }

    // If not found in unranked, find in tiers
    for (const tier of tiers) {
      const itemIndex = tier.items.findIndex((i) => i.id === itemId);
      if (itemIndex !== -1) {
        foundItem = tier.items[itemIndex];
        break;
      }
    }

    if (!foundItem) return;

    // Remove from all tiers and add to target tier
    setTiers((prev) =>
      prev.map((tier) => {
        const filteredItems = tier.items.filter((item) => item.id !== itemId);

        if (tier.id === targetTierId) {
          return { ...tier, items: [...filteredItems, foundItem!] };
        } else {
          return { ...tier, items: filteredItems };
        }
      })
    );
  };

  const moveItemToUnranked = (itemId: string) => {
    let foundItem: Item | null = null;

    // Find the item in tiers
    for (const tier of tiers) {
      const itemIndex = tier.items.findIndex((i) => i.id === itemId);
      if (itemIndex !== -1) {
        foundItem = tier.items[itemIndex];
        break;
      }
    }

    if (!foundItem) return;

    // Remove from all tiers and add to unranked
    setTiers((prev) =>
      prev.map((tier) => ({
        ...tier,
        items: tier.items.filter((item) => item.id !== itemId),
      }))
    );

    setUnrankedItems((prev) => [...prev, foundItem!]);
  };

  // Removed deleteItem function - items can't be deleted, only moved between tiers

  const clearDragState = () => {
    document.querySelectorAll(".dragging").forEach((el) => {
      el.classList.remove("dragging");
    });
    
    // Remove global dragging class from body
    document.body.classList.remove("dragging");
    
    setDraggedItem(null);
    clearDropHighlights();

    // Clear auto-scroll interval
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const clearDropHighlights = () => {
    document.querySelectorAll(".drag-over").forEach((el) => {
      el.classList.remove("drag-over");
    });
  };

  const renderItem = (item: Item) => {
    if (item.type === "image") {
      // Check if this is a Spotify track (has title and artist)
      if (item.title && item.artist) {
        return (
          <div
            key={item.id}
            className={`item music-card ${selectedItem === item.id ? 'selected' : ''}`}
            draggable
            data-item-id={item.id}
            onDragStart={(e) => dragStart(e, item.id)}
            onClick={(e) => handleItemClick(e, item.id)}
            title={`${item.title} - ${item.artist}`}
          >
            <img
              className="album-art"
              src={item.content}
              alt={`${item.title} album art`}
            />
            <div className="track-info">
              <div className="track-title">{item.title}</div>
              <div className="track-artist">{item.artist}</div>
            </div>
            <div className="vote-controls">
              <button 
                className="vote-btn plus"
                onClick={(e) => {
                  e.stopPropagation();
                  addVote(item.id);
                }}
                disabled={getRemainingVotes() === 0}
                title="Add vote"
              >
                +
              </button>
              <span className="vote-count">{votes[item.id] || 0}</span>
              <button 
                className="vote-btn minus"
                onClick={(e) => {
                  e.stopPropagation();
                  removeVote(item.id);
                }}
                disabled={!votes[item.id]}
                title="Remove vote"
              >
                −
              </button>
            </div>
          </div>
        );
      } else {
        // Regular image item
        const width = item.aspectRatio
          ? Math.min(200, Math.max(64, 64 * item.aspectRatio))
          : 64;
        return (
          <div
            key={item.id}
            className={`item ${selectedItem === item.id ? 'selected' : ''}`}
            draggable
            data-item-id={item.id}
            style={{ width: `${width}px` }}
            onDragStart={(e) => dragStart(e, item.id)}
            onClick={(e) => handleItemClick(e, item.id)}
            title="Item"
          >
            <img src={item.content} alt="Item" />
          </div>
        );
      }
    } else {
      return (
        <div
          key={item.id}
          className={`item text-item ${selectedItem === item.id ? 'selected' : ''}`}
          draggable
          data-item-id={item.id}
          onDragStart={(e) => dragStart(e, item.id)}
          onClick={(e) => handleItemClick(e, item.id)}
        >
          {item.content}
        </div>
      );
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Music Tier List Maker</h1>
        <div className="controls">
          {/* Controls removed - items only come from Spotify playlists */}
        </div>
      </header>

      <main>
        {/* Spotify Integration Section */}
        <div className="spotify-section">
          <h3>🎵 Spotify Integration</h3>

          {!isAuthenticated ? (
            <div>
              <p
                style={{
                  marginBottom: "15px",
                  color: "rgba(255, 255, 255, 0.8)",
                }}
              >
                Connect your Spotify account to load playlists directly into
                your tier list.
              </p>
              <button className="auth-button" onClick={handleSpotifyAuth}>
                <span>🎵</span>
                Connect to Spotify
              </button>
              {spotifyError && (
                <p
                  style={{
                    color: "#ff6b6b",
                    marginTop: "10px",
                    fontSize: "14px",
                  }}
                >
                  Error: {spotifyError}
                </p>
              )}
            </div>
          ) : (
            <div>
              <div className="user-info">
                <div className="user-avatar">🎵</div>
                <span>Connected to Spotify</span>
                <button
                  style={{
                    marginLeft: "auto",
                    fontSize: "12px",
                    padding: "4px 8px",
                  }}
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  className="playlist-input"
                  type="text"
                  placeholder="Paste Spotify playlist URL here..."
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadPlaylist()}
                  style={{ flex: 1, marginBottom: 0 }}
                />
                <button
                  onClick={loadPlaylist}
                  disabled={!playlistUrl.trim() || isLoadingPlaylist}
                  style={{
                    opacity: !playlistUrl.trim() || isLoadingPlaylist ? 0.5 : 1,
                    fontSize: '12px',
                    padding: '4px 8px'
                  }}
                >
                  {isLoadingPlaylist ? "Loading..." : "Load Playlist"}
                </button>
              </div>

              {spotifyError && (
                <p
                  style={{
                    color: "#ff6b6b",
                    marginTop: "10px",
                    fontSize: "14px",
                  }}
                >
                  Error: {spotifyError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Show playlist name if loaded */}
        {playlistName && (
          <div style={{
            textAlign: 'center',
            margin: '20px 0',
            padding: '15px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            color: '#ffffff'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              margin: '0',
              color: '#1db954'
            }}>
              🎵 {playlistName}
            </h2>
          </div>
        )}

        {/* Vote summary */}
        {(unrankedItems.length > 0 || tiers.some(tier => tier.items.length > 0)) && (
          <div className="vote-summary">
            <div className="vote-info">
              <span className="votes-used">Votes Used: {getUsedVotes()}/{totalVotes}</span>
              <span className="votes-remaining">Remaining: {getRemainingVotes()}</span>
            </div>
            {getUsedVotes() > 0 && (
              <button className="reset-votes-btn" onClick={resetAllVotes}>
                Reset All Votes
              </button>
            )}
          </div>
        )}
        
        <div className="main-content">
          <div className="tier-container">
            {tiers.map((tier, index) => (
              <div key={tier.id} className="tier-row" data-tier-id={tier.id}>
                <div
                  className={`tier-label tier-colors-${getTierColorClass(index)}`}
                >
                  <span>{tier.name}</span>
                </div>
                <div 
                  className={`tier-content ${selectedItem ? 'clickable' : ''}`} 
                  data-tier-id={tier.id}
                  onClick={(e) => handleTierClick(e, tier.id)}
                >
                  {tier.items.map((item) => renderItem(item))}
                </div>
              </div>
            ))}
          </div>

          <div className="unranked-section">
            <h3>Unranked Items</h3>
            <div 
              className={`unranked-items ${selectedItem ? 'clickable' : ''}`}
              onClick={handleUnrankedClick}
            >
              {unrankedItems.length === 0 && (
                <div className="drop-zone">
                  {isAuthenticated
                    ? "Load a Spotify playlist to get started"
                    : "Connect to Spotify to load playlists"}
                </div>
              )}
              {unrankedItems.map((item) => renderItem(item))}
            </div>
          </div>
        </div>
      </main>

      <div ref={dragPreviewRef} className="drag-preview"></div>
    </div>
  );
}
