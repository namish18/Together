import React, { useState } from 'react';
import {
  User,
  Shield,
  ShieldCheck,
  Radio,
  EyeOff,
  Bell,
  Download,
  Trash2,
  FileCode2,
  Smartphone,
  ExternalLink,
  QrCode,
  BatteryCharging,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useTogether } from '../../context/TogetherContext';

export const ProfileScreen: React.FC = () => {
  const {
    currentUser,
    trackingEnabled,
    setTrackingEnabled,
    invisibleMode,
    setInvisibleMode,
    currentRpi,
    exportDataJson,
    clearEncounterHistory,
    setShowArchModal,
  } = useTogether();

  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-4 text-stone-100">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Settings & Privacy</h1>
        <p className="text-xs text-stone-400">Total control over your Bluetooth tracking & data</p>
      </div>

      {/* User Card */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.displayName}
            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-amber-400/40"
          />
          <div>
            <h2 className="text-base font-bold text-white">{currentUser.displayName}</h2>
            <p className="text-xs text-stone-400 font-mono">@{currentUser.username}</p>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-stone-400">
              <span className="font-mono text-emerald-400 font-semibold">{currentRpi}</span>
              <span>• RPI Active</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowArchModal(true)}
          className="bg-stone-800 text-amber-400 border border-stone-700/80 p-2.5 rounded-2xl hover:bg-stone-700 transition-colors"
          title="Architecture & Flutter Specifications"
        >
          <FileCode2 className="w-5 h-5" />
        </button>
      </div>

      {/* Core Privacy & Tracking Controls */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-4 space-y-4">
        <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-2">
          <Radio className="w-4 h-4 text-amber-400" />
          Proximity Detection Controls
        </h3>

        {/* Master Tracking Switch */}
        <div className="flex items-center justify-between py-1">
          <div>
            <span className="text-xs font-bold text-stone-100 block">Bluetooth Proximity Tracking</span>
            <span className="text-[11px] text-stone-400">Advertise presence & detect accepted friends</span>
          </div>
          <button
            onClick={() => setTrackingEnabled(!trackingEnabled)}
            role="switch"
            aria-checked={trackingEnabled}
            aria-label="Bluetooth Proximity Tracking toggle"
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
              trackingEnabled ? 'bg-amber-500' : 'bg-stone-700'
            }`}
          >
            <div
              className={`bg-stone-950 w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                trackingEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Invisible Mode */}
        <div className="flex items-center justify-between py-1 border-t border-stone-800/60">
          <div>
            <span className="text-xs font-bold text-stone-100 block">Invisible Mode</span>
            <span className="text-[11px] text-stone-400">Temporarily stop broadcasting BLE beacon</span>
          </div>
          <button
            onClick={() => setInvisibleMode(!invisibleMode)}
            role="switch"
            aria-checked={invisibleMode}
            aria-label="Invisible Mode toggle"
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
              invisibleMode ? 'bg-purple-500' : 'bg-stone-700'
            }`}
          >
            <div
              className={`bg-stone-950 w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                invisibleMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Notifications */}
        <div className="flex items-center justify-between py-1 border-t border-stone-800/60">
          <div>
            <span className="text-xs font-bold text-stone-100 block">Notifications & Vault Alerts</span>
            <span className="text-[11px] text-stone-400">Alert when a parting capsule unlocks</span>
          </div>
          <button
            onClick={() => setNotificationEnabled(!notificationEnabled)}
            role="switch"
            aria-checked={notificationEnabled}
            aria-label="Notifications toggle"
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
              notificationEnabled ? 'bg-amber-500' : 'bg-stone-700'
            }`}
          >
            <div
              className={`bg-stone-950 w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                notificationEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Android 12, 13, 14 Foreground Service & Permissions Guide */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-emerald-400" />
          Android Permissions & Background Execution
        </h3>

        <div className="space-y-2 text-xs">
          <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-stone-200 block">Android 12+ (API 31+) Nearby Devices</span>
              <span className="text-stone-400 text-[11px]">
                <code>BLUETOOTH_SCAN</code> with <code>neverForLocation</code> flag. We never access GPS lat/long coordinates.
              </span>
            </div>
          </div>

          <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-stone-200 block">Android 14+ (API 34+) Connected Device Service</span>
              <span className="text-stone-400 text-[11px]">
                Uses <code>FOREGROUND_SERVICE_CONNECTED_DEVICE</code> with persistent tracking notification to prevent OS termination.
              </span>
            </div>
          </div>

          <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800 flex items-start gap-2.5">
            <BatteryCharging className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-stone-200 block">Battery Optimization Exemption</span>
              <span className="text-stone-400 text-[11px]">
                Recommended for uninterrupted encounter detection when phone screen is locked.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Management & Export */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          Data Ownership
        </h3>

        <div className="space-y-2">
          <button
            onClick={exportDataJson}
            className="w-full bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export Encounters & Time Data (JSON)</span>
          </button>

          <button
            onClick={() => setShowPrivacyPolicy(!showPrivacyPolicy)}
            className="w-full bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>{showPrivacyPolicy ? 'Hide Privacy Architecture' : 'View Privacy Architecture'}</span>
          </button>

          {showPrivacyPolicy && (
            <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs text-stone-300 space-y-2 leading-relaxed">
              <h4 className="font-bold text-amber-400">Zero-Tracking Privacy Constitution</h4>
              <p>
                1. <strong>No Location Coordinates:</strong> The application does not request GPS permissions and has no knowledge of where you are.
              </p>
              <p>
                2. <strong>Rotating BLE Pseudonyms:</strong> Device identifiers rotate every 15 minutes to defeat passive wireless surveillance.
              </p>
              <p>
                3. <strong>Client-Side Message Encryption:</strong> Secret time capsules are encrypted using WebCrypto AES-GCM-256 before transmission.
              </p>
            </div>
          )}

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-800/60 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Encounter History</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4 text-stone-100">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-base text-white">Reset Encounter History?</h3>
            </div>
            <p className="text-xs text-stone-400">
              This will erase all recorded shared proximity sessions from this device. Secret capsules will remain in your vault.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-stone-800 text-stone-300 py-2 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearEncounterHistory();
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-xl text-xs font-bold"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
