import { Brief, User } from "@prisma/client";
import { generateBrief, generateFlashCards } from "@/lib/claude";
import { fetchArticlesForSector } from "@/lib/newsapi";
import { prisma } from "@/lib/prisma";
import { getSectorByAny, getSectorById } from "@/lib/sectors";
import { isServerlessSqliteRuntime } from "@/lib/runtime";
import { BriefApiItem, FlashCard } from "@/types/signaldesk";
import { fetchArticles } from "@/lib/newsapi";
import { generateBriefForQuery, generateFlashCardsForQuery } from "@/lib/claude";
import { parseQuery } from "@/lib/queryParser";
import { ParsedQuery } from "@/types/signaldesk";

function parseJsonArray<T>(value: string, fallback: T[]): T[] {
  try {
    const parsed = JSON.parse(value) as T[];
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function encodeBriefId(sectorId: string, articleUrl: string) {
  return Buffer.from(JSON.stringify({ sectorId, articleUrl }), "utf8").toString("base64url");
}

function decodeBriefId(id: string): { sectorId: string; articleUrl: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(id, "base64url").toString("utf8")) as {
      sectorId?: string;
      articleUrl?: string;
    };

    if (!parsed.sectorId || !parsed.articleUrl) {
      return null;
    }

    return {
      sectorId: parsed.sectorId,
      articleUrl: parsed.articleUrl
    };
  } catch {
    return null;
  }
}

function serializeBrief(brief: Brief): BriefApiItem {
  const sector = getSectorByAny(brief.sector);
  return {
    id: sector ? encodeBriefId(sector.id, brief.articleUrl) : brief.id,
    sectorId: sector?.id,
    articleUrl: brief.articleUrl,
    articleTitle: brief.articleTitle,
    sector: brief.sector,
    headline: brief.headline,
    deck: brief.deck,
    talkingPoints: parseJsonArray<string>(brief.talkingPoints, []),
    interviewAngle: brief.interviewAngle,
    flashCards: parseJsonArray<FlashCard>(brief.flashCards, []),
    publishedAt: brief.publishedAt.toISOString(),
    createdAt: brief.createdAt.toISOString()
  };
}

