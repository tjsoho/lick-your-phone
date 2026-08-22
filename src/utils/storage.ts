"use client";

import { createClient } from "./client";
import { compressImage } from "./image-compression";

const supabase = createClient();

// Constants
const BUCKET_NAME = "site-images";
/** Per-file ceiling, checked before compression. */
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/** Ceiling for a single multi-file selection, checked before compression. */
export const MAX_BATCH_SIZE = 50 * 1024 * 1024; // 50MB

export interface MediaItem {
	name: string;
	url: string;
	size: number;
	createdAt: string | null;
}

/**
 * List every image in the media library, newest first.
 *
 * Supabase's list() defaults to 100 rows, which silently truncates a growing
 * library, so the limit is raised and the sort is explicit.
 */
export async function getAllImages(): Promise<MediaItem[]> {
	try {
		const { data, error } = await supabase.storage.from(BUCKET_NAME).list("", {
			limit: 1000,
			sortBy: { column: "created_at", order: "desc" },
		});

		if (error) {
			console.error("Failed to list media library:", error.message);
			return [];
		}

		if (!data) return [];

		return data
			.filter((file) => !file.name.startsWith("."))
			.filter((file) => /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(file.name))
			.map((file) => {
				const {
					data: { publicUrl },
				} = supabase.storage.from(BUCKET_NAME).getPublicUrl(file.name);
				return {
					name: file.name,
					url: publicUrl,
					size: file.metadata?.size ?? 0,
					createdAt: file.created_at ?? null,
				};
			});
	} catch (error) {
		console.error("Error in getAllImages:", error);
		return [];
	}
}

export interface UploadResult {
	url: string;
	error: Error | null;
	/** Bytes as chosen by the user, before compression. */
	originalSize: number;
	/** Bytes actually stored. */
	uploadedSize: number;
}

/**
 * Upload an image to Supabase Storage
 */
export async function uploadImage(file: File): Promise<UploadResult> {
	console.log("Starting upload for file:", file.name);

	try {
		// Check if user is authenticated
		console.log("Checking authentication status...");
		const {
			data: { session },
			error: sessionError,
		} = await supabase.auth.getSession();

		if (sessionError) {
			console.error("Error getting session:", sessionError);
			return {
				url: "",
				error: new Error(`Authentication error: ${sessionError.message}`),
				originalSize: file.size,
				uploadedSize: 0,
			};
		}

		if (!session) {
			console.error("No active session found");
			return {
				url: "",
				error: new Error("Must be authenticated to upload files"),
				originalSize: file.size,
				uploadedSize: 0,
			};
		}

		console.log("User authenticated successfully:", session.user?.email);

		if (file.size > MAX_FILE_SIZE) {
			return {
				url: "",
				error: new Error(
					`"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)}MB — the limit is 50MB`,
				),
				originalSize: file.size,
				uploadedSize: 0,
			};
		}

		// Downscale and re-encode before the bytes ever leave the browser.
		const { file: upload, originalSize } = await compressImage(file);

		const timestamp = new Date().getTime();
		const fileName = `${timestamp}-${upload.name}`;
		console.log("Generated filename:", fileName);

		console.log("Attempting upload to bucket:", BUCKET_NAME);
		const { data, error } = await supabase.storage
			.from(BUCKET_NAME)
			.upload(fileName, upload, {
				cacheControl: "3600",
				upsert: true,
			});

		if (error) {
			console.error("Upload error:", error);
			return {
				url: "",
				error: new Error(error.message),
				originalSize,
				uploadedSize: 0,
			};
		}

		if (!data?.path) {
			return {
				url: "",
				error: new Error("Upload failed - no path returned"),
				originalSize,
				uploadedSize: 0,
			};
		}

		console.log("Upload successful, getting public URL");
		const {
			data: { publicUrl },
		} = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

		return {
			url: publicUrl,
			error: null,
			originalSize,
			uploadedSize: upload.size,
		};
	} catch (error) {
		console.error("Unexpected error during upload:", error);
		return {
			url: "",
			error: error instanceof Error ? error : new Error("Unknown upload error"),
			originalSize: file.size,
			uploadedSize: 0,
		};
	}
}

/**
 * Delete an image from Supabase Storage
 */
export async function deleteImage(
	url: string,
): Promise<{ error: Error | null }> {
	console.log("Attempting to delete image:", url);

	try {
		// Check if user is authenticated
		const {
			data: { session },
		} = await supabase.auth.getSession();
		if (!session) {
			return { error: new Error("Must be authenticated to delete files") };
		}

		const fileName = url.split("/").pop();
		if (!fileName) {
			return { error: new Error("Invalid URL") };
		}

		console.log("Deleting file:", fileName);
		const { error } = await supabase.storage
			.from(BUCKET_NAME)
			.remove([fileName]);

		if (error) {
			console.error("Delete error:", error);
			return { error: new Error(error.message) };
		}

		console.log("Delete successful");
		return { error: null };
	} catch (error) {
		console.error("Error deleting image:", error);
		return {
			error: error instanceof Error ? error : new Error("Unknown delete error"),
		};
	}
}
