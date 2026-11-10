import React from 'react';
import {
  Users,
  Clock,
  Sparkles,
  Lock,
  ChevronRight,
  Radio,
  Heart,
  TrendingUp,
  FileCode2,
  Calendar,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useTogether } from '../../context/TogetherContext';
import { calculateSocialOverview } from '../../core/analytics-calc';
import { formatDuration } from '../../core/encounter-engine';
import { MOCK_USERS } from '../../data/mock-data';

export const HomeScreen: React.FC = () => {
  const {
    currentUser,
    encounters,
    activeEncounter,
    capsules,
    friends,
    setSelectedFriend,
    setActiveTab,
    setShowArchModal,
    simulateBringTogether,
    simulateSeparate,
    trackingEnabled,
    invisibleMode,
  } = useTogether();

  const overview = calculateSocialOverview(encounters, MOCK_USERS, currentUser.id);

  // Group today's encounters by friend
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayEncounters = encounters.filter((e) => e.startedAt.slice(0, 10) === todayStr);

  const todayFriendMap: Record<string, { duration: number; count: number; name: string; avatar: string }> = {};

  todayEncounters.forEach((e) => {
    const partnerId = e.userAId === currentUser.id ? e.userBId : e.userAId;
    const partner = Object.values(MOCK_USERS).find((u) => u.id === partnerId);
    if (!partner) return;

    if (!todayFriendMap[partnerId]) {
      todayFriendMap[partnerId] = {
        duration: 0,
        count: 0,
        name: partner.displayName,
        avatar: partner.avatarUrl,
      };
    }
    todayFriendMap[partnerId].duration += e.durationSeconds;
    todayFriendMap[partnerId].count += 1;
  });

  // Check if any secret capsules are ready to be unlocked
  const readyCapsules = capsules.filter(
    (c) => c.recipientId === currentUser.id && !c.isUnlocked
  );

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-5 text-stone-100">
      {/* Header Profile & Welcome Banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.displayName}
              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-amber-400/40 shadow-md"
            />
            {trackingEnabled && !invisibleMode && (
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-stone-900 flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              </span>
            )}
          </div>
          <div>
            <span className="text-stone-400 text-xs font-medium uppercase tracking-wider block">
              Bluetooth Social Tracker
            </span>
            <h1 className="text-xl font-bold text-stone-100 tracking-tight">
              Welcome back, {currentUser.displayName.split(' ')[0]}!
            </h1>
          </div>
        </div>

        {/* Blueprint / Architecture Button */}
        <button
          onClick={() => setShowArchModal(true)}
          className="bg-stone-800/80 hover:bg-stone-800 text-amber-400 border border-stone-700/80 px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all hover:scale-105"
          aria-label="View Technical Architecture and Flutter Blueprint"
        >
          <FileCode2 className="w-3.5 h-3.5" />
          <span>Blueprint</span>
        </button>
      </div>

      {/* Live Proximity Encounter Banner (if actively near someone right now) */}
      {activeEncounter && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-stone-900 border border-amber-500/40 p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-amber-300 tracking-wide uppercase">
                {activeEncounter.state === 'CONNECTED' ? 'In Proximity Now' : 'Reconnecting Signal...'}
              </span>
            </div>
            <span className="font-mono text-xs bg-stone-900/80 px-2 py-0.5 rounded-full text-stone-300 border border-stone-800">
              {activeEncounter.lastRssi} dBm
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={activeEncounter.partnerAvatar}
                alt={activeEncounter.partnerName}
                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-amber-400"
              />
              <div>
                <h3 className="font-bold text-base text-stone-100">{activeEncounter.partnerName}</h3>
                <p className="text-xs text-amber-300 font-mono flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Time together: {formatDuration(activeEncounter.durationSeconds)}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => simulateSeparate(activeEncounter.userBId)}
              className="bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
            >
              Part Ways
            </button>
          </div>
        </div>
      )}

      {/* Today's Social Big Metrics Card */}
      <div className="rounded-3xl bg-stone-900/80 border border-stone-800/90 p-5 shadow-lg backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-stone-400 tracking-wider uppercase flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Total Time With People
          </span>
          <span className="text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full">
            Today
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-4xl font-extrabold tracking-tight text-white">
            {formatDuration(overview.totalSocialTimeTodaySeconds)}
          </span>
          <span className="text-xs text-stone-400">across {overview.peopleEncounteredTodayCount} connections</span>
        </div>

        {/* Highlight Stats Row */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-stone-800/80">
          <div className="bg-stone-950/50 p-3 rounded-2xl border border-stone-800/60">
            <span className="text-[11px] text-stone-400 block mb-1">Most Time Today</span>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-stone-200 truncate">
                {overview.mostSpentWithUser
                  ? `${overview.mostSpentWithUser.user.displayName.split(' ')[0]} (${formatDuration(overview.mostSpentWithUser.durationSeconds)})`
                  : 'None yet'}
              </span>
            </div>
          </div>

          <div className="bg-stone-950/50 p-3 rounded-2xl border border-stone-800/60">
            <span className="text-[11px] text-stone-400 block mb-1">Week Total</span>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-stone-200">
                {formatDuration(overview.weeklyTotalSeconds)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Secret Vault Teaser Banner */}
      {readyCapsules.length > 0 ? (
        <button
          onClick={() => setActiveTab('vault')}
          className="w-full text-left bg-gradient-to-r from-purple-950/60 via-stone-900 to-stone-900 border border-purple-800/60 rounded-3xl p-4 flex items-center justify-between hover:border-purple-600/80 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/20 text-purple-300 flex items-center justify-center border border-purple-500/30">
              <Sparkles className="w-5 h-5 text-purple-400 animate-spin-slow" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-100 flex items-center gap-1.5">
                <span>Time Capsule Ready to Open</span>
                <span className="bg-purple-500 text-stone-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {readyCapsules.length}
                </span>
              </h4>
              <p className="text-xs text-stone-400">
                A personal message left by {readyCapsules[0].senderName} is now unlocked!
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-500 group-hover:text-purple-300 transition-colors" />
        </button>
      ) : (
        <button
          onClick={() => setActiveTab('vault')}
          className="w-full text-left bg-stone-900/60 border border-stone-800 rounded-3xl p-3.5 flex items-center justify-between hover:border-stone-700 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-stone-200">Secret Time Capsules</h4>
              <p className="text-[11px] text-stone-400">Leave notes that unlock after you part ways</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-amber-400 transition-colors" />
        </button>
      )}

      {/* Today's Connections List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-stone-200 tracking-tight flex items-center gap-2">
            <span>Today's Connections</span>
            <span className="text-xs font-normal text-stone-400">
              ({Object.keys(todayFriendMap).length})
            </span>
          </h2>
          <button
            onClick={() => setActiveTab('people')}
            className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
          >
            See all friends
          </button>
        </div>

        {Object.keys(todayFriendMap).length === 0 ? (
          <div className="bg-stone-900/40 border border-dashed border-stone-800 rounded-2xl p-6 text-center text-xs text-stone-400">
            No Bluetooth encounters logged yet today. Use the simulator above to start proximity!
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(todayFriendMap).map(([partnerId, data]) => {
              const rel = friends.find((f) => f.friendId === partnerId);
              return (
                <div
                  key={partnerId}
                  onClick={() => rel && setSelectedFriend(rel)}
                  className="bg-stone-900/80 hover:bg-stone-850 border border-stone-800/90 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] hover:border-amber-500/40 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={data.avatar}
                      alt={data.name}
                      className="w-11 h-11 rounded-2xl object-cover ring-1 ring-stone-700"
                    />
                    <div>
                      <h4 className="text-sm font-semibold text-stone-100">{data.name}</h4>
                      <p className="text-xs text-stone-400">
                        {data.count} {data.count === 1 ? 'meeting' : 'meetings'} today
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-amber-400 font-mono">
                      {formatDuration(data.duration)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-stone-500" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transparent Bluetooth Tracking Privacy Card */}
      <div className="rounded-2xl bg-stone-950/60 border border-stone-800/80 p-3.5 text-xs text-stone-400 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="text-stone-200 font-semibold block mb-0.5">Privacy First Guarantee</span>
          <span>
            Tracking uses rotating BLE tokens and runs only when mutually agreed. No GPS coordinates or location history are ever collected.
          </span>
        </div>
      </div>
    </div>
  );
};
