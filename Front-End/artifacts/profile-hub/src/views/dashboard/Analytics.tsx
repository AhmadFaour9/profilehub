"use client";

import { mockAnalyticsOverview, mockPageViews, mockLinkAnalytics } from "@/lib/mock-data";
import { AnalyticsCards } from "@/components/dashboard/AnalyticsCards";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { AnalyticsOverview, LinkAnalytics, TimeSeriesPoint } from "@/modules/shared";

export default function Analytics({
  overview = mockAnalyticsOverview,
  pageViews = mockPageViews,
  linkAnalytics = mockLinkAnalytics,
}: {
  overview?: AnalyticsOverview;
  pageViews?: TimeSeriesPoint[];
  linkAnalytics?: LinkAnalytics[];
}) {
  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-3xl font-serif">Analytics</h1>
        <p className="text-muted-foreground mt-1">Track your profile views and link clicks over time.</p>
      </div>

      <AnalyticsCards data={overview} />

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
          <div className="space-y-6">
            {linkAnalytics.map((link) => (
              <div key={link.linkId} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium truncate max-w-[200px]" title={link.title}>{link.title}</span>
                  <span className="text-muted-foreground font-medium">{link.clicks.toLocaleString()}</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full" 
                    style={{ width: `${link.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
