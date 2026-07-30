"use client";

import { createClient } from "./client";

const supabase = createClient();

// Constants
const BUCKET_NAME = "site-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Get all images from the storage bucket
 */
export async function getAllImages(): Promise<string[]> {
	console.log("Fetching all images from bucket:", BUCKET_NAME);

	try {
		// Check if bucket exists first
		console.log("Checking for bucket existence...");
		const { data: buckets, error: bucketError } =
			await supabase.storage.listBuckets();

		if (bucketError) {
			console.error("Error listing buckets:", bucketError);
			console.error("Bucket error details:", {
				message: bucketError.message,
			});
			return [];
		}

		console.log(
			"Available buckets:",
			buckets?.map((b) => b.name),
		);

		// If bucket doesn't exist, we can't create it from the client side
		// It must be created from the Supabase dashboard
		if (!buckets?.some((b) => b.name === BUCKET_NAME)) {
			console.error(
				`Bucket "${BUCKET_NAME}" not found. Please create it in the Supabase dashboard.`,
			);
			console.log(
				"You need to:",
				[
					"1. Go to Supabase Dashboard",
					"2. Select Storage from the sidebar",
					"3. Click 'New Bucket'",
					"4. Enter 'site-images' as the name",
					"5. Make sure to set it as public",
				].join("\n"),
			);
			return [];
		}

		console.log(`Found bucket "${BUCKET_NAME}", proceeding with operation...`);

		const { data, error } = await supabase.storage.from(BUCKET_NAME).list();

		if (error) {
			console.error("Error listing files:", error);
			return [];
		}

		if (!data) {
			console.log("No files found in bucket");
			return [];
		}

		console.log(
			"Found files:",
			data.map((f) => f.name),
		);

		return data
			.filter((file) => !file.name.startsWith("."))
			.map((file) => {
				const {
					data: { publicUrl },
				} = supabase.storage.from(BUCKET_NAME).getPublicUrl(file.name);
				return publicUrl;
			});
	} catch (error) {
		console.error("Error in getAllImages:", error);
		return [];
	}
}

export interface UploadResult {
	url: string;
	error: Error | null;
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
			};
		}

		if (!session) {
			console.error("No active session found");
			return {
				url: "",
				error: new Error("Must be authenticated to upload files"),
			};
		}

		console.log("User authenticated successfully:", session.user?.email);

		if (file.size > MAX_FILE_SIZE) {
			return { url: "", error: new Error("File size must be less than 5MB") };
		}

		const timestamp = new Date().getTime();
		const fileName = `${timestamp}-${file.name}`;
		console.log("Generated filename:", fileName);

		console.log("Attempting upload to bucket:", BUCKET_NAME);
		const { data, error } = await supabase.storage
			.from(BUCKET_NAME)
			.upload(fileName, file, {
				cacheControl: "3600",
				upsert: true,
			});

		if (error) {
			console.error("Upload error:", error);
			return { url: "", error: new Error(error.message) };
		}

		if (!data?.path) {
			return { url: "", error: new Error("Upload failed - no path returned") };
		}

		console.log("Upload successful, getting public URL");
		const {
			data: { publicUrl },
		} = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

		console.log("Generated public URL:", publicUrl);
		return { url: publicUrl, error: null };
	} catch (error) {
		console.error("Unexpected error during upload:", error);
		return {
			url: "",
			error: error instanceof Error ? error : new Error("Unknown upload error"),
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
