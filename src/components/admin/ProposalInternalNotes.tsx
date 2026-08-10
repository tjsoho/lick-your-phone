"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addInternalNote } from "@/server-actions/proposals";
import { formatDate } from "@/lib/format";
import toast from "react-hot-toast";

type Note = {
  id: string;
  content: string;
  created_at: string;
};

export default function ProposalInternalNotes({
  proposalId,
  initialNotes = [],
}: {
  proposalId: string;
  initialNotes?: Note[];
}) {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    const { data, error } = await addInternalNote(proposalId, content);
    setSubmitting(false);

    if (error) {
      toast.error(error);
      return;
    }

    if (data) {
      setNotes((prev) => [...prev, data]);
      setContent("");
      toast.success("Note added");
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {notes.length > 0 ? (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="text-sm text-gray-700 border-l-2 border-gray-200 pl-3"
            >
              <p className="whitespace-pre-wrap">{note.content}</p>
              <p className="text-xs text-gray-400 mt-1">
                {formatDate(note.created_at)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No internal notes yet.</p>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Add an internal note..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-lyp-cherry"
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="bg-lyp-cherry text-white px-4 py-1.5 rounded text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50"
        >
          {submitting ? "Adding..." : "Add Note"}
        </button>
      </form>
    </div>
  );
}
