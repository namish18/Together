import React, { useState } from 'react';
import {
  BarChart3,
  Calendar,
  Clock,
  Sparkles,
  TrendingUp,
  Heart,
  Users,
  Award,
  Flame,
  Info,
} from 'lucide-react';
import { useTogether } from '../../context/TogetherContext';
import { calculateSocialOverview, generateActivityHeatmap } from '../../core/analytics-calc';
import { formatDuration } from '../../core/encounter-engine';
import { MOCK_USERS } from '../../data/mock-data';

export const AnalyticsScreen: React.FC = () => {
  const { currentUser, encounters, friends, setSelectedFriend } = useTogether();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'day' | 'week' | 'month'>('week');

  const overview = calculateSocialOverview(encounters, MOCK_USERS, currentUser.id);
  const heatmap = generateActivityHeatmap(encounters, currentUser.id);

  // Group by partner for duration & encounter count
  const partnerMetrics: Record<string, { duration: number; count: number; name: string; avatar: string; relId?: string }> = {};

  for (const enc of encounters) {
    const partnerId = enc.userAId === currentUser.id ? enc.userBId : enc.userAId;
    const partner = Object.values(MOCK_USERS).find((u) => u.id === partnerId);
    if (!partner) continue;

    if (!partnerMetrics[partnerId]) {
      const rel = friends.find((f) => f.friendId === partnerId);
      partnerMetrics[partnerId] = {
        duration: 0,
        count: 0,
        name: partner.displayName,
        avatar: partner.avatarUrl,
        relId: rel?.id,
      };
    }
    partnerMetrics[partnerId].duration += enc.durationSeconds;
    partnerMetrics[partnerId].count += 1;
  }

  const sortedByTime = Object.entries(partnerMetrics).sort((a, b) => b[1].duration - a[1].duration);
  const sortedByCount = Object.entries(partnerMetrics).sort((a, b) => b[1].count - a[1].count);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate daily totals for the past 7 days
  const dailyTotals: { day: string; seconds: number; dateStr: string }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    const dayName = daysOfWeek[d.getDay()];
    const dayEncounters = encounters.filter((e) => e.startedAt.slice(0, 10) === dateStr);
    const secs = dayEncounters.reduce((acc, e) => acc + e.durationSeconds, 0);
    dailyTotals.push({ day: dayName, seconds: secs, dateStr });
  }

  const maxDailySecs = Math.max(...dailyTotals.map((d) => d.seconds), 3600);

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-5 text-stone-100">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>Social Time Insights</span>
          <BarChart3 className="w-4 h-4 text-amber-400" />
        </h1>
        <p className="text-xs text-stone-400">Meaningful understanding of your connection time</p>
      </div>

      {/* Top Level Time Horizon Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-stone-900/90 border border-stone-800 p-3 rounded-2xl text-center">
          <span className="text-[10px] text-stone-400 uppercase font-semibold block mb-0.5">Today</span>
          <span className="text-sm font-bold text-amber-400 font-mono block">
            {formatDuration(overview.totalSocialTimeTodaySeconds)}
          </span>
          <span className="text-[10px] text-stone-500">{overview.peopleEncounteredTodayCount} people</span>
        </div>

        <div className="bg-stone-900/90 border border-stone-800 p-3 rounded-2xl text-center">
          <span className="text-[10px] text-stone-400 uppercase font-semibold block mb-0.5">This Week</span>
          <span className="text-sm font-bold text-emerald-400 font-mono block">
            {formatDuration(overview.weeklyTotalSeconds)}
          </span>
          <span className="text-[10px] text-stone-500">7 days active</span>
        </div>

        <div className="bg-stone-900/90 border border-stone-800 p-3 rounded-2xl text-center">
          <span className="text-[10px] text-stone-400 uppercase font-semibold block mb-0.5">This Month</span>
          <span className="text-sm font-bold text-purple-400 font-mono block">
            {formatDuration(overview.monthlyTotalSeconds)}
          </span>
          <span className="text-[10px] text-stone-500">30 days</span>
        </div>
      </div>

      {/* 7-Day Social Activity Bar Chart */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            Daily Shared Time
          </h3>
          <span className="text-[11px] text-stone-400 font-mono">Last 7 Days</span>
        </div>

        <div className="flex items-end justify-between gap-2 h-32 pt-4 px-1">
          {dailyTotals.map((item, idx) => {
            const heightPercent = Math.max(8, Math.round((item.seconds / maxDailySecs) * 100));
            const isToday = idx === dailyTotals.length - 1;

            return (
              <div key={item.dateStr} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[9px] font-mono text-stone-400">
                  {item.seconds > 0 ? formatDuration(item.seconds) : '—'}
                </span>
                <div className="w-full bg-stone-800 rounded-t-lg overflow-hidden h-24 flex items-end">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full transition-all duration-500 rounded-t-md ${
                      isToday
                        ? 'bg-gradient-to-t from-amber-600 to-amber-400'
                        : item.seconds > 0
                        ? 'bg-gradient-to-t from-stone-700 to-stone-500'
                        : 'bg-transparent'
                    }`}
                  />
                </div>
                <span className={`text-[10px] font-medium ${isToday ? 'text-amber-400 font-bold' : 'text-stone-400'}`}>
                  {item.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Social Activity Heatmap (24h x 7 Days) */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Social Heatmap (When You Meet)
          </h3>
          <span className="text-[10px] text-stone-500">24h Matrix</span>
        </div>

        <p className="text-[11px] text-stone-400">
          Visualizing the hours of the day when Bluetooth encounters most frequently occur:
        </p>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[320px] space-y-1">
            {/* Hour headers */}
            <div className="flex items-center text-[9px] text-stone-500 font-mono pl-7">
              <span className="flex-1">00:00</span>
              <span className="flex-1">06:00</span>
              <span className="flex-1">12:00</span>
              <span className="flex-1">18:00</span>
              <span className="w-4 text-right">23</span>
            </div>

            {daysOfWeek.map((dayName, dayIndex) => (
              <div key={dayName} className="flex items-center gap-1">
                <span className="w-6 text-[10px] font-medium text-stone-400">{dayName}</span>
                <div className="flex-1 grid grid-cols-24 gap-0.5">
                  {heatmap[dayIndex].map((minutes, hourIndex) => {
                    let bg = 'bg-stone-850';
                    if (minutes > 60) bg = 'bg-amber-400';
                    else if (minutes > 30) bg = 'bg-amber-500';
                    else if (minutes > 15) bg = 'bg-amber-600/70';
                    else if (minutes > 0) bg = 'bg-amber-700/40';

                    return (
                      <div
                        key={hourIndex}
                        title={`${dayName} ${hourIndex}:00 - ${minutes}m spent together`}
                        className={`h-4 rounded-[2px] transition-colors cursor-pointer hover:ring-1 hover:ring-white ${bg}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap Legend */}
        <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1">
          <span>Less time together</span>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-[2px] bg-stone-850" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-amber-700/40" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-amber-600/70" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-amber-500" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-amber-400" />
          </div>
          <span>More time together</span>
        </div>
      </div>

      {/* People Encounter Breakdown (Top time & frequency) */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-amber-400" />
          Connection Distribution
        </h3>

        <div className="space-y-2">
          {sortedByTime.map(([partnerId, data]) => {
            const percentOfTotal = overview.lifetimeTotalSeconds > 0
              ? Math.round((data.duration / overview.lifetimeTotalSeconds) * 100)
              : 0;

            const rel = friends.find((f) => f.friendId === partnerId);

            return (
              <div
                key={partnerId}
                onClick={() => rel && setSelectedFriend(rel)}
                className="bg-stone-950/50 p-3 rounded-2xl border border-stone-800/60 flex items-center justify-between cursor-pointer hover:border-amber-500/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={data.avatar}
                    alt={data.name}
                    className="w-10 h-10 rounded-xl object-cover ring-1 ring-stone-700"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-stone-100">{data.name}</h4>
                    <span className="text-[10px] text-stone-400">
                      {data.count} {data.count === 1 ? 'encounter' : 'encounters'} • {percentOfTotal}% of all time
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-amber-400 block">
                    {formatDuration(data.duration)}
                  </span>
                  <span className="text-[10px] text-stone-500">
                    avg {formatDuration(Math.round(data.duration / data.count))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Non-Competitive Health Philosophy Note */}
      <div className="p-3.5 rounded-2xl bg-stone-950/40 border border-stone-800/60 text-xs text-stone-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Together is designed without competitive leaderboards or streak pressure. Its sole intention is mindful awareness of how you allocate your precious time to the people who matter most.
        </p>
      </div>
    </div>
  );
};
