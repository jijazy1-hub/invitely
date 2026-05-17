"use client";

// src/app/(dashboard)/events/[eventId]/analytics/page.tsx
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  ArrowLeft,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  QrCode,
  TrendingUp,
} from "lucide-react";

interface AnalyticsSummary {
  totalGuests: number;
  confirmed: number;
  declined: number;
  pending: number;
  checkedIn: number;
  rsvpRate: number;
  checkinRate: number;
}

interface TrendPoint {
  date: string;
  confirmed: number;
  declined: number;
}

interface ImportSource {
  source: string;
  count: number;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  trend: TrendPoint[];
  importSources: ImportSource[];
}

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "Manual",
  CSV: "CSV",
  EXCEL: "Excel",
  TEXT: "Paste",
  DOCX: "DOCX",
};

const PIE_COLORS = ["#0A2810", "#B8860B", "#D1D5DB"];

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-[#0A2810]",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-stone-200 p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-[#0A2810]/8 flex items-center justify-center">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <span className="text-sm text-stone-500 font-medium">{label}</span>
      </div>
      <p className="text-3xl font-bold text-stone-900">{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/events/${eventId}/analytics`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 rounded-full border-2 border-[#0A2810] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-stone-500">
        Failed to load analytics.
      </div>
    );
  }

  const { summary, trend, importSources } = data;

  const rsvpPieData = [
    { name: "Confirmed", value: summary.confirmed },
    { name: "Declined", value: summary.declined },
    { name: "Pending", value: summary.pending },
  ];

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/events/${eventId}`}
          className="h-9 w-9 rounded-lg border border-stone-200 bg-white flex items-center justify-center hover:bg-stone-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-stone-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Analytics</h1>
          <p className="text-stone-500 text-sm">RSVP and attendance insights</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Guests"
          value={summary.totalGuests}
          sub="invited"
        />
        <StatCard
          icon={CheckCircle}
          label="Confirmed"
          value={summary.confirmed}
          sub={`${summary.rsvpRate}% RSVP rate`}
          color="text-emerald-600"
        />
        <StatCard
          icon={XCircle}
          label="Declined"
          value={summary.declined}
          sub="won't attend"
          color="text-red-500"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={summary.pending}
          sub="no response yet"
          color="text-amber-500"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={QrCode}
          label="Checked In"
          value={summary.checkedIn}
          sub={`${summary.checkinRate}% of confirmed`}
        />
        <StatCard
          icon={TrendingUp}
          label="RSVP Rate"
          value={`${summary.rsvpRate}%`}
          sub="of invited guests responded"
        />
      </div>

      {/* RSVP Trend chart */}
      <div className="rounded-2xl bg-white border border-stone-200 p-6">
        <h2 className="font-semibold text-stone-900 mb-1">RSVP Activity (Last 14 Days)</h2>
        <p className="text-sm text-stone-400 mb-6">Daily confirmed and declined responses</p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={trend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="gConfirmed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0A2810" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#0A2810" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gDeclined" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#B8860B" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#B8860B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              labelFormatter={formatDate}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #E7E5E0",
                fontSize: 13,
              }}
            />
            <Area
              type="monotone"
              dataKey="confirmed"
              stroke="#0A2810"
              strokeWidth={2}
              fill="url(#gConfirmed)"
              name="Confirmed"
            />
            <Area
              type="monotone"
              dataKey="declined"
              stroke="#B8860B"
              strokeWidth={2}
              fill="url(#gDeclined)"
              name="Declined"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row: Pie + Import sources */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* RSVP breakdown pie */}
        <div className="rounded-2xl bg-white border border-stone-200 p-6">
          <h2 className="font-semibold text-stone-900 mb-1">Response Breakdown</h2>
          <p className="text-sm text-stone-400 mb-4">Distribution of guest responses</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={rsvpPieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {rsvpPieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend
                formatter={(value) => (
                  <span className="text-sm text-stone-600">{value}</span>
                )}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #E7E5E0",
                  fontSize: 13,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Import source bar chart */}
        <div className="rounded-2xl bg-white border border-stone-200 p-6">
          <h2 className="font-semibold text-stone-900 mb-1">Guest Import Sources</h2>
          <p className="text-sm text-stone-400 mb-4">How guests were added to this event</p>
          {importSources.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-stone-400 text-sm">
              No import data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={importSources.map((s) => ({
                  ...s,
                  label: SOURCE_LABELS[s.source] ?? s.source,
                }))}
                margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: "#9CA3AF" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #E7E5E0",
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="count" fill="#0A2810" radius={[6, 6, 0, 0]} name="Guests" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
