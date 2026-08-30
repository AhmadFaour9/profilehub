"use client";

import { useLocale } from "@/lib/i18n/client";

import { AnalyticsCards } from "@/components/dashboard/AnalyticsCards";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { AnalyticsBreakdownItem, AnalyticsOverview, AnalyticsRangeSummary, LinkAnalytics, TimeSeriesPoint } from "@/modules/shared";

const emptyOverview: AnalyticsOverview = { totalViews: 0, totalClicks: 0, conversionRate: 0, uniqueVisitors: 0, viewsThisWeek: 0, clicksThisWeek: 0, growthRate: 0, topCountry: null };
const emptyRangeSummary: AnalyticsRangeSummary = { dailyViews: 0, weeklyViews: 0, monthlyViews: 0 };

export default function Analytics({
  overview = emptyOverview,
  pageViews = [],
  linkAnalytics = [],
  weeklyViews = [],
  monthlyViews = [],
  referrers = [],
  countries = [],
  devices = [],
  rangeSummary = emptyRangeSummary,
}: {
  overview?: AnalyticsOverview;
  pageViews?: TimeSeriesPoint[];
  linkAnalytics?: LinkAnalytics[];
  weeklyViews?: TimeSeriesPoint[];
  monthlyViews?: TimeSeriesPoint[];
  referrers?: AnalyticsBreakdownItem[];
  countries?: AnalyticsBreakdownItem[];
  devices?: AnalyticsBreakdownItem[];
  rangeSummary?: AnalyticsRangeSummary;
}) {
  const { t } = useLocale();
  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-3xl font-serif">{t("analytics.title")}</h1>
        <p className="text-muted-foreground mt-1">Track your profile views and link clicks over time.</p>
      </div>

      <AnalyticsCards data={overview} />

      <div className="grid gap-4 md:grid-cols-3">
        <RangeMetric label="Daily views" value={rangeSummary.dailyViews} helper="Last 24 hours" />
        <RangeMetric label="Weekly views" value={rangeSummary.weeklyViews} helper="Last 7 days" />
        <RangeMetric label="Monthly views" value={rangeSummary.monthlyViews} helper="Last 30 days" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border rounded-xl bg-card p-6">
          <h2 className="text-lg font-medium mb-6">Page Views (Last 30 Days)</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pageViews}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border rounded-xl bg-card p-6">
          <h2 className="text-lg font-medium mb-6">Top Links</h2>
          <BreakdownList
            items={linkAnalytics.map((link) => ({ label: link.title, value: link.clicks, percentage: link.percentage }))}
            emptyText="No link clicks yet."
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <BreakdownPanel title="Top Referrers" items={referrers} emptyText="No referrer data yet." />
        <BreakdownPanel title="Countries" items={countries} emptyText="No country data yet." />
        <BreakdownPanel title="Devices" items={devices} emptyText="No device data yet." />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TrendList title="Weekly Views" items={weeklyViews} />
        <TrendList title="Monthly Views" items={monthlyViews} />
      </div>
    </div>
  );
}

function RangeMetric({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-foreground">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function BreakdownPanel({ title, items, emptyText }: { title: string; items: AnalyticsBreakdownItem[]; emptyText: string }) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="mb-6 text-lg font-medium">{title}</h2>
      <BreakdownList items={items} emptyText={emptyText} />
    </div>
  );
}

function BreakdownList({ items, emptyText }: { items: AnalyticsBreakdownItem[]; emptyText: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="space-y-5">
      {items.map((item) => (
        <div key={item.label} className="space-y-2">
          <div className="flex justify-between gap-3 text-sm">
            <span className="font-medium truncate" title={item.label}>{item.label}</span>
            <span className="text-muted-foreground font-medium">{item.value.toLocaleString()}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(item.percentage, item.value > 0 ? 2 : 0)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendList({ title, items }: { title: string; items: TimeSeriesPoint[] }) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="mb-4 text-lg font-medium">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.date} className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">{item.date}</p>
            <p className="mt-1 text-lg font-semibold">{item.value.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
