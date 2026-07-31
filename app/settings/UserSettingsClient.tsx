'use client';

import { useEffect, useState } from 'react';
import {
  W98Button,
  GroupBox,
  Tabs,
  TabPanel,
} from '@/components/win98/Controls';
import { SettingsIcon, SuccessIcon } from '@/components/win98/Icons';
import type { User } from '@/databaseTypes';
import type { PopulatedUser } from '@/lib/types';
import { useToast } from '@/lib/ToastContext';
import { useServiceWorker } from '@/lib/ServiceWorkerContext';
import { unknownToErrorString } from '@/lib/utils/unknownToErrorString';
import { JASON_ID } from '@/lib/utils/constants';
import { useTheme } from '@/lib/ThemeContext';

type UserSettingsClientProps = {
  user: PopulatedUser;
};

export function UserSettingsClient({ user }: UserSettingsClientProps) {
  const isJason = user._id === JASON_ID;

  // Settings form state
  const toast = useToast();
  const { primaryColor, setPrimaryColor, availableColors } = useTheme();
  const {
    isSupported,
    isEnabled,
    notificationPermission,
    requestNotificationPermission,
    unregisterServiceWorker,
  } = useServiceWorker();
  const [isUnregistering, setIsUnregistering] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || '');
  const [phoneCarrier, setPhoneCarrier] = useState<User['phoneCarrier']>(
    user.phoneCarrier || undefined,
  );
  const [phoneVerified, setPhoneVerified] = useState(
    user.phoneVerified || false,
  );
  const [verificationCode, setVerificationCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [isSendingTestPushNotification, setIsSendingTestPushNotification] =
    useState(false);
  const [testNotificationDelay, setTestNotificationDelay] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [emailAddress, setEmailAddress] = useState(user.emailAddress || '');
  const [notificationSettings, setNotificationSettings] = useState<
    NonNullable<User['notificationSettings']>
  >({
    'NOTIFICATION.FORCE': true,
    'VOTING.STARTED': false,
    'VOTING.REMINDER': false,
    'SUBMISSION.REMINDER': false,
    'SUBMISSIONS.HALF_SUBMITTED': false,
    'SUBMISSIONS.LAST_TO_SUBMIT': false,
    'ROUND.REMINDER': false,
    'ROUND.STARTED': false,
    'ROUND.COMPLETED': false,
    'ROUND.HALF_VOTED': false,
    'ROUND.LAST_TO_VOTE': false,
    'LEAGUE.COMPLETED': false,
    textNotificationsEnabled: false,
    emailNotificationsEnabled: false,
    ...user.notificationSettings,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'contact' | 'appearance' | 'notifications'
  >('contact');

  const handleSendVerificationCode = async () => {
    if (!phoneNumber || !phoneCarrier) {
      toast.show({
        variant: 'error',
        message: 'Please enter your phone number and select your carrier',
      });
      return;
    }

    setIsSendingCode(true);
    try {
      const response = await fetch('/api/users/phone/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          phoneCarrier,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send verification code');
      }

      toast.show({
        variant: 'success',
        message: 'Verification code sent! Check your text messages.',
      });
    } catch (error) {
      const errorMessage = unknownToErrorString(
        error,
        'Failed to send verification code. Please try again.',
      );
      toast.show({
        variant: 'error',
        message: errorMessage,
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      toast.show({
        variant: 'error',
        message: 'Please enter the verification code',
      });
      return;
    }
    if (!phoneNumber || !phoneCarrier) {
      toast.show({
        variant: 'error',
        message: 'Please enter your phone number and select your carrier',
      });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch('/api/users/phone/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: verificationCode,
          phoneNumber,
          phoneCarrier,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify code');
      }

      setPhoneVerified(true);
      setVerificationCode('');
      toast.show({
        variant: 'success',
        message: 'Phone number verified successfully!',
      });
    } catch (error) {
      const errorMessage = unknownToErrorString(
        error,
        'Invalid verification code. Please try again.',
      );
      toast.show({
        variant: 'error',
        message: errorMessage,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);

    try {
      const response = await fetch(`/api/users/${user._id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          phoneCarrier,
          emailAddress,
          notificationSettings,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error('Failed to save settings');
      }

      toast.show({
        variant: 'success',
        message: 'Settings saved successfully!',
      });
      setNotificationSettings((current) => ({
        ...current,
        ...data.notificationSettings,
      }));
      setPhoneNumber(data.phoneNumber || '');
      setPhoneCarrier(data.phoneCarrier || undefined);
      setPhoneVerified(data.phoneVerified || false);
      setEmailAddress(data.emailAddress || '');
    } catch (error) {
      const errorMessage = unknownToErrorString(
        error,
        'Failed to save settings. Please try again.',
      );
      toast.show({
        variant: 'error',
        message: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationToggle = (
    key: keyof NonNullable<User['notificationSettings']>,
  ) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const notificationMethodOptions = [
    {
      key: 'textNotificationsEnabled',
      label: 'Enable Text Notifications',
      description: (
        <div className="grid gap-2">
          <div>Receive SMS notifications to your phone number</div>
          {!phoneVerified && (
            <div>
              You must verify your phone number to receive text notifications.
            </div>
          )}
        </div>
      ),
      disabled: !phoneNumber || !phoneVerified,
    },
    {
      key: 'emailNotificationsEnabled',
      label: 'Enable Email Notifications',
      description: 'Receive notifications via email',
      disabled: !emailAddress,
    },
  ] as const;

  const notificationOptions = [
    {
      key: 'SUBMISSION.REMINDER',
      label: 'Submission Reminder',
      description:
        'Reminder to submit your song 12 hours before song submission ends',
    },
    {
      key: 'SUBMISSIONS.HALF_SUBMITTED',
      label: 'Half Submitted Songs',
      description:
        "When half the users have submitted their songs for a round, and you haven't yet",
    },
    {
      key: 'SUBMISSIONS.LAST_TO_SUBMIT',
      label: 'Last to Submit Song',
      description:
        'When you are the last person to submit your song for a round',
    },
    {
      key: 'VOTING.STARTED',
      label: 'Voting Started',
      description: 'When voting starts for a round',
    },
    {
      key: 'VOTING.REMINDER',
      label: 'Voting Reminder',
      description: 'Reminder to vote 12 hours before a round ends',
    },
    {
      key: 'ROUND.REMINDER',
      label: 'Round Reminder',
      description:
        "Sent when a round ends and your round hasn't been submitted yet. Only notifies the next 3 rounds in line.",
    },
    {
      key: 'ROUND.HALF_VOTED',
      label: 'Half Voted',
      description:
        "When half the users have voted in a round, and you haven't yet",
    },
    {
      key: 'ROUND.LAST_TO_VOTE',
      label: 'Last to Vote',
      description: 'When you are the last person to vote in a round',
    },
    {
      key: 'ROUND.STARTED',
      label: 'Round Started',
      description:
        'When a currently pending round begins, otherwise you just get a round completed notification',
    },
    {
      key: 'ROUND.COMPLETED',
      label: 'Round Completed',
      description: 'When a round is completed',
    },
    {
      key: 'LEAGUE.COMPLETED',
      label: 'League Completed',
      description: 'When a league is completed',
    },
  ] as const;

  useEffect(() => {
    if (!phoneNumber) {
      setNotificationSettings((prev) => ({
        ...prev,
        textNotificationsEnabled: false,
      }));
      setPhoneVerified(false);
    }
  }, [phoneNumber]);

  useEffect(() => {
    // Reset verification when phone number or carrier changes
    if (
      phoneNumber !== user.phoneNumber ||
      phoneCarrier !== user.phoneCarrier
    ) {
      setPhoneVerified(false);
    }
  }, [phoneNumber, phoneCarrier, user.phoneNumber, user.phoneCarrier]);

  useEffect(() => {
    if (!emailAddress) {
      setNotificationSettings((prev) => ({
        ...prev,
        emailNotificationsEnabled: false,
      }));
    }
  }, [emailAddress]);

  const looksLikeEmailAddress = (() => {
    if (!emailAddress) {
      return false;
    }
    return /.+@.+\..+/.test(emailAddress);
  })();

  const handleUnregisterServiceWorker = async () => {
    if (
      !confirm(
        'Are you sure you want to unregister the service worker? This will clear all cached data and reload the page.',
      )
    ) {
      return;
    }

    setIsUnregistering(true);
    try {
      const success = await unregisterServiceWorker();
      if (success) {
        toast.show({
          variant: 'success',
          message: 'Service worker unregistered successfully!',
        });
      } else {
        toast.show({
          variant: 'error',
          message: 'Failed to unregister service worker',
        });
      }
    } catch {
      toast.show({
        variant: 'error',
        message: 'Error unregistering service worker',
      });
    } finally {
      setIsUnregistering(false);
    }
  };

  const developerToolsMarkup = (() => {
    if (!isJason || isJason || !isSupported) {
      return null;
    }

    return (
      <GroupBox label="Developer Tools" className="mt-3">
        <p className="text-sm mb-2">
          If you&apos;re experiencing issues with caching or want to reset the
          app, you can unregister the service worker below.
        </p>
        <W98Button
          onClick={handleUnregisterServiceWorker}
          disabled={isUnregistering}
        >
          {isUnregistering ? 'Unregistering…' : 'Unregister Service Worker'}
        </W98Button>
      </GroupBox>
    );
  })();

  const pushNotificationMarkup = (() => {
    switch (notificationPermission) {
      case 'default': {
        return (
          <W98Button
            onClick={async () => {
              const permission = await requestNotificationPermission();
              if (permission === 'granted') {
                toast.show({
                  variant: 'success',
                  message: 'Push notifications enabled!',
                });
              } else if (permission === 'denied') {
                toast.show({
                  variant: 'error',
                  message:
                    'Push notifications denied. Please enable them in your browser settings.',
                });
              }
            }}
          >
            Enable Push Notifications
          </W98Button>
        );
      }
      case 'denied': {
        return (
          <p className="text-sm">
            You have denied notification permissions. To enable them, please go
            to your browser settings and allow notifications for this site.
          </p>
        );
      }
      case 'granted': {
        return (
          <div className="grid sm:grid-cols-[1fr_auto] gap-2">
            <select
              className="w-full w98-field"
              value={testNotificationDelay}
              onChange={(e) => setTestNotificationDelay(Number(e.target.value))}
            >
              <option value={0}>Send Immediately</option>
              <option value={5000}>Delay by 5 seconds</option>
              <option value={10_000}>Delay by 10 seconds</option>
            </select>
            <W98Button
              onClick={async () => {
                setIsSendingTestPushNotification(true);
                try {
                  const response = await fetch('/api/push/test', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      delay: testNotificationDelay,
                    }),
                  });

                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(
                      errorData.error || 'Failed to send test notification',
                    );
                  }

                  const message =
                    testNotificationDelay > 0
                      ? `Test push notification scheduled! You should receive it in ${
                          testNotificationDelay / 1000
                        } seconds.`
                      : 'Test push notification sent! You should receive it shortly.';

                  toast.show({
                    variant: 'success',
                    message,
                  });
                } catch (error) {
                  const errorMessage = unknownToErrorString(
                    error,
                    'Failed to send test notification. Please try again.',
                  );
                  toast.show({
                    variant: 'error',
                    message: errorMessage,
                  });
                } finally {
                  setIsSendingTestPushNotification(false);
                }
              }}
              disabled={isSendingTestPushNotification}
            >
              {isSendingTestPushNotification
                ? 'Sending…'
                : 'Send Test Push Notification'}
            </W98Button>
          </div>
        );
      }
    }
  })();

  return (
    <div className="flex flex-col gap-2 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 px-1">
        <SettingsIcon size={32} />
        <div>
          <h1 className="text-xl">Properties</h1>
          <p className="text-sm">
            Manage your contact information and notification preferences.
          </p>
        </div>
      </div>

      <Tabs
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as typeof activeTab)}
        tabs={[
          { id: 'contact', label: 'Contact' },
          { id: 'appearance', label: 'Appearance' },
          { id: 'notifications', label: 'Notifications' },
        ]}
      />

      <TabPanel className="flex flex-col gap-3">
        {/* Contact Information */}
        <div
          className={activeTab === 'contact' ? 'flex flex-col gap-3' : 'hidden'}
        >
          <GroupBox label="Contact Information">
            <div className="flex flex-col gap-3">
              <div>
                <label htmlFor="phoneNumber" className="block text-sm mb-1">
                  Phone Number
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  disabled={phoneVerified}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="555-123-4567"
                  className="w-full w98-field"
                />
              </div>

              <div>
                <label htmlFor="phoneCarrier" className="block text-sm mb-1">
                  Phone Carrier * Needed for text notifications
                </label>
                <select
                  id="phoneCarrier"
                  value={phoneCarrier || ''}
                  disabled={!phoneNumber || phoneVerified}
                  onChange={(e) =>
                    setPhoneCarrier(
                      e.target.value as User['phoneCarrier'] | undefined,
                    )
                  }
                  className="w-full w98-field"
                >
                  <option value="">Select a carrier</option>
                  <option value="verizon">Verizon</option>
                  <option value="att">AT&T</option>
                  <option value="tmobile">T-Mobile</option>
                </select>
              </div>

              {phoneNumber && phoneCarrier && !phoneVerified && (
                <GroupBox label="Verification">
                  <p className="text-sm mb-2">
                    Your phone number needs to be verified before you can
                    receive text notifications.
                  </p>
                  <div className="flex flex-col gap-2">
                    <div>
                      <W98Button
                        onClick={handleSendVerificationCode}
                        disabled={isSendingCode}
                      >
                        {isSendingCode ? 'Sending…' : 'Send Verification Code'}
                      </W98Button>
                    </div>

                    <div>
                      <label
                        htmlFor="verificationCode"
                        className="block text-sm mb-1"
                      >
                        Verification Code
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="verificationCode"
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          placeholder="Enter code"
                          className="flex-1 w98-field"
                        />
                        <W98Button
                          onClick={handleVerifyCode}
                          disabled={isVerifying || !verificationCode}
                        >
                          {isVerifying ? 'Verifying…' : 'Verify'}
                        </W98Button>
                      </div>
                    </div>
                  </div>
                </GroupBox>
              )}

              {phoneVerified && (
                <p className="text-sm flex items-center gap-2">
                  <SuccessIcon />
                  Phone number verified!
                </p>
              )}

              <div>
                <label htmlFor="emailAddress" className="block text-sm mb-1">
                  Email Address
                </label>
                <div className="grid sm:grid-cols-[1fr_auto] gap-2">
                  <input
                    id="emailAddress"
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full w98-field"
                  />

                  <W98Button
                    disabled={isSendingTestEmail || !looksLikeEmailAddress}
                    onClick={async () => {
                      setIsSendingTestEmail(true);
                      try {
                        const response = await fetch('/api/users/email/test', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            emailAddress,
                          }),
                        });

                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(
                            errorData.error || 'Failed to send test email',
                          );
                        }

                        toast.show({
                          variant: 'success',
                          message: 'Test email sent! Check your email inbox.',
                        });
                      } catch (error) {
                        const errorMessage = unknownToErrorString(
                          error,
                          'Failed to send test email. Please try again.',
                        );
                        toast.show({
                          variant: 'error',
                          message: errorMessage,
                        });
                      } finally {
                        setIsSendingTestEmail(false);
                      }
                    }}
                  >
                    Send Test Email
                  </W98Button>
                </div>
              </div>
            </div>
          </GroupBox>

          {/* Push Notifications - Only show for enabled users */}
          {isEnabled && (
            <GroupBox label="Push Notifications">
              {pushNotificationMarkup}
              {developerToolsMarkup}
            </GroupBox>
          )}
        </div>

        {/* Appearance — the colour scheme, as Display Properties had it */}
        <div
          className={
            activeTab === 'appearance' ? 'flex flex-col gap-3' : 'hidden'
          }
        >
          <GroupBox label="Scheme">
            <p className="text-sm mb-2">
              Choose the accent colour used for title bars and selections.
            </p>

            {/* Preview window, exactly like the Display applet's */}
            <div className="w98-sunken bg-w98-desktop p-4 mb-3">
              <div className="w98-window max-w-xs">
                <div className="w98-titlebar">
                  <span className="grow">Active Window</span>
                  <span className="w98-titlebar-btn">
                    <span className="block w-1.5 h-0.5 bg-black mt-1" />
                  </span>
                </div>
                <div className="p-2 mt-0.5 text-sm">
                  Window Text
                  <div className="w98-selected inline-block px-1 ml-1">
                    Selected
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
              {availableColors.map((color) => (
                <W98Button
                  key={color}
                  onClick={() => setPrimaryColor(color)}
                  checked={primaryColor === color}
                  className="justify-start capitalize !min-w-0"
                >
                  <span
                    className="w-4 h-4 shrink-0 shadow-w98-in-thin"
                    style={{ backgroundColor: `var(--color-${color}-900)` }}
                  />
                  {color}
                </W98Button>
              ))}
            </div>
          </GroupBox>
        </div>

        {/* Notification Preferences */}
        <div
          className={
            activeTab === 'notifications' ? 'flex flex-col gap-3' : 'hidden'
          }
        >
          <GroupBox label="Delivery Method">
            <div className="flex flex-col gap-2">
              {notificationMethodOptions.map((option) => (
                <label
                  key={option.key}
                  className="flex items-start gap-2 has-disabled:text-w98-shadow"
                >
                  <input
                    type="checkbox"
                    checked={notificationSettings[option.key]}
                    onChange={() => handleNotificationToggle(option.key)}
                    disabled={option.disabled}
                    className="shrink-0 mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-sm">{option.label}</div>
                    <div className="text-sm">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </GroupBox>

          <GroupBox label="Notify Me When…">
            <div className="w98-paper p-2 max-h-96 overflow-y-auto flex flex-col gap-2">
              {notificationOptions.map((option) => (
                <label key={option.key} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={notificationSettings[option.key]}
                    onChange={() => handleNotificationToggle(option.key)}
                    className="shrink-0 mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-sm">{option.label}</div>
                    <div className="text-sm">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </GroupBox>
        </div>
      </TabPanel>

      {/* The property-sheet button row */}
      <div className="flex justify-end gap-2">
        <W98Button
          variant="default"
          onClick={handleSaveSettings}
          disabled={isSaving}
        >
          {isSaving ? 'Saving…' : 'OK'}
        </W98Button>
        <W98Button onClick={handleSaveSettings} disabled={isSaving}>
          Apply
        </W98Button>
      </div>
    </div>
  );
}