async function buildEphemeralBriefsForSector(sectorId: string, sectorLabel: string) {
  const articles = await fetchArticlesForSector(sectorId);

  const briefs = await Promise.all(
    articles.map(async (article) => {
      const briefContent = await generateBrief(article, sectorLabel);
      const flashCards = await generateFlashCards(briefContent, sectorLabel);

      return {
        id: encodeBriefId(sectorId, article.url),
        sectorId,
        articleUrl: article.url,
        articleTitle: article.title,
        sector: sectorLabel,
        headline: briefContent.headline,
        deck: briefContent.deck,
        talkingPoints: briefContent.talking_points,
        interviewAngle: briefContent.interview_angle,
        flashCards,
        publishedAt: new Date(article.publishedAt).toISOString(),
        createdAt: new Date().toISOString()
      } satisfies BriefApiItem;
    })
  );

  return briefs.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

async function getFreshCachedBriefs(sectorLabel: string) {
  const freshBoundary = new Date(Date.now() - 60 * 60 * 1000);
  return prisma.brief.findMany({
    where: {
      sector: sectorLabel,
      createdAt: {
        gte: freshBoundary
      }
    },
    orderBy: {
      publishedAt: "desc"
    }
  });
}

async function buildBriefsForSector(sectorId: string, sectorLabel: string) {
  const articles = await fetchArticlesForSector(sectorId);

  const briefs = await Promise.all(
    articles.map(async (article) => {
      const briefContent = await generateBrief(article, sectorLabel);
      const flashCards = await generateFlashCards(briefContent, sectorLabel);

      return prisma.brief.upsert({
        where: {
          articleUrl: article.url
        },
        update: {
          articleTitle: article.title,
          sector: sectorLabel,
          headline: briefContent.headline,
          deck: briefContent.deck,
          talkingPoints: JSON.stringify(briefContent.talking_points),
          interviewAngle: briefContent.interview_angle,
          flashCards: JSON.stringify(flashCards),
          publishedAt: new Date(article.publishedAt),
          createdAt: new Date()
        },
        create: {
          articleUrl: article.url,
          articleTitle: article.title,
          sector: sectorLabel,
          headline: briefContent.headline,
          deck: briefContent.deck,
          talkingPoints: JSON.stringify(briefContent.talking_points),
          interviewAngle: briefContent.interview_angle,
          flashCards: JSON.stringify(flashCards),
          publishedAt: new Date(article.publishedAt)
        }
      });
    })
  );

  return briefs.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

export async function normalizeUserDailyUsage(user: User) {
  const today = new Date().toISOString().slice(0, 10);

  if (user.lastBriefDate !== today) {
    return prisma.user.update({
      where: { id: user.id },
      data: {
        briefsToday: 0,
        lastBriefDate: today
      }
    });
  }

  return user;
}

export async function getBriefsForSector(params: { sectorId: string; userId: string }) {
  const sector = getSectorById(params.sectorId);
  if (!sector) {
    throw new Error("Invalid sector");
  }

  if (isServerlessSqliteRuntime()) {
    const briefs = await buildEphemeralBriefsForSector(sector.id, sector.label);
    return {
      briefs,
      isTruncated: false,
      briefsToday: 0
    };
  }

  const userRecord = await prisma.user.findUnique({
    where: {
      id: params.userId
    }
  });

  if (!userRecord) {
    throw new Error("User not found");
  }

  const user = await normalizeUserDailyUsage(userRecord);
  const cached = await getFreshCachedBriefs(sector.label);
  const briefs = cached.length > 0 ? cached : await buildBriefsForSector(sector.id, sector.label);

  const isTruncated = !user.isPro && user.briefsToday >= 3;
  const visibleBriefs = isTruncated ? briefs.slice(0, 1) : briefs;

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      briefsToday: user.briefsToday + 1,
      lastBriefDate: new Date().toISOString().slice(0, 10)
    }
  });

  return {
    briefs: visibleBriefs.map(serializeBrief),
    isTruncated,
    briefsToday: updatedUser.briefsToday
  };
}

export async function getBriefById(id: string) {
  if (isServerlessSqliteRuntime()) {
    const decoded = decodeBriefId(id);
    if (!decoded) {
      return null;
    }

    const sector = getSectorById(decoded.sectorId);
    if (!sector) {
      return null;
    }

    const briefs = await buildEphemeralBriefsForSector(sector.id, sector.label);
    return briefs.find((brief) => brief.articleUrl === decoded.articleUrl) ?? null;
  }

  const brief = await prisma.brief.findUnique({
    where: { id }
  });

  return brief ? serializeBrief(brief) : null;
}

function serializeQueryBrief(brief: {
  id: string;
  articleUrl: string;
  articleTitle: string;
  sector: string;
  headline: string;
  deck: string;
  talkingPoints: string;
  interviewAngle: string;
  flashCards: string;
  publishedAt: Date;
  createdAt: Date;
  query: string | null;
  parsedTerms: string | null;
  source: string | null;
}): BriefApiItem {
  let contextLabel: string | undefined;
  if (brief.parsedTerms) {
    try {
      const pt = JSON.parse(brief.parsedTerms) as { contextLabel?: string };
      contextLabel = pt.contextLabel;
    } catch {
      // ignore
    }
  }
  return {
    id: brief.id,
    articleUrl: brief.articleUrl,
    articleTitle: brief.articleTitle,
    sector: brief.sector,
    headline: brief.headline,
    deck: brief.deck,
    talkingPoints: parseJsonArray<string>(brief.talkingPoints, []),
    interviewAngle: brief.interviewAngle,
    flashCards: parseJsonArray<FlashCard>(brief.flashCards, []),
    publishedAt: brief.publishedAt.toISOString(),
    createdAt: brief.createdAt.toISOString(),
    query: brief.query ?? undefined,
    contextLabel,
    source: brief.source ?? undefined
  };
}

