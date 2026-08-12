declare interface Provider {
  id: string;
  name: string;
  type: "photographer" | "videographer";
  description: string | null;
  portfolio_url: string | null;
  price_cents: number;
  image_url: string | null;
  provider_states: { states: { id: string; code: string; name: string } }[];
}
