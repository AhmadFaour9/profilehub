"use client";

import { AnalyticsOverview } from "@/modules/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, MousePointerClick, Users, TrendingUp } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

export function AnalyticsCards({ data }: { data: AnalyticsOverview }) {
  const { t } = useTranslation();

  const metrics = [
    {
      title: t("analytics.views"),
      value: data.totalViews.toLocaleString(),
      icon: Eye,
      trend: "+12.5%",
      trendUp: true,
    },
    {
      title: t("analytics.clicks"),
      value: data.totalClicks.toLocaleString(),
      icon: MousePointerClick,
      trend: "+8.2%",
      trendUp: true,
    },
    {
      title: t("analytics.visitors"),
      value: data.uniqueVisitors.toLocaleString(),
      icon: Users,
      trend: "+15.3%",
      trendUp: true,
    },
    {
      title: t("analytics.conversionRate"),
      value: `${data.conversionRate ?? data.growthRate}%`,
      icon: TrendingUp,
      trend: "+2.1%",
      trendUp: true,
    },
  ];

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="analytics-cards">
      {metrics.map((metric) => (
        <Card key={metric.title} className="min-w-0">
          <CardHeader className="flex min-w-0 flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="min-w-0 break-words text-sm font-medium [overflow-wrap:anywhere]">
              {metric.title}
            </CardTitle>
            <metric.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className={metric.trendUp ? "text-green-500" : "text-red-500"}>
                {metric.trend}
              </span>{" "}
              {t("analytics.fromLastMonth")}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
