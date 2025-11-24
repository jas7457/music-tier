"use client";

import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import Card, { CardProps } from "@/components/Card";
import { HapticButton } from "@/components/HapticButton";
import type { User } from "@/databaseTypes";
import type { PopulatedUser } from "@/lib/types";
import { useToast } from "@/lib/ToastContext";
import { unknownToErrorString } from "@/lib/utils/unknownToErrorString";

type UserSettingsClientProps = {
  user: PopulatedUser;
};

export function UserSettingsClient({ user }: UserSettingsClientProps) {
  // Settings form state
  const toast = useToast();
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || "");
  const [phoneCarrier, setPhoneCarrier] = useState<User["phoneCarrier"]>(
    user.phoneCarrier || undefined
  );
  const [phoneVerified, setPhoneVerified] = useState(
    user.phoneVerified || false
  );
  const [verificationCode, setVerificationCode] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [emailAddress, setEmailAddress] = useState(user.emailAddress || "");
  const [notificationSettings, setNotificationSettings] = useState<
    NonNullable<User["notificationSettings"]>
  >({
    "VOTING.STARTED": false,
    "SUBMISSIONS.HALF_SUBMITTED": false,
    "SUBMISSIONS.LAST_TO_SUBMIT": false,
    "ROUND.COMPLETED": false,
    "ROUND.HALF_VOTED": false,
    "ROUND.LAST_TO_VOTE": false,
    "LEAGUE.COMPLETED": false,
    textNotificationsEnabled: false,
    emailNotificationsEnabled: false,
    ...user.notificationSettings,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSendVerificationCode = async () => {
    if (!phoneNumber || !phoneCarrier) {
      toast.show({
        variant: "error",
        message: "Please enter your phone number and select your carrier",
      });
      return;
    }

    setIsSendingCode(true);
    try {
      const response = await fetch("/api/users/phone/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber,
          phoneCarrier,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send verification code");
      }

      toast.show({
        variant: "success",
        message: "Verification code sent! Check your text messages.",
      });
    } catch (error) {
      const errorMessage = unknownToErrorString(
        error,
        "Failed to send verification code. Please try again."
      );
      toast.show({
        variant: "error",
        message: errorMessage,
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      toast.show({
        variant: "error",
        message: "Please enter the verification code",
      });
      return;
    }
    if (!phoneNumber || !phoneCarrier) {
      toast.show({
        variant: "error",
        message: "Please enter your phone number and select your carrier",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch("/api/users/phone/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: verificationCode,
          phoneNumber,
          phoneCarrier,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to verify code");
      }

      setPhoneVerified(true);
      setVerificationCode("");
      toast.show({
        variant: "success",
        message: "Phone number verified successfully!",
      });
    } catch (error) {
      const errorMessage = unknownToErrorString(
        error,
        "Invalid verification code. Please try again."
      );
      toast.show({
        variant: "error",
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
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
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
        throw new Error(errorData.error || "Failed to save settings");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error("Failed to save settings");
      }

      toast.show({
        variant: "success",
        message: "Settings saved successfully!",
      });
      setNotificationSettings((current) => ({
        ...current,
        ...data.notificationSettings,
      }));
      setPhoneNumber(data.phoneNumber || "");
      setPhoneCarrier(data.phoneCarrier || undefined);
      setPhoneVerified(data.phoneVerified || false);
      setEmailAddress(data.emailAddress || "");
    } catch (error) {
      const errorMessage = unknownToErrorString(
        error,
        "Failed to save settings. Please try again."
      );
      toast.show({
        variant: "error",
        message: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationToggle = (
    key: keyof NonNullable<User["notificationSettings"]>
  ) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const notificationMethodOptions = [
    {
      key: "textNotificationsEnabled",
      label: "Enable Text Notifications",
      description: "Receive SMS notifications to your phone number",
      disabled: !phoneNumber,
    },
    {
      key: "emailNotificationsEnabled",
      label: "Enable Email Notifications",
      description: "Receive notifications via email",
      disabled: !emailAddress,
    },
  ] as const;

  const notificationOptions = [
    {
      key: "SUBMISSIONS.HALF_SUBMITTED",
      label: "Half Submitted Songs",
      description:
        "When half the users have submitted their songs for a round, and you haven't yet",
    },
    {
      key: "SUBMISSIONS.LAST_TO_SUBMIT",
      label: "Last to Submit Song",
      description:
        "When you are the last person to submit your song for a round",
    },
    {
      key: "VOTING.STARTED",
      label: "Voting Started",
      description: "When voting starts for a round",
    },
    {
      key: "ROUND.HALF_VOTED",
      label: "Half Voted",
      description:
        "When half the users have voted in a round, and you haven't yet",
    },
    {
      key: "ROUND.LAST_TO_VOTE",
      label: "Last to Vote",
      description: "When you are the last person to vote in a round",
    },
    {
      key: "ROUND.COMPLETED",
      label: "Round Completed",
      description: "When a round is completed",
    },
    {
      key: "LEAGUE.COMPLETED",
      label: "League Completed",
      description: "When a league is completed",
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

  useEffect(() => {
    if (
      !notificationSettings.textNotificationsEnabled &&
      !notificationSettings.emailNotificationsEnabled
    ) {
      // If both methods are disabled, turn off all notifications
      setNotificationSettings((prev) => {
        return Object.fromEntries(
          Object.entries(prev).map(([key]) => [key, false])
        ) as NonNullable<User["notificationSettings"]>;
      });
    }
  }, [
    notificationSettings.textNotificationsEnabled,
    notificationSettings.emailNotificationsEnabled,
  ]);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-600">
          Manage your contact information and notification preferences
        </p>
      </div>

      <GenericStatCard color="gray" className="flex flex-col gap-6">
        {/* Contact Information */}
        <div>
          <h3 className="font-semibold mb-3 text-lg">Contact Information</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="phoneNumber"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Phone Number
              </label>
              <input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                disabled={phoneVerified}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label
                htmlFor="phoneCarrier"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Phone Carrier * Needed for text notifications
              </label>
              <select
                id="phoneCarrier"
                value={phoneCarrier || ""}
                disabled={!phoneNumber || phoneVerified}
                onChange={(e) =>
                  setPhoneCarrier(
                    e.target.value as User["phoneCarrier"] | undefined
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select a carrier</option>
                <option value="verizon">Verizon</option>
                <option value="att">AT&T</option>
                <option value="tmobile">T-Mobile</option>
              </select>
            </div>

            {phoneNumber && phoneCarrier && !phoneVerified && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
                <p className="text-sm text-purple-800 mb-3">
                  Your phone number needs to be verified before you can receive
                  text notifications.
                </p>
                <div className="flex flex-col gap-3">
                  <HapticButton
                    onClick={handleSendVerificationCode}
                    disabled={isSendingCode}
                    className={twMerge(
                      "px-4 py-2 rounded-md font-semibold transition-colors",
                      isSendingCode
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-purple-600 hover:bg-purple-700 text-white"
                    )}
                  >
                    {isSendingCode ? "Sending..." : "Send Verification Code"}
                  </HapticButton>

                  <div>
                    <label
                      htmlFor="verificationCode"
                      className="block text-sm font-medium text-gray-700 mb-1"
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
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <HapticButton
                        onClick={handleVerifyCode}
                        disabled={isVerifying || !verificationCode}
                        className={twMerge(
                          "px-4 py-2 rounded-md font-semibold transition-colors whitespace-nowrap bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                        )}
                      >
                        {isVerifying ? "Verifying..." : "Verify"}
                      </HapticButton>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {phoneVerified && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800 flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Phone number verified!
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="emailAddress"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                id="emailAddress"
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div>
          <h3 className="font-semibold mb-3 text-lg">
            Notification Preferences
          </h3>

          {/* Enable/Disable toggles */}
          <div className="mb-4 p-4 bg-purple-50 rounded-md border border-purple-200">
            <div className="flex flex-col gap-3">
              {notificationMethodOptions.map((option) => (
                <label
                  key={option.key}
                  className="flex items-center gap-3 cursor-pointer has-disabled:opacity-50 has-disabled:cursor-not-allowed"
                >
                  <input
                    type="checkbox"
                    checked={notificationSettings[option.key]}
                    onChange={() => handleNotificationToggle(option.key)}
                    disabled={option.disabled}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-gray-600">
                      {option.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Individual notification types */}
          <div className="flex flex-col gap-3">
            {notificationOptions.map((option) => (
              <label
                key={option.key}
                className="flex items-start gap-3 cursor-pointer has-disabled:opacity-50 has-disabled:cursor-not-allowed"
              >
                <input
                  type="checkbox"
                  disabled={
                    !notificationSettings.textNotificationsEnabled &&
                    !notificationSettings.emailNotificationsEnabled
                  }
                  checked={notificationSettings[option.key]}
                  onChange={() => handleNotificationToggle(option.key)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 mt-0.5"
                />
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-gray-600">
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Save button and message */}
        <div>
          <HapticButton
            onClick={handleSaveSettings}
            disabled={isSaving}
            className={twMerge(
              "w-full px-4 py-3 rounded-md font-semibold transition-colors",
              isSaving
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700 text-white"
            )}
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </HapticButton>
        </div>
      </GenericStatCard>
    </div>
  );
}

function GenericStatCard({
  children,
  className,
  color,
  ...rest
}: CardProps & { color: "white" | "gray" }) {
  return (
    <Card
      {...rest}
      className={twMerge(
        "p-4 border-gray-200 rounded-lg transition-all",
        color === "white"
          ? "bg-white"
          : "bg-linear-to-br from-gray-50 to-gray-100 border-2",
        className
      )}
    >
      {children}
    </Card>
  );
}
