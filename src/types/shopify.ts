export interface SubscriptionOption {
	id: string;
	title: string;
	price: {
		amount: string;
		currencyCode: string;
	};
	discount?: {
		percentage: number;
		amount: string;
	};
	frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
	interval: number;
}

export interface ShopifyProduct {
	id: string;
	title: string;
	handle: string;
	description: string;
	images: {
		id: string;
		url: string;
		altText: string;
	}[];
	variants: {
		id: string;
		title: string;
		price: {
			amount: string;
			currencyCode: string;
		};
		availableForSale: boolean;
		selectedOptions: {
			name: string;
			value: string;
		}[];
	}[];
	options: {
		id: string;
		name: string;
		values: string[];
	}[];
	tags: string[];
	productType: string;
	vendor: string;
	createdAt: string;
	updatedAt: string;
	metafields?: {
		Benefits?: string;
		Ingredients?: string;
		"How to use"?: string;
		"Why STAIT"?: string;
	};
	subscriptionOptions?: SubscriptionOption[];
}

export interface CartItem {
	id: string;
	variantId: string;
	quantity: number;
	purchaseType: "one-time" | "subscription";
	subscriptionOption?: SubscriptionOption;
	product: {
		id: string;
		title: string;
		handle: string;
		image: {
			url: string;
			altText: string;
		};
		price: {
			amount: string;
			currencyCode: string;
		};
	};
}

export interface Cart {
	id: string;
	lines: {
		edges: {
			node: CartItem;
		}[];
	};
	totalQuantity: number;
	cost: {
		totalAmount: {
			amount: string;
			currencyCode: string;
		};
		subtotalAmount: {
			amount: string;
			currencyCode: string;
		};
	};
}

export interface ShopifyError {
	message: string;
	locations?: {
		line: number;
		column: number;
	}[];
	path?: string[];
}

export interface ProductReview {
	id: string;
	title: string;
	content: string;
	rating: number;
	author: {
		name: string;
		email?: string;
	};
	createdAt: string;
	updatedAt: string;
	verified: boolean;
}

export interface ReviewSummary {
	averageRating: number;
	totalReviews: number;
	ratingDistribution: {
		rating: number;
		count: number;
	}[];
}
