"use client";

import { useState } from "react";
import Card from "./Card";
import { useData } from "@/lib/DataContext";
import { useToast } from "@/lib/ToastContext";
import { unknownToErrorString } from "@/lib/utils/unknownToErrorString";
import { HapticButton } from "./HapticButton";

type CreateRoundProps = {
  leagueId: string;
  isBonusRound: boolean;
};

export function CreateRound({ leagueId, isBonusRound }: CreateRoundProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshData } = useData();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/leagues/${leagueId}/rounds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, description, isBonusRound }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create round");
      }

      // Reset form and close
      setTitle("");
      setDescription("");
      setIsOpen(false);
    } catch (err) {
      const message = unknownToErrorString(err, "Failed to create round");
      toast.show({
        title: "Failed to create round",
        message,
        variant: "error",
      });
      setError(message);
    } finally {
      setIsSubmitting(false);
      refreshData("manual");
    }
  };

  if (!isOpen) {
    return (
      <Card className="p-6 text-center border-2 border-dashed border-purple-300 bg-purple-50">
        <p className="text-gray-700 mb-3">
          {isBonusRound
            ? "Congrats! You have a bonus round."
            : "You haven't created your round yet."}
        </p>
        <HapticButton
          onClick={() => setIsOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          {isBonusRound ? "Create Your Bonus Round" : "Create Your Round"}
        </HapticButton>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-2 border-purple-300 bg-purple-50">
      <h3 className="text-xl font-bold mb-4 text-purple-900">
        {isBonusRound ? "Create Your Bonus Round" : "Create Your Round"}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Round Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={100}
            placeholder="e.g., 90s Hip Hop, Summer Vibes, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={500}
            rows={4}
            placeholder="Describe the theme or criteria for this round..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            disabled={isSubmitting}
          />
          <p className="text-sm text-gray-500 mt-1">
            {description.length}/500 characters
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <HapticButton
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "Create Round"}
          </HapticButton>
          <HapticButton
            type="button"
            onClick={() => {
              setIsOpen(false);
              setTitle("");
              setDescription("");
              setError(null);
            }}
            disabled={isSubmitting}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-200 disabled:cursor-not-allowed"
          >
            Cancel
          </HapticButton>
        </div>
      </form>
    </Card>
  );
}
