"use client";

import { useState } from "react";
import Card from "./Card";

type CreateRoundProps = {
  leagueId: string;
  onRoundCreated: () => void;
};

export function CreateRound({ leagueId, onRoundCreated }: CreateRoundProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ title, description }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create round");
      }

      // Reset form and close
      setTitle("");
      setDescription("");
      setIsOpen(false);
      onRoundCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create round");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <Card className="p-6 text-center border-2 border-dashed border-blue-300 bg-blue-50">
        <p className="text-gray-700 mb-3">
          You haven&apos;t created your round yet.
        </p>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Create Your Round
        </button>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-2 border-blue-300 bg-blue-50">
      <h3 className="text-xl font-bold mb-4 text-blue-900">
        Create Your Round
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "Create Round"}
          </button>
          <button
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
          </button>
        </div>
      </form>
    </Card>
  );
}
