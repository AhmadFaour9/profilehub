import { Router, type IRouter } from "express";
import { eq, count, sql } from "drizzle-orm";
import { db, pageViewsTable, linkClicksTable, linksTable } from "@workspace/db";
import {
  GetAnalyticsOverviewResponse,
  GetPageViewsQueryParams,
  GetPageViewsResponse,
  GetLinkAnalyticsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const DEMO_PROFILE_ID = "demo-user";

router.get("/me/analytics/overview", async (_req, res): Promise<void> => {
  const totalViewsResult = await db
    .select({ count: count() })
    .from(pageViewsTable)
    .where(eq(pageViewsTable.profileId, DEMO_PROFILE_ID));

  const totalClicksResult = await db
    .select({ count: count() })
    .from(linkClicksTable)
    .where(eq(linkClicksTable.profileId, DEMO_PROFILE_ID));

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  const weekViewsResult = await db
    .select({ count: count() })
    .from(pageViewsTable)
    .where(
      sql`${pageViewsTable.profileId} = ${DEMO_PROFILE_ID} AND ${pageViewsTable.date} >= ${sevenDaysAgoStr}`
    );

  const weekClicksResult = await db
    .select({ count: count() })
    .from(linkClicksTable)
    .where(
      sql`${linkClicksTable.profileId} = ${DEMO_PROFILE_ID} AND ${linkClicksTable.createdAt} >= ${sevenDaysAgo.toISOString()}`
    );

  const overview = {
    totalViews: totalViewsResult[0]?.count ?? 0,
    totalClicks: totalClicksResult[0]?.count ?? 0,
    uniqueVisitors: Math.floor((totalViewsResult[0]?.count ?? 0) * 0.7),
    viewsThisWeek: weekViewsResult[0]?.count ?? 0,
    clicksThisWeek: weekClicksResult[0]?.count ?? 0,
    topCountry: "AE",
    growthRate: 12.5,
  };

  res.json(GetAnalyticsOverviewResponse.parse(overview));
});

router.get("/me/analytics/views", async (req, res): Promise<void> => {
  const queryParams = GetPageViewsQueryParams.safeParse(req.query);
  const period = queryParams.success ? (queryParams.data.period ?? "30d") : "30d";
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;

  const result = await db
    .select({
      date: pageViewsTable.date,
      count: count(),
    })
    .from(pageViewsTable)
    .where(eq(pageViewsTable.profileId, DEMO_PROFILE_ID))
    .groupBy(pageViewsTable.date);

  const dateMap = new Map(result.map((r) => [r.date, r.count]));

  const points = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const date = d.toISOString().split("T")[0];
    return { date, value: dateMap.get(date) ?? 0 };
  });

  res.json(GetPageViewsResponse.parse(points));
});

router.get("/me/analytics/links", async (_req, res): Promise<void> => {
  const links = await db
    .select()
    .from(linksTable)
    .where(eq(linksTable.profileId, DEMO_PROFILE_ID));

  const totalClicks = links.reduce((sum, l) => sum + l.clickCount, 0);

  const analytics = links
    .sort((a, b) => b.clickCount - a.clickCount)
    .map((link) => ({
      linkId: link.id,
      title: link.title,
      url: link.url,
      clicks: link.clickCount,
      percentage: totalClicks > 0 ? Math.round((link.clickCount / totalClicks) * 100) : 0,
    }));

  res.json(GetLinkAnalyticsResponse.parse(analytics));
});

export default router;
