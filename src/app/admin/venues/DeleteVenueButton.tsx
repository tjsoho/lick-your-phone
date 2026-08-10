"use client";

import { useState } from "react";
import { Trash } from "lucide-react";
import { deleteVenue } from "@/server-actions/venues";
import toast from "react-hot-toast";

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
      className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
      title="Delete"
    >
      <Trash className="h-4 w-4" />
    </button>
  );
}
