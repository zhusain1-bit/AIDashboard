export interface Article {
  title: string;
  description: string;
  url: string;
  sourceName: string;
  publishedAt: string;
}

export interface BriefContent {
  headline: string;
  deck: string;
  talking_points: string[];
  interview_angle: string;
}

export interface FlashCard {
  question: string;
  answer: string;
}

export interface SectorDef {
  id: string;
  label: string;
  keywords: string[];
  proxyTickers?: string[];
  macroSeries?: Array<{
    id: string;
    label: string;
  }>;
}

export interface BriefApiItem {
  id: string;
  sectorId?: string;
  articleUrl: string;
  articleTitle: string;
  sector: string;
  headline: string;
  deck: string;
  talkingPoints: string[];
  interviewAngle: string;
  flashCards: FlashCard[];
  publishedAt: string;
  createdAt: string;
}

export interface TranscriptItem {
  symbol: string;
  title: string;
  date: string;
  url: string;
  source: string;
}

export interface FilingItem {
  ticker: string;
  companyName: string;
  form: string;
  filedAt: string;
  filingUrl: string;
}

export interface MacroSnapshot {
  seriesId: string;
  label: string;
  value: string;
  date: string;
  change?: string;
}
