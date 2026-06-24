export interface Market {
  id: string;
  question: string;
  status: "active" | "resolved" | "disputed";
  resolutionTime: string;
}

export async function listMarkets(): Promise<Market[]> {
  return [];
}

export async function getMarketById(_id: string): Promise<Market | null> {
  return null;
}
