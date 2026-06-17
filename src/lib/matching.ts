import type { Buyer, Deal } from "@prisma/client";
import { parseList } from "@/lib/format";

export type MatchResult = {
  buyer: Buyer;
  matched: boolean;
  score: number;
  reasons: string[];
  // Reasons a buyer with stated criteria was excluded.
  misses: string[];
};

// Decide whether a deal fits a buyer's stated criteria, and how strongly.
//
// Rules: a buyer constrains matching only by the criteria they actually set.
// If the buyer set a constraint that the deal violates, it's not a match. Each
// satisfied, explicitly-set criterion adds to the score so stronger fits rank
// higher. A buyer with no criteria still matches (weakly) — useful for small
// lists where the wholesaler blasts everyone.
export function scoreBuyerForDeal(buyer: Buyer, deal: Deal): MatchResult {
  const reasons: string[] = [];
  const misses: string[] = [];
  let score = 0;

  // Market (city / zip)
  const markets = parseList(buyer.markets);
  if (markets.length > 0) {
    const dealMarkets = [deal.city, deal.state, deal.zip]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase());
    const hit = markets.some((m) =>
      dealMarkets.some((dm) => dm === m || dm.includes(m) || m.includes(dm)),
    );
    if (hit) {
      score += 2;
      reasons.push(`Market: ${deal.city}`);
    } else {
      misses.push("Outside target markets");
    }
  }

  // Property type
  const types = parseList(buyer.propertyTypes);
  if (types.length > 0 && deal.propertyType) {
    const hit = types.includes(deal.propertyType.toLowerCase());
    if (hit) {
      score += 1;
      reasons.push(`Type: ${deal.propertyType}`);
    } else {
      misses.push(`Wants ${types.join(", ")}`);
    }
  }

  // Price range against the asking price
  if (deal.askingPrice != null) {
    if (buyer.minPrice != null && deal.askingPrice < buyer.minPrice) {
      misses.push("Below price range");
    } else if (buyer.maxPrice != null && deal.askingPrice > buyer.maxPrice) {
      misses.push("Above price range");
    } else if (buyer.minPrice != null || buyer.maxPrice != null) {
      score += 2;
      reasons.push("In price range");
    }
  }

  const matched = misses.length === 0;
  return { buyer, matched, score, reasons, misses };
}

// Rank a buyer list for a deal. Matches first (highest score), then the rest.
export function matchBuyersToDeal(buyers: Buyer[], deal: Deal): MatchResult[] {
  return buyers
    .map((b) => scoreBuyerForDeal(b, deal))
    .sort((a, b) => {
      if (a.matched !== b.matched) return a.matched ? -1 : 1;
      return b.score - a.score;
    });
}
