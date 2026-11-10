import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Clock,
  Sparkles,
  QrCode,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useTogether } from '../../context/TogetherContext';
import { calculateRelationshipStats } from '../../core/analytics-calc';
import { formatDuration } from '../../core/encounter-engine';
import { RelationshipDetailModal } from './RelationshipDetailModal';
import { MOCK_USERS } from '../../data/mock-data';

interface Props {
  onComposeCapsule: (friendId: string) => void;
}

export const PeopleScreen: React.FC<Props> = ({ onComposeCapsule }) => {
  const {
    currentUser,
    friends,
    encounters,
    addFriendByUsername,
    selectedFriend,
    setSelectedFriend,
  } = useTogether();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [addFeedback, setAddFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);

  const filteredFriends = friends.filter((f) =>
    f.friend.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    const success = addFriendByUsername(newUsername);
    if (success) {
      setAddFeedback({
        type: 'success',
        message: `Successfully connected with @${newUsername.toLowerCase().replace('@', '')}!`,
      });
      setNewUsername('');
      setTimeout(() => {
        setShowAddModal(false);
        setAddFeedback(null);
      }, 1200);
    } else {
      setAddFeedback({
        type: 'error',
        message: 'User not found, already connected, or cannot add yourself.',
      });
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-4 text-stone-100">
      {/* Title & Action Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">People & Circles</h1>
          <p className="text-xs text-stone-400">Mutually accepted proximity connections</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-amber-500 hover:bg-amber-400 text-stone-950 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
          aria-label="Add new connection"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Friend</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or @username..."
          className="w-full bg-stone-900 border border-stone-800 rounded-2xl pl-10 pr-4 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-400 transition-colors"
        />
      </div>

      {/* Friends Count and Explanation */}
      <div className="flex items-center justify-between text-xs text-stone-400 px-1">
        <span>{filteredFriends.length} Active Connections</span>
        <span className="flex items-center gap-1 text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          Both users must participate
        </span>
      </div>

      {/* Friends List */}
      <div className="space-y-2">
        {filteredFriends.length === 0 ? (
          <div className="bg-stone-900/40 border border-dashed border-stone-800 rounded-3xl p-8 text-center space-y-2">
            <Users className="w-8 h-8 text-stone-600 mx-auto" />
            <h4 className="text-sm font-semibold text-stone-300">No connections found</h4>
            <p className="text-xs text-stone-500">
              Try searching for "Bruno", "Eriksen", "Alex", or add a new friend.
            </p>
          </div>
        ) : (
          filteredFriends.map((rel) => {
            const stats = calculateRelationshipStats(encounters, currentUser.id, rel.friend.id);

            return (
              <div
                key={rel.id}
                onClick={() => setSelectedFriend(rel)}
                className="bg-stone-900/80 hover:bg-stone-850 border border-stone-800 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all hover:border-amber-500/40 shadow-sm group"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={rel.friend.avatarUrl}
                      alt={rel.friend.displayName}
                      className="w-12 h-12 rounded-2xl object-cover ring-1 ring-stone-700"
                    />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-stone-900" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-100 group-hover:text-amber-300 transition-colors">
                      {rel.friend.displayName}
                    </h3>
                    <p className="text-xs text-stone-400">@{rel.friend.username}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-500">
                      <span>{stats.totalMeetings} meetings</span>
                      <span>•</span>
                      <span>Avg: {formatDuration(stats.averageDurationSeconds)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex items-center gap-2">
                  <div>
                    <span className="text-xs font-bold text-amber-400 font-mono block">
                      {formatDuration(stats.todaySeconds)} today
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {formatDuration(stats.lifetimeSeconds)} all-time
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-600 group-hover:text-stone-300 transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Friend Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4 text-stone-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Add Connection</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddFeedback(null);
                }}
                className="text-stone-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-stone-400">
              Only mutually accepted friends can discover each other via Bluetooth proximity.
            </p>

            {/* Quick Available Suggestions */}
            <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800 space-y-1.5">
              <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                Suggested usernames:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Object.values(MOCK_USERS)
                  .filter((u) => u.id !== currentUser.id && !friends.some((f) => f.friendId === u.id))
                  .map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setNewUsername(u.username)}
                      className="bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs px-2 py-0.5 rounded-md border border-stone-700"
                    >
                      @{u.username}
                    </button>
                  ))}
              </div>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">
                  Username:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-500 text-xs">@</span>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="bruno or eriksen"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-7 pr-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-400"
                    autoFocus
                  />
                </div>
              </div>

              {addFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    addFeedback.type === 'success'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                  }`}
                >
                  {addFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{addFeedback.message}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md"
              >
                Send Mutual Request
              </button>
            </form>

            {/* QR Code Alternative */}
            <div className="pt-2 border-t border-stone-800 text-center">
              <button
                onClick={() => setShowQrCode(!showQrCode)}
                className="text-stone-400 hover:text-amber-400 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{showQrCode ? 'Hide QR Code' : 'Show My Pairing QR Code'}</span>
              </button>

              {showQrCode && (
                <div className="mt-3 p-4 bg-white rounded-2xl inline-block shadow-lg">
                  <div className="w-36 h-36 border-4 border-stone-950 p-2 flex flex-col items-center justify-center text-stone-950 text-center">
                    <QrCode className="w-20 h-20" />
                    <span className="font-mono text-[9px] font-bold mt-1">
                      together://pair/{currentUser.username}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected Relationship Deep Dive Modal */}
      {selectedFriend && (
        <RelationshipDetailModal
          relationship={selectedFriend}
          onClose={() => setSelectedFriend(null)}
          onComposeCapsule={onComposeCapsule}
        />
      )}
    </div>
  );
};
