'use client';

import { useState, useEffect } from 'react';
import { initiateSpotifyAuth } from '@/lib/spotify';
import Cookies from 'js-cookie';
import { APP_NAME } from '@/lib/utils/constants';
import { useToast } from '@/lib/ToastContext';
import { unknownToErrorString } from '@/lib/utils/unknownToErrorString';
import { W98Button, ProgressBar } from './win98/Controls';
import { CdIcon, SpotifyIcon, ErrorIcon } from './win98/Icons';

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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w98-raised p-6 flex items-center gap-3">
          <CdIcon size={32} />
          <div>
            <div className="font-bold mb-1">Please wait…</div>
            <ProgressBar value={60} className="w-48" label="Loading" />
          </div>
        </div>
      </div>
    );
  }

  if (!hasSpotifyToken) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-2">
        {/* Setup wizard, complete with the blue splash panel down the side. */}
        <div className="w98-raised max-w-2xl w-full">
          <div className="flex flex-col sm:flex-row">
            <div className="w-full sm:w-40 flex-none bg-linear-to-b from-primary to-primary-light p-4 flex flex-col items-center justify-center gap-2 text-white">
              <CdIcon size={48} />
              <div className="font-bold text-center text-lg leading-tight">
                {APP_NAME}
              </div>
              <div className="text-xs opacity-90">Setup</div>
            </div>

            <div className="p-5 grow">
              <h1 className="text-xl mb-2">Welcome to {APP_NAME}</h1>
              <p className="mb-4 text-sm max-w-sm">
                This wizard will connect your Spotify account so you can submit
                songs, vote in rounds, and listen to the results.
              </p>
              <p className="mb-5 text-sm max-w-sm">
                Click <b>Connect to Spotify</b> to continue.
              </p>

              <div className="w98-separator" />

              <div className="flex justify-end gap-2 pt-3">
                <W98Button disabled>&lt; Back</W98Button>
                <W98Button
                  variant="default"
                  onClick={handleSpotifyLogin}
                  icon={<SpotifyIcon />}
                >
                  Connect to Spotify
                </W98Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-4 px-2">
      <div className="w98-raised p-4 max-w-md w-full">
        <h1 className="text-lg mb-1">Create Your Account</h1>
        <p className="mb-3 text-sm">Complete your profile to continue.</p>

        {error && (
          <div className="w98-sunken-thin bg-w98-face p-2 mb-3 flex items-start gap-2 text-sm">
            <ErrorIcon size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="firstName" className="block text-sm mb-1">
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
              className="w-full w98-field"
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm mb-1">
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
              className="w-full w98-field"
            />
          </div>

          <div>
            <label htmlFor="userName" className="block text-sm mb-1">
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
              className="w-full w98-field"
            />
          </div>

          <div>
            <label
              htmlFor="photoUrl"
              className="flex justify-between items-center text-sm mb-1"
            >
              Photo URL (optional)
              {formData.photoUrl && (
                <img
                  alt=""
                  className="w-8 h-8 object-cover shadow-w98-out-thin"
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
              className="w-full w98-field"
            />
          </div>

          <div>
            <label htmlFor="inviteCode" className="block text-sm mb-1">
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
              className="w-full w98-field"
            />
          </div>

          <div className="w98-separator" />

          <div className="flex justify-end pt-1">
            <W98Button type="submit" variant="default" disabled={submitting}>
              {submitting ? 'Creating Account…' : 'Finish'}
            </W98Button>
          </div>
        </form>
      </div>
    </div>
  );
}
