/**
 * VYRO-owned sports types. Provider adapters translate their API into these;
 * provider response shapes must never leak past src/server/providers/sports.
 *
 * DRAFT: field names and the playback model are placeholders until the real
 * provider's API documentation is supplied (see
 * docs/architecture/provider-integrations.md). Do not build UI against
 * fields marked TBD.
 */

export type Sport = "football" | "basketball";

export type MatchStatus =
  "scheduled" | "live" | "halftime" | "finished" | "postponed" | "cancelled";

export type TeamRef = { id: string; name: string; shortName: string; crestUrl: string | null };

export type MatchSummary = {
  id: string;
  sport: Sport;
  competition: { id: string; name: string };
  home: TeamRef;
  away: TeamRef;
  startsAt: string; // ISO-8601 UTC
  status: MatchStatus;
  score: { home: number; away: number } | null;
  minute: number | null;
  streamAvailable: boolean;
};

export type MatchQuery = {
  sport?: Sport;
  status?: MatchStatus;
  from?: string;
  to?: string;
  cursor?: string;
  limit: number;
};

export type MatchPage = { items: MatchSummary[]; nextCursor: string | null; stale: boolean };

export type MatchDetails = MatchSummary & {
  venue: string | null; // TBD: depends on provider data
};

export type PlaybackRequest = { matchId: string; viewerId: string; countryCode: string | null };

/** Result of a per-viewer playback authorization. Never cached or logged. */
export type PlaybackAccess =
  | { status: "available"; playbackUrl: string; expiresAt: string } // TBD: DRM/token model
  | { status: "unavailable"; reason: "not_live" | "region_restricted" | "not_licensed" | "expired" }
  | { status: "error"; retryable: boolean };

export interface SportsProvider {
  listMatches(query: MatchQuery): Promise<MatchPage>;
  getMatch(providerMatchId: string): Promise<MatchDetails | null>;
  getPlaybackAccess(request: PlaybackRequest): Promise<PlaybackAccess>;
}
