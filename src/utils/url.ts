/**
 * Ensures a URL is an absolute external URL with https:// protocol
 * @param url - The URL to normalize
 * @returns The normalized URL with https:// prefix, or undefined if empty
 */
export function ensureAbsoluteUrl(url: string | undefined | null): string | undefined {
	if (!url || !url.trim()) {
		return undefined;
	}

	const trimmed = url.trim();

	// If it already starts with http:// or https://, return as is
	if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
		return trimmed;
	}

	// If it starts with //, prepend https:
	if (trimmed.startsWith("//")) {
		return `https:${trimmed}`;
	}

	// Otherwise, prepend https://
	return `https://${trimmed}`;
}


