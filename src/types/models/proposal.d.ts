declare interface Proposal {
  id: string;
  client_id: string;
  venue_id: string;
  status: "signed" | "sent" | "draft" | "superseded" | "intake_completed";
  token: string;
  discount_expires_at: string | null;
  signed_at: string | null;
  signer_email: string | null;
  total_snapshot_cents: number | null;
}

declare interface ProposalLineItem {
  id: string;
  proposal_id: string;
  service_id: string;
  service_tier_id: string;
  price_snapshot_cents: number;
  billing_cycle_snapshot_months: number;
  billing: string;
  term: string | null;
}

declare interface ProposalWithClient extends Proposal {
  client: Client;
}

declare interface ProposalWithVenue extends Proposal {
  venue: Venue;
}

declare interface ProposalWithProposalLineItems extends Proposal {
  proposal_line_items: ProposalLineItem[];
}

declare interface ProposalWithClientWithVenueWithProposalLineItems extends Proposal {
  client: Client;
  venue: Venue;
  proposal_line_items: ProposalLineItem[];
}
