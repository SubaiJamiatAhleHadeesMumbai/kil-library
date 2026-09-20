import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  UsersIcon,
  BookOpenIcon,
  ClockIcon,
  MapPinIcon,
  CalendarDaysIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  DeviceTabletIcon,
  CheckBadgeIcon,
  GlobeAsiaAustraliaIcon,
  FireIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import analyticsService from '../../api/analyticsService';

const TIMEFRAMES = [
  { id: 'today', label: 'آج (Today)' },
  { id: '7days', label: 'گزشتہ 7 دن (7 Days)' },
  { id: '30days', label: 'اس ماہ (30 Days)' },
  { id: 'all', label: 'تمام ریکارڈ (All Time)' },
];

export default function ReaderAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('7days');
  const [selectedCity, setSelectedCity] = useState('all');
  const [searchBookQuery, setSearchBookQuery] = useState('');
  const [data, setData] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await analyticsService.getAnalyticsDashboard({
        timeframe,
        city: selectedCity !== 'all' ? selectedCity : null,
      });
      setData(res || {});
    } catch (err) {
      console.error(err);
      toast.error('Failed to load reader analytics data');
    } finally {
      setLoading(false);
    }
  }, [timeframe, selectedCity]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const summary = data?.summary || {
    total_readers: 0,
    total_sessions: 0,
    active_now: 0,
    total_reading_hours: 0,
    peak_day: 'Friday',
    top_city: 'Mumbai',
  };

  const dayWiseTrends = data?.day_wise_trends || [];
  const topBooks = data?.top_books || [];
  const topLocations = data?.top_locations || [];
  const deviceBreakdown = data?.device_breakdown || { mobile: 0, desktop: 0, tablet: 0 };
  const recentSessions = data?.recent_sessions || [];

  // Filter books locally by search input
  const filteredTopBooks = useMemo(() => {
    if (!searchBookQuery.trim()) return topBooks;
    const q = searchBookQuery.toLowerCase();
    return topBooks.filter(
      (b) =>
        b.title?.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q) ||
        b.top_city?.toLowerCase().includes(q)
    );
  }, [topBooks, searchBookQuery]);

  // Max visitors for chart scaling
  const maxDayVisitors = useMemo(() => {
    if (!dayWiseTrends.length) return 1;
    return Math.max(...dayWiseTrends.map((d) => d.visitors), 1);
  }, [dayWiseTrends]);

  // Device percentage calculation
  const totalDevices = (deviceBreakdown.mobile || 0) + (deviceBreakdown.desktop || 0) + (deviceBreakdown.tablet || 0);
  const mobilePct = totalDevices ? Math.round((deviceBreakdown.mobile / totalDevices) * 100) : 50;
  const desktopPct = totalDevices ? Math.round((deviceBreakdown.desktop / totalDevices) * 100) : 45;
  const tabletPct = totalDevices ? 100 - mobilePct - desktopPct : 5;

  // Export to CSV
  const handleExportCSV = () => {
    if (!recentSessions.length) {
      toast.error('No sessions data to export');
      return;
    }

    const headers = ['Session ID', 'Visitor Name', 'Type', 'Book Title', 'Category', 'City', 'Country', 'Device', 'Duration (Minutes)', 'Last Page', 'Day', 'Date'];
    const rows = recentSessions.map((s) => [
      s.session_id,
      `"${s.visitor_name || 'Guest'}"`,
      s.is_guest ? 'Guest' : 'Member',
      `"${(s.book_title || '').replace(/"/g, '""')}"`,
      `"${s.book_category || 'General'}"`,
      `"${s.city || 'Mumbai'}"`,
      `"${s.country || 'India'}"`,
      s.device_type || 'desktop',
      s.duration_minutes || 0,
      s.last_page || 1,
      s.day_of_week || '',
      s.start_time || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reader_analytics_${timeframe}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Analytics CSV report downloaded!');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* ================= PAGE HEADER ================= */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Reader & Visitor Analytics
            </h1>
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-3 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Reader Engine
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Track <strong>who is reading which book</strong>, <strong>where from (City & Country)</strong>, and <strong>which days have peak visitors</strong>.
          </p>
        </div>

        {/* Global Controls: Timeframe Filter + Refresh + Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timeframe selector */}
          <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1 shadow-2xs">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setTimeframe(tf.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  timeframe === tf.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            title="Refresh Analytics"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {/* Export to CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer shadow-xs"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ================= 4 MASTER KPI CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Active Live Readers */}
        <div className="rounded-3xl border border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-500/10 via-white dark:via-slate-900 to-white dark:to-slate-900 p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              Live Active Readers
            </span>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
              {summary.active_now}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Reading right now</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Live heartbeat received within the last 5 minutes</p>
        </div>

        {/* Card 2: Total Readers & Sessions */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Visitors / Readers
            </span>
            <UsersIcon className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
              {summary.total_readers}
            </span>
            <span className="text-xs text-slate-400 font-medium">({summary.total_sessions} visits)</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Unique visitors across members and guests</p>
        </div>

        {/* Card 3: Total Reading Time */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Hours Read
            </span>
            <ClockIcon className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
              {summary.total_reading_hours}
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">Hours</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Total cumulative study and research time</p>
        </div>

        {/* Card 4: Peak Day & Top City */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Peak Traffic Day
            </span>
            <CalendarDaysIcon className="w-5 h-5 text-rose-500" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
              {summary.peak_day}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
            Top Reading City: <strong className="text-slate-800 dark:text-slate-200">{summary.top_city}</strong>
          </p>
        </div>
      </div>

      {/* ================= SECTION 2: DAY-WISE TRENDS & DEVICE BREAKDOWN ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Day-of-Week Traffic Bar Chart (Takes 2 cols) */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarDaysIcon className="w-5 h-5 text-emerald-600" />
                <span>Kis Din Zyada Visitors Aate Hain? (Day-Wise Traffic Trends)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Day-of-the-week distribution of reading visits and total hours spent.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/60 px-3 py-1 text-xs font-bold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
              <FireIcon className="w-3.5 h-3.5 text-rose-500" />
              Peak: {summary.peak_day}
            </span>
          </div>

          {/* Custom Sleek Bar Graph */}
          <div className="space-y-3.5">
            {dayWiseTrends.map((d) => {
              const isPeak = d.day === summary.peak_day;
              const fillPct = Math.max(8, Math.round((d.visitors / maxDayVisitors) * 100));

              return (
                <div key={d.day} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold ${isPeak ? 'text-emerald-700 dark:text-emerald-400 font-black' : 'text-slate-700 dark:text-slate-300'}`}>
                      {d.day} {isPeak ? '⭐ (Most Popular)' : ''}
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      <strong>{d.visitors}</strong> visitors • {d.read_hours} hrs read
                    </span>
                  </div>

                  <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isPeak
                          ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600'
                          : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Device & Platform Breakdown (Takes 1 col) */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <DevicePhoneMobileIcon className="w-5 h-5 text-indigo-600" />
              <span>Device Breakdown</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Mobile vs Desktop readers distribution</p>
          </div>

          {/* Visual Device Meter */}
          <div className="space-y-5">
            <div className="flex h-4 w-full rounded-full overflow-hidden shadow-inner">
              <div
                style={{ width: `${mobilePct}%` }}
                className="bg-emerald-500 transition-all duration-500"
                title={`Mobile: ${mobilePct}%`}
              />
              <div
                style={{ width: `${desktopPct}%` }}
                className="bg-indigo-500 transition-all duration-500"
                title={`Desktop: ${desktopPct}%`}
              />
              <div
                style={{ width: `${tabletPct}%` }}
                className="bg-amber-500 transition-all duration-500"
                title={`Tablet: ${tabletPct}%`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-2">
              <div className="rounded-2xl border border-emerald-100 dark:border-emerald-950 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
                <DevicePhoneMobileIcon className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Mobile</span>
                <span className="text-lg font-black text-emerald-600">{mobilePct}%</span>
              </div>

              <div className="rounded-2xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/50 dark:bg-indigo-950/20 p-3">
                <ComputerDesktopIcon className="w-5 h-5 mx-auto text-indigo-600 mb-1" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Desktop</span>
                <span className="text-lg font-black text-indigo-600">{desktopPct}%</span>
              </div>

              <div className="rounded-2xl border border-amber-100 dark:border-amber-950 bg-amber-50/50 dark:bg-amber-950/20 p-3">
                <DeviceTabletIcon className="w-5 h-5 mx-auto text-amber-600 mb-1" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Tablet</span>
                <span className="text-lg font-black text-amber-600">{tabletPct}%</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3.5 text-xs text-slate-600 dark:text-slate-400">
            💡 <strong>Insight:</strong> Most mobile readers access books via WhatsApp & social sharing links.
          </div>
        </div>
      </div>

      {/* ================= SECTION 3: TOP BOOKS LEADERBOARD ================= */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpenIcon className="w-5 h-5 text-emerald-600" />
              <span>Kis Book Par Sabse Zyada Visitors Aate Hain? (Top Books Leaderboard)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked by reader visits, cumulative study hours, and average completion rate.
            </p>
          </div>

          {/* Search box within top books */}
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search in top books..."
              value={searchBookQuery}
              onChange={(e) => setSearchBookQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 px-3 py-1.5 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Books Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Rank</th>
                <th className="py-3 px-4">Book Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Visitors</th>
                <th className="py-3 px-4 text-center">Reading Time</th>
                <th className="py-3 px-4">Avg. Completion</th>
                <th className="py-3 px-4 rounded-r-xl">Top City</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredTopBooks.length > 0 ? (
                filteredTopBooks.map((b, idx) => {
                  const rankBadge =
                    idx === 0
                      ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                      : idx === 1
                      ? 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200'
                      : idx === 2
                      ? 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300'
                      : 'bg-slate-100 text-slate-600 border-transparent dark:bg-slate-800/50';

                  return (
                    <tr key={b.book_id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border ${rankBadge}`}>
                          #{idx + 1}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                        {b.title}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {b.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-white">
                        {b.visitors}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {b.read_hours} hrs
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(5, b.avg_completion_pct))}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">{b.avg_completion_pct}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        📍 {b.top_city || 'Mumbai'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No books reading sessions recorded in this timeframe yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= SECTION 4: REAL-TIME LIVE STREAM (WHO IS READING WHAT & WHERE) ================= */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GlobeAsiaAustraliaIcon className="w-5 h-5 text-indigo-600" />
              <span>Kon Visitor Kahan Se Kya Read Kar Raha Hai? (Live Reader Stream)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time feed showing visitor identity, book title, location, duration, and progress.
            </p>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            Showing last {recentSessions.length} sessions
          </span>
        </div>

        {/* Live Stream Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Visitor</th>
                <th className="py-3 px-4">Book Being Read</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Device</th>
                <th className="py-3 px-4 text-center">Duration</th>
                <th className="py-3 px-4 text-center">Progress</th>
                <th className="py-3 px-4 rounded-r-xl">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {recentSessions.length > 0 ? (
                recentSessions.map((s) => (
                  <tr key={s.id || s.session_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${s.is_guest ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                        <span>{s.visitor_name}</span>
                        {s.is_guest ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                            Guest
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                            Member
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 max-w-xs truncate">
                      {s.book_title}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        📍 {s.city || 'Mumbai'}, {s.country || 'India'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 capitalize">
                      {s.device_type === 'mobile' ? '📱 Mobile' : s.device_type === 'tablet' ? '📱 Tablet' : '💻 Desktop'}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {s.duration_minutes > 0 ? `${s.duration_minutes}m` : `${s.duration_seconds}s`}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-[11px]">
                      Page {s.last_page} {s.total_pages ? `of ${s.total_pages}` : ''}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {s.last_heartbeat ? new Date(s.last_heartbeat).toLocaleTimeString() : 'Just now'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No active reading sessions recorded yet. Open a book in the library to start tracking!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
