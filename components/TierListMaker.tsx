'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Cookies from 'js-cookie'
import { initiateSpotifyAuth, fetchPlaylist, extractPlaylistId, SpotifyTrack } from '@/lib/spotify'

interface Item {
  id: string
  type: 'image' | 'text'
  content: string
  aspectRatio?: number
  title?: string
  artist?: string
  album?: string
}

interface Tier {
  id: number
  name: string
  items: Item[]
}

export default function TierListMaker() {
  const searchParams = useSearchParams()
  
  const [tiers, setTiers] = useState<Tier[]>([
    { id: 1, name: 'Jen', items: [] },
    { id: 2, name: 'Kelsey', items: [] },
    { id: 3, name: 'James', items: [] },
    { id: 4, name: 'Dharam', items: [] },
    { id: 5, name: 'Kayla', items: [] },
    { id: 6, name: 'Cody', items: [] },
    { id: 7, name: 'TJ', items: [] }
  ])
  
  const [unrankedItems, setUnrankedItems] = useState<Item[]>([])
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [itemIdCounter, setItemIdCounter] = useState(1)
  const [tierIdCounter, setTierIdCounter] = useState(8)
  
  // Spotify integration state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [playlistUrl, setPlaylistUrl] = useState('https://open.spotify.com/playlist/4Q2VnOr1fMv2K8qbZKpZdF?si=9aa4011ef11442b4')
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false)
  const [spotifyError, setSpotifyError] = useState<string | null>(null)
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false)
  
  const dragPreviewRef = useRef<HTMLDivElement>(null)

  // Check authentication status on mount
  useEffect(() => {
    const token = Cookies.get('spotify_access_token')
    const wasAuthenticated = isAuthenticated
    setIsAuthenticated(!!token)
    
    // Auto-load default playlist when user first authenticates
    if (token && !wasAuthenticated && !hasAutoLoaded) {
      setHasAutoLoaded(true)
      loadPlaylist()
    }
    
    // Check for auth errors
    const error = searchParams.get('error')
    if (error) {
      setSpotifyError(error)
    }
  }, [searchParams, isAuthenticated, hasAutoLoaded])

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let item of Array.from(items)) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile()
          if (!blob) continue
          
          const reader = new FileReader()
          reader.onload = (event) => {
            const img = new Image()
            img.onload = () => {
              const aspectRatio = img.width / img.height
              const newItem: Item = {
                id: `item-${itemIdCounter}`,
                type: 'image',
                content: event.target?.result as string,
                aspectRatio: aspectRatio
              }
              
              setUnrankedItems(prev => [...prev, newItem])
              setItemIdCounter(prev => prev + 1)
            }
            img.src = event.target?.result as string
          }
          reader.readAsDataURL(blob)
        }
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && draggedItem) {
        deleteItem(draggedItem)
      }
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      if (!draggedItem) return
      
      clearDropHighlights()
      
      const tierContent = (e.target as HTMLElement).closest('.tier-content')
      if (tierContent) {
        tierContent.classList.add('drag-over')
        return
      }
      
      const unrankedItems = (e.target as HTMLElement).closest('.unranked-items')
      if (unrankedItems) {
        unrankedItems.classList.add('drag-over')
      }
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      handleDropEvent(e)
      clearDropHighlights()
    }

    const handleDragEnd = () => {
      clearDragState()
    }

    document.addEventListener('paste', handlePaste)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)
    document.addEventListener('dragend', handleDragEnd)

    return () => {
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
      document.removeEventListener('dragend', handleDragEnd)
    }
  }, [draggedItem, itemIdCounter])

  const getTierColorClass = (index: number) => {
    const colors = ['s', 'a', 'b', 'c', 'd', 'e', 'f']
    return colors[index % colors.length]
  }

  const addTier = () => {
    const newTier: Tier = {
      id: tierIdCounter,
      name: 'New Tier',
      items: []
    }
    setTiers(prev => [...prev, newTier])
    setTierIdCounter(prev => prev + 1)
  }

  const deleteTier = (tierId: number) => {
    setTiers(prev => {
      const tierIndex = prev.findIndex(t => t.id === tierId)
      if (tierIndex === -1) return prev
      
      const tier = prev[tierIndex]
      setUnrankedItems(prevUnranked => [...prevUnranked, ...tier.items])
      
      return prev.filter(t => t.id !== tierId)
    })
  }

  const updateTierName = (tierId: number, newName: string) => {
    setTiers(prev => prev.map(tier => 
      tier.id === tierId ? { ...tier, name: newName } : tier
    ))
  }

  const addTextItem = () => {
    const text = prompt('Enter text for the item:')
    if (!text) return

    const item: Item = {
      id: `item-${itemIdCounter}`,
      type: 'text',
      content: text
    }
    
    setUnrankedItems(prev => [...prev, item])
    setItemIdCounter(prev => prev + 1)
  }

  const handleSpotifyAuth = () => {
    setSpotifyError(null)
    initiateSpotifyAuth()
  }

  const handleLogout = () => {
    Cookies.remove('spotify_access_token')
    setIsAuthenticated(false)
  }

  const loadPlaylist = async () => {
    if (!playlistUrl.trim()) return

    setIsLoadingPlaylist(true)
    setSpotifyError(null)

    try {
      const playlistId = extractPlaylistId(playlistUrl)
      if (!playlistId) {
        throw new Error('Invalid Spotify playlist URL')
      }

      const accessToken = Cookies.get('spotify_access_token')
      if (!accessToken) {
        throw new Error('No access token found')
      }

      const playlistData = await fetchPlaylist(playlistId, accessToken)
      
      // Transform Spotify tracks to items
      const newItems: Item[] = playlistData.tracks.items
        .filter(item => item.track && item.track.album.images.length > 0)
        .map((item, index) => ({
          id: `spotify-${itemIdCounter + index}`,
          type: 'image' as const,
          content: item.track.album.images[0]?.url || '',
          aspectRatio: 1, // Album covers are square
          title: item.track.name,
          artist: item.track.artists.map(a => a.name).join(', '),
          album: item.track.album.name,
        }))

      setUnrankedItems(prev => [...prev, ...newItems])
      setItemIdCounter(prev => prev + newItems.length)
      // Don't clear the URL so user can load it again or modify it
    } catch (error) {
      console.error('Error loading playlist:', error)
      setSpotifyError(error instanceof Error ? error.message : 'Failed to load playlist')
    } finally {
      setIsLoadingPlaylist(false)
    }
  }

  const dragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId)
    const itemElement = (e.target as HTMLElement).closest('.item') as HTMLElement
    itemElement.classList.add('dragging')
    
    const dragPreview = dragPreviewRef.current
    if (dragPreview && itemElement) {
      const img = itemElement.querySelector('img')
      if (img) {
        dragPreview.innerHTML = `<img src="${img.src}" style="width: 100%; height: 100%; object-fit: cover;">`
      } else {
        dragPreview.innerHTML = itemElement.textContent?.replace('×', '') || ''
        dragPreview.style.background = 'linear-gradient(135deg, #4a5568, #2d3748)'
        dragPreview.style.display = 'flex'
        dragPreview.style.alignItems = 'center'
        dragPreview.style.justifyContent = 'center'
        dragPreview.style.fontSize = '12px'
        dragPreview.style.fontWeight = 'bold'
        dragPreview.style.color = 'white'
        dragPreview.style.textAlign = 'center'
      }
      
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setDragImage(dragPreview, 32, 32)
    }
  }

  const handleDropEvent = (e: DragEvent) => {
    if (!draggedItem) return

    const tierContent = (e.target as HTMLElement).closest('.tier-content') as HTMLElement
    const unrankedItemsEl = (e.target as HTMLElement).closest('.unranked-items')
    
    if (tierContent) {
      const targetTierId = parseInt(tierContent.dataset.tierId || '0')
      const item = findAndRemoveItem(draggedItem)
      
      if (item) {
        setTiers(prev => prev.map(tier => 
          tier.id === targetTierId 
            ? { ...tier, items: [...tier.items, item] }
            : tier
        ))
      }
    } else if (unrankedItemsEl) {
      const item = findAndRemoveItem(draggedItem)
      if (item) {
        setUnrankedItems(prev => [...prev, item])
      }
    }
    
    clearDragState()
  }

  const findAndRemoveItem = (itemId: string): Item | null => {
    let foundItem: Item | null = null
    
    // Check unranked items
    const unrankedIndex = unrankedItems.findIndex(i => i.id === itemId)
    if (unrankedIndex !== -1) {
      foundItem = unrankedItems[unrankedIndex]
      setUnrankedItems(prev => prev.filter((_, i) => i !== unrankedIndex))
      return foundItem
    }
    
    // Check tier items
    setTiers(prev => prev.map(tier => {
      const itemIndex = tier.items.findIndex(i => i.id === itemId)
      if (itemIndex !== -1 && !foundItem) {
        foundItem = tier.items[itemIndex]
        return { ...tier, items: tier.items.filter((_, i) => i !== itemIndex) }
      }
      return tier
    }))
    
    return foundItem
  }

  const deleteItem = (itemId: string) => {
    findAndRemoveItem(itemId)
  }

  const clearDragState = () => {
    document.querySelectorAll('.dragging').forEach(el => {
      el.classList.remove('dragging')
    })
    setDraggedItem(null)
    clearDropHighlights()
  }

  const clearDropHighlights = () => {
    document.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over')
    })
  }

  const renderItem = (item: Item) => {
    if (item.type === 'image') {
      // Check if this is a Spotify track (has title and artist)
      if (item.title && item.artist) {
        return (
          <div
            key={item.id}
            className="item music-card"
            draggable
            data-item-id={item.id}
            onDragStart={(e) => dragStart(e, item.id)}
            title={`${item.title} - ${item.artist}`}
          >
            <img className="album-art" src={item.content} alt={`${item.title} album art`} />
            <div className="track-info">
              <div className="track-title">{item.title}</div>
              <div className="track-artist">{item.artist}</div>
            </div>
            <button className="delete-item" onClick={() => deleteItem(item.id)}>×</button>
          </div>
        )
      } else {
        // Regular image item
        const width = item.aspectRatio ? Math.min(200, Math.max(64, 64 * item.aspectRatio)) : 64
        return (
          <div
            key={item.id}
            className="item"
            draggable
            data-item-id={item.id}
            style={{ width: `${width}px` }}
            onDragStart={(e) => dragStart(e, item.id)}
            title="Item"
          >
            <img src={item.content} alt="Item" />
            <button className="delete-item" onClick={() => deleteItem(item.id)}>×</button>
          </div>
        )
      }
    } else {
      return (
        <div
          key={item.id}
          className="item text-item"
          draggable
          data-item-id={item.id}
          onDragStart={(e) => dragStart(e, item.id)}
        >
          {item.content}
          <button className="delete-item" onClick={() => deleteItem(item.id)}>×</button>
        </div>
      )
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Music Tier List Maker</h1>
        <div className="controls">
          <button onClick={addTier}>Add Tier</button>
          <button onClick={addTextItem}>Add Text Item</button>
        </div>
      </header>
      
      <main>
        {/* Spotify Integration Section */}
        <div className="spotify-section">
          <h3>🎵 Spotify Integration</h3>
          
          {!isAuthenticated ? (
            <div>
              <p style={{ marginBottom: '15px', color: 'rgba(255, 255, 255, 0.8)' }}>
                Connect your Spotify account to load playlists directly into your tier list.
              </p>
              <button className="auth-button" onClick={handleSpotifyAuth}>
                <span>🎵</span>
                Connect to Spotify
              </button>
              {spotifyError && (
                <p style={{ color: '#ff6b6b', marginTop: '10px', fontSize: '14px' }}>
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
                  style={{ marginLeft: 'auto', fontSize: '12px', padding: '4px 8px' }} 
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
              
              <div>
                <input
                  className="playlist-input"
                  type="text"
                  placeholder="Paste Spotify playlist URL here..."
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadPlaylist()}
                />
                <button 
                  onClick={loadPlaylist}
                  disabled={!playlistUrl.trim() || isLoadingPlaylist}
                  style={{ opacity: (!playlistUrl.trim() || isLoadingPlaylist) ? 0.5 : 1 }}
                >
                  {isLoadingPlaylist ? 'Loading...' : 'Load Playlist'}
                </button>
              </div>
              
              {spotifyError && (
                <p style={{ color: '#ff6b6b', marginTop: '10px', fontSize: '14px' }}>
                  Error: {spotifyError}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="tier-container">
          {tiers.map((tier, index) => (
            <div key={tier.id} className="tier-row" data-tier-id={tier.id}>
              <div className={`tier-label tier-colors-${getTierColorClass(index)}`}>
                <input
                  type="text"
                  value={tier.name}
                  onChange={(e) => updateTierName(tier.id, e.target.value)}
                />
                <button className="delete-tier" onClick={() => deleteTier(tier.id)}>×</button>
              </div>
              <div className="tier-content" data-tier-id={tier.id}>
                {tier.items.map(item => renderItem(item))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="unranked-section">
          <h3>Unranked Items</h3>
          <div className="unranked-items">
            {unrankedItems.length === 0 && (
              <div className="drop-zone">
                Drop images here or paste them (Ctrl+V)
              </div>
            )}
            {unrankedItems.map(item => renderItem(item))}
          </div>
        </div>
      </main>
      
      <div ref={dragPreviewRef} className="drag-preview"></div>
    </div>
  )
}