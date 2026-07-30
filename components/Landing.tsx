'use client';

import { useState, useEffect } from 'react';
import { initiateSpotifyAuth } from '@/lib/spotify';
import Cookies from 'js-cookie';
import { APP_NAME } from '@/lib/utils/constants';
import { useToast } from '@/lib/ToastContext';
import { unknownToErrorString } from '@/lib/utils/unknownToErrorString';

interface SpotifyProfile {
  id: string;
  display_name: string;
  images?: Array<{ url: string }>;
}

export default function Landing() {
  const toast = useToast();
  const [hasSpotifyToken, setHasSpotifyToken] = useState(false);
  const [spotifyProfile, setSpotifyProfile] = useState<SpotifyProfile | null>(
    null,
  );
  // Default true so we don't flash the "Create Account" form before the
  // check-spotify lookup has confirmed the user doesn't already exist.
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    userName: '',
    inviteCode: '',
    photoUrl: '',
  });

  useEffect(() => {
    const checkSpotifyToken = async () => {
      const token = Cookies.get('spotify_access_token');

      if (token) {
        setHasSpotifyToken(true);

        // Fetch Spotify profile
        try {
          const response = await fetch('/api/spotify/profile');
          if (response.ok) {
            const profile = await response.json();
            setSpotifyProfile(profile);

            // Check if user already exists with this Spotify ID
            const checkResponse = await fetch('/api/auth/check-spotify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ spotifyId: profile.id }),
            });

            const checkData = await checkResponse.json();

            if (checkData.exists) {
              // User already exists, refresh auth context to log them in
              window.location.href = '/';
              return; // This will redirect to Home automatically
            }

            // User doesn't exist, pre-fill form with Spotify data
            if (profile.display_name) {
              setFormData({
                firstName: '',
                lastName: '',
                userName: profile.id || '',
                inviteCode: '',
                photoUrl: profile.images?.[0]?.url || '',
              });
            }
          }
        } catch (err) {
          const message = unknownToErrorString(
            err,
            'Failed to fetch Spotify profile',
          );
          toast.show({
            title: 'Error fetching Spotify profile',
            message,
            variant: 'error',
          });
        }
      }

      setLoading(false);
    };

    checkSpotifyToken();
  }, [toast]);

  const handleSpotifyLogin = async () => {
    try {
      await initiateSpotifyAuth();
    } catch (error) {
      const message = unknownToErrorString(
        error,
        'Error initiating Spotify auth',
      );
      toast.show({
        message,
        variant: 'error',
      });
      setError(message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          userName: formData.userName,
          spotifyId: spotifyProfile?.id,
          photoUrl: formData.photoUrl,
          inviteCode: formData.inviteCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create account');
        setSubmitting(false);
        return;
      }

      window.location.href = '/';
    } catch (err) {
      const message = unknownToErrorString(err, 'Failed to create account');
      toast.show({
        message,
        variant: 'error',
      });
      setError(message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!hasSpotifyToken) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="glass-strong rounded-card p-8 max-w-md w-full animate-slide-up-fade-in">
          <h1 className="text-3xl font-bold tracking-tight mb-3">Welcome to {APP_NAME}</h1>
          <p className="text-ink-muted mb-6">
            Connect your Spotify account to get started
          </p>
          <button
            onClick={handleSpotifyLogin}
            className="w-full bg-[#1db954] text-white px-6 py-3.5 rounded-control shadow-soft hover:bg-[#1ed760] hover:shadow-float active:scale-[0.99] transition-all font-semibold"
          >
            Connect to Spotify
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
      <div className="glass-strong rounded-card p-8 max-w-md w-full animate-slide-up-fade-in">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Create Your Account</h1>
        <p className="text-ink-muted mb-6">Complete your profile to continue</p>

        {error && (
          <div className="bg-red-50 ring-1 ring-red-600/20 text-red-700 text-sm px-4 py-3 rounded-control mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-ink-muted mb-1.5"
            >
              First Name *
            </label>
            <input
              id="firstName"
              type="text"
              required
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              className="w-full px-3.5 py-2.5 field rounded-control"
            />
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-ink-muted mb-1.5"
            >
              Last Name *
            </label>
            <input
              id="lastName"
              type="text"
              required
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              className="w-full px-3.5 py-2.5 field rounded-control"
            />
          </div>

          <div>
            <label
              htmlFor="userName"
              className="block text-sm font-medium text-ink-muted mb-1.5"
            >
              Username *
            </label>
            <input
              id="userName"
              type="text"
              required
              value={formData.userName}
              onChange={(e) =>
                setFormData({ ...formData, userName: e.target.value })
              }
              className="w-full px-3.5 py-2.5 field rounded-control"
            />
          </div>

          <div>
            <label
              htmlFor="photoUrl"
              className="flex justify-between items-center text-sm font-medium text-ink-muted mb-1.5"
            >
              Photo URL (optional)
              {formData.photoUrl && (
                <img
                  alt=""
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-line"
                  src={formData.photoUrl}
                />
              )}
            </label>
            <input
              id="photoUrl"
              type="text"
              value={formData.photoUrl}
              onChange={(e) =>
                setFormData({ ...formData, photoUrl: e.target.value })
              }
              className="w-full px-3.5 py-2.5 field rounded-control"
            />
          </div>

          <div>
            <label
              htmlFor="inviteCode"
              className="block text-sm font-medium text-ink-muted mb-1.5"
            >
              Invite code *
            </label>
            <input
              id="inviteCode"
              type="text"
              placeholder="Enter your invite code that Jason gave you"
              required
              value={formData.inviteCode}
              onChange={(e) =>
                setFormData({ ...formData, inviteCode: e.target.value })
              }
              className="w-full px-3.5 py-2.5 field rounded-control"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white px-6 py-3.5 rounded-control shadow-soft hover:bg-primary-dark hover:shadow-float active:scale-[0.99] transition-all font-semibold disabled:bg-ink-subtle disabled:shadow-none disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
