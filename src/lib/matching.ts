import type { Buyer, Deal } from "@prisma/client";
import { parseList } from "@/lib/format";

export type MatchResult = {
  buyer: Buyer;
  matched: boolean;
  reasons: string[];
};

// Lightweight visual signal — NOT a scoring engine. A buyer is a "match" when
// every criterion they actually set (market / asset type / price range) is
// satisfied by the deal. Buyers with no criteria match by default. `reasons`
// are short chips explaining why, shown next to the buyer in the send list.
export function evaluateMatch(buyer: Buyer, deal: Deal): MatchResult {
  const reasons: string[] = [];
  let matched = true;

  // Market: city / state / zip overlap.
  const markets = parseList(buyer.markets);
  if (markets.length > 0) {
    const dealMarkets = [deal.city, deal.state, deal.zip]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase());
    const hit = markets.some((m) =>
      dealMarkets.some((dm) => dm === m || dm.includes(m) || m.includes(dm)),
    );
    if (hit) reasons.push(deal.city);
    else matched = false;
  }

  // Asset type.
  const types = parseList(buyer.propertyTypes);
  if (types.length > 0 && deal.propertyType) {
    if (types.includes(deal.propertyType.toLowerCase())) reasons.push(deal.propertyType);
    else matched = false;
  }

  // Price range against asking price.
  if (deal.askingPrice != null) {
    if (buyer.minPrice != null && deal.askingPrice < buyer.minPrice) matched = false;
    else if (buyer.maxPrice != null && deal.askingPrice > buyer.maxPrice) matched = false;
    else if (buyer.minPrice != null || buyer.maxPrice != null) reasons.push("in budget");
  }

  return { buyer, matched, reasons };
}

// Rank a buyer list for a deal: matches first, then alphabetical.
export function matchBuyersToDeal(buyers: Buyer[], deal: Deal): MatchResult[] {
  return buyers
    .map((b) => evaluateMatch(b, deal))
    .sort((a, b) => {
      if (a.matched !== b.matched) return a.matched ? -1 : 1;
      return a.buyer.name.localeCompare(b.buyer.name);
    });
}
