import React from 'react';
import {
  X,
  Clock,
  Calendar,
  Sparkles,
  Heart,
  TrendingUp,
  Award,
  Lock,
  ChevronRight,
  ShieldAlert,
  UserX,
  History,
} from 'lucide-react';
import { useTogether } from '../../context/TogetherContext';
import { calculateRelationshipStats } from '../../core/analytics-calc';
import { formatDuration } from '../../core/encounter-engine';
import { FriendRelationship } from '../../types';

interface Props {
  relationship: FriendRelationship;
  onClose: () => void;
  onComposeCapsule: (friendId: string) => void;
}

export const RelationshipDetailModal: React.FC<Props> = ({
  relationship,
  onClose,
  onComposeCapsule,
}) => {
  const { currentUser, encounters, removeFriend } = useTogether();
  const friend = relationship.friend;

  const stats = calculateRelationshipStats(encounters, currentUser.id, friend.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto p-5 text-stone-100 space-y-5"
        role="dialog"
        aria-label={`Relationship details with ${friend.displayName}`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-stone-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Relationship Story
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-stone-100 flex items-center justify-center transition-colors"
            aria-label="Close relationship story"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card */}
        <div className="flex items-center gap-4">
          <img
            src={friend.avatarUrl}
            alt={friend.displayName}
            className="w-16 h-16 rounded-3xl object-cover ring-2 ring-amber-400/50 shadow-md"
          />
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">{friend.displayName}</h2>
            <p className="text-xs text-stone-400">@{friend.username}</p>
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Mutually Verified Connection
            </span>
          </div>
        </div>

        {/* Time Breakdowns Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800/80">
            <span className="text-[11px] text-stone-400 block mb-1">Time Spent Today</span>
            <span className="text-xl font-bold text-amber-400 font-mono">
              {formatDuration(stats.todaySeconds)}
            </span>
          </div>

          <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800/80">
            <span className="text-[11px] text-stone-400 block mb-1">This Week</span>
            <span className="text-xl font-bold text-stone-100 font-mono">
              {formatDuration(stats.weekSeconds)}
            </span>
          </div>

          <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800/80">
            <span className="text-[11px] text-stone-400 block mb-1">This Month</span>
            <span className="text-xl font-bold text-stone-100 font-mono">
              {formatDuration(stats.monthSeconds)}
            </span>
          </div>

          <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800/80">
            <span className="text-[11px] text-stone-400 block mb-1">Lifetime Together</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">
              {formatDuration(stats.lifetimeSeconds)}
            </span>
          </div>
        </div>

        {/* Meeting Performance Metrics */}
        <div className="bg-stone-950/40 rounded-2xl border border-stone-800/60 p-3.5 space-y-2.5 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-stone-800/50">
            <span className="text-stone-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-stone-400" /> Total Encounters:
            </span>
            <span className="font-semibold text-stone-200">{stats.totalMeetings} meetings</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-stone-800/50">
            <span className="text-stone-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-stone-400" /> Average Meeting:
            </span>
            <span className="font-semibold text-stone-200">{formatDuration(stats.averageDurationSeconds)}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-stone-800/50">
            <span className="text-stone-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" /> Longest Meeting:
            </span>
            <span className="font-semibold text-amber-300 font-mono">{formatDuration(stats.longestMeetingSeconds)}</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-stone-400 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-stone-400" /> Last Encounter:
            </span>
            <span className="font-semibold text-stone-200">
              {stats.lastMeeting ? new Date(stats.lastMeeting).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
            </span>
          </div>
        </div>

        {/* Action: Compose Secret Time Capsule */}
        <button
          onClick={() => {
            onClose();
            onComposeCapsule(friend.id);
          }}
          className="w-full bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-stone-950 font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02]"
        >
          <Lock className="w-4 h-4 fill-stone-950" />
          <span>Leave a Secret Time Capsule for {friend.displayName.split(' ')[0]}</span>
        </button>

        {/* Historical Encounter Timeline */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-amber-400" />
            Encounter History ({stats.encounters.length})
          </h4>

          {stats.encounters.length === 0 ? (
            <p className="text-xs text-stone-500 text-center py-4">No encounters recorded yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {stats.encounters.map((enc) => (
                <div
                  key={enc.id}
                  className="bg-stone-950/40 p-2.5 rounded-xl border border-stone-800/60 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="text-stone-200 font-medium block">
                      {new Date(enc.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at{' '}
                      {new Date(enc.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      Mutual BLE Handshake • RSSI {enc.lastRssi} dBm
                    </span>
                  </div>
                  <span className="font-mono font-bold text-amber-400">
                    {formatDuration(enc.durationSeconds)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger zone actions */}
        <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs">
          <button
            onClick={() => {
              if (confirm(`Remove ${friend.displayName} from connections?`)) {
                removeFriend(relationship.id);
                onClose();
              }
            }}
            className="text-stone-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Remove connection</span>
          </button>
        </div>
      </div>
    </div>
  );
};
