"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteVenue } from "@/server-actions/venues";
import toast from "react-hot-toast";

const EASE = "ease-brand";

type Props = {
  id: string;
  name: string;
};

export default function DeleteVenueButton({ id, name }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    setIsDeleting(true);
    const { success, error } = await deleteVenue(id);
    setIsDeleting(false);

    if (error) {
      toast.error(error);
      return;
    }

    if (success) {
      toast.success("Venue deleted");
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      aria-label={`Delete ${name}`}
      title="Delete"
      className={`rounded-full p-1.5 text-[#A89898] transition-colors duration-500 ${EASE} hover:bg-lyp-cherry/[0.06] hover:text-lyp-cherry focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lyp-cherry/30 disabled:opacity-50`}
    >
      <Trash2 strokeWidth={1.5} className="h-4 w-4" />
    </button>
  );
}