async function getFreshCachedBriefsForQuery(query: string) {
  const freshBoundary = new Date(Date.now() - 2 * 60 * 60 * 1000);
  return prisma.brief.findMany({
    where: {
      query,
      createdAt: { gte: freshBoundary }
    },
    orderBy: { publishedAt: "desc" }
  });
}

async function buildBriefsForQuery(parsedQuery: ParsedQuery, rawQuery: string) {
  const articles = await fetchArticles(parsedQuery);

  const briefs = await Promise.all(
    articles.map(async (article) => {
      const briefContent = await generateBriefForQuery(article, parsedQuery);
      const flashCards = await generateFlashCardsForQuery(briefContent, parsedQuery);

      return prisma.brief.upsert({
        where: { articleUrl: article.url },
        update: {
          articleTitle: article.title,
          sector: parsedQuery.sector ?? "",
          headline: briefContent.headline,
          deck: briefContent.deck,
          talkingPoints: JSON.stringify(briefContent.talking_points),
          interviewAngle: briefContent.interview_angle,
          flashCards: JSON.stringify(flashCards),
          publishedAt: new Date(article.publishedAt),
          createdAt: new Date(),
          query: rawQuery,
          parsedTerms: JSON.stringify(parsedQuery),
          source: article.sourceName
        },
        create: {
          articleUrl: article.url,
          articleTitle: article.title,
          sector: parsedQuery.sector ?? "",
          headline: briefContent.headline,
          deck: briefContent.deck,
          talkingPoints: JSON.stringify(briefContent.talking_points),
          interviewAngle: briefContent.interview_angle,
          flashCards: JSON.stringify(flashCards),
          publishedAt: new Date(article.publishedAt),
          query: rawQuery,
          parsedTerms: JSON.stringify(parsedQuery),
          source: article.sourceName
        }
      });
    })
  );

  return briefs.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

export async function getBriefsForQuery(params: { query: string; userId: string }) {
  const parsedQuery = await parseQuery(params.query);

  if (isServerlessSqliteRuntime()) {
    const articles = await fetchArticles(parsedQuery);
    const briefs = await Promise.all(
      articles.map(async (article) => {
        const briefContent = await generateBriefForQuery(article, parsedQuery);
        const flashCards = await generateFlashCardsForQuery(briefContent, parsedQuery);
        return {
          id: article.url,
          articleUrl: article.url,
          articleTitle: article.title,
          sector: parsedQuery.sector ?? "",
          headline: briefContent.headline,
          deck: briefContent.deck,
          talkingPoints: briefContent.talking_points,
          interviewAngle: briefContent.interview_angle,
          flashCards,
          publishedAt: article.publishedAt,
          createdAt: new Date().toISOString(),
          query: params.query,
          contextLabel: parsedQuery.contextLabel,
          source: article.sourceName
        } satisfies BriefApiItem;
      })
    );
    return { briefs, isTruncated: false, briefsToday: 0 };
  }

  const userRecord = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!userRecord) throw new Error("User not found");

  const user = await normalizeUserDailyUsage(userRecord);
  const cached = await getFreshCachedBriefsForQuery(params.query);
  const briefs =
    cached.length > 0 ? cached : await buildBriefsForQuery(parsedQuery, params.query);

  const isTruncated = !user.isPro && user.briefsToday >= 3;
  const visibleBriefs = isTruncated ? briefs.slice(0, 1) : briefs;

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      briefsToday: user.briefsToday + 1,
      lastBriefDate: new Date().toISOString().slice(0, 10)
    }
  });

  return {
    briefs: visibleBriefs.map(serializeQueryBrief),
    isTruncated,
    briefsToday: updatedUser.briefsToday
  };
}
