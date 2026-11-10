import React, { useState } from 'react';
import {
  X,
  FileCode2,
  Database,
  Smartphone,
  Radio,
  Layers,
  Copy,
  Check,
  Download,
} from 'lucide-react';
import { useTogether } from '../../context/TogetherContext';

export const ArchitectureExplorerModal: React.FC = () => {
  const { showArchModal, setShowArchModal } = useTogether();
  const [activeTab, setActiveTab] = useState<'architecture' | 'database' | 'flutter' | 'android' | 'bluetooth'>('architecture');
  const [copied, setCopied] = useState(false);

  if (!showArchModal) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const sqlCode = `-- Supabase / PostgreSQL Schema for Together
-- Enforces canonical ordering check (user_a < user_b) to eliminate duplicate double counting!

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  public_key TEXT NOT NULL,
  bluetooth_enabled BOOLEAN DEFAULT true NOT NULL,
  invisible_mode BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id),
  receiver_id UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT CHECK (status IN ('PENDING', 'ACCEPTED', 'BLOCKED')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT unique_friendship UNIQUE (requester_id, receiver_id)
);

CREATE TABLE public.encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES public.profiles(id),
  user_b UUID NOT NULL REFERENCES public.profiles(id),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL,
  rssi_average INTEGER,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT check_canonical_order CHECK (user_a < user_b)
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  receiver_id UUID NOT NULL REFERENCES public.profiles(id),
  encrypted_payload TEXT NOT NULL,
  unlock_type TEXT NOT NULL,
  unlock_delay_seconds INTEGER DEFAULT 0 NOT NULL,
  disconnect_timestamp TIMESTAMPTZ,
  delivery_status TEXT DEFAULT 'PENDING' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Encounter participants view" ON public.encounters
  FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);`;

  const flutterCode = `// lib/features/bluetooth/domain/encounter_state_machine.dart
import 'dart:async';

enum EncounterState {
  disconnected,
  discovered,
  verifying,
  connected,
  temporarilyLost,
  ended,
}

class BluetoothEncounterManager {
  static const int rssiProximityThreshold = -78; // dBm
  static const Duration gracePeriod = Duration(seconds: 30);

  EncounterState _state = EncounterState.disconnected;
  Timer? _graceTimer;
  DateTime? _encounterStart;

  void onDeviceDetected(int rssi) {
    if (rssi < rssiProximityThreshold) return;

    if (_state == EncounterState.temporarilyLost) {
      _graceTimer?.cancel();
      _state = EncounterState.connected;
    } else if (_state == EncounterState.disconnected) {
      _state = EncounterState.discovered;
      _startVerification();
    }
  }

  void onSignalLost() {
    if (_state == EncounterState.connected) {
      _state = EncounterState.temporarilyLost;
      _graceTimer = Timer(gracePeriod, () {
        _finalizeEncounter();
      });
    }
  }

  void _finalizeEncounter() {
    _state = EncounterState.ended;
    // Persist to Drift Database and trigger Secret Capsule unlock countdown
  }
}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-3xl max-h-[88vh] flex flex-col shadow-2xl text-stone-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <FileCode2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Together — Architecture & Codebase Blueprint</h2>
              <p className="text-[11px] text-stone-400">Clean Architecture, Supabase RLS, and Android 14+ BLE Specs</p>
            </div>
          </div>

          <button
            onClick={() => setShowArchModal(false)}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-800 bg-stone-950/40 px-3 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'architecture', label: 'Architecture', icon: Layers },
            { id: 'database', label: 'Supabase SQL', icon: Database },
            { id: 'flutter', label: 'Flutter / Riverpod', icon: Smartphone },
            { id: 'android', label: 'Android 12-14', icon: Smartphone },
            { id: 'bluetooth', label: 'BLE Protocol', icon: Radio },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 py-3 px-3 border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-amber-400 text-amber-400 font-bold'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs leading-relaxed">
          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <h3 className="font-bold text-stone-100 text-sm">Clean Architecture Modularization</h3>
              <p className="text-stone-300">
                The Flutter application separates domain logic from platform-specific Bluetooth and network layers:
              </p>
              <pre className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-amber-300/90 font-mono text-[11px] overflow-x-auto">
{`lib/
  core/
    constants/       # BLE UUIDs, RSSI thresholds (-78 dBm), grace windows (30s)
    theme/           # Material 3 typography, amber/stone custom color tokens
    utils/           # HMAC-SHA256 rotating RPI generators, duration formatters
  features/
    authentication/  # Supabase Auth, Google Sign-In, profile creation
    bluetooth/       # BLE Scanner, Advertiser, State Machine, Foreground Service
    encounters/      # Drift SQLite persistence, deduplication, live counter
    people/          # Friend requests, QR pairing, mutual consent verification
    secret_messages/ # E2EE AES-GCM-256 Vault, unlock delay timers
    analytics/       # Heatmap matrix calculator, daily/weekly stats
    profile/         # Invisible mode, Android 14 permissions, data export`}
              </pre>

              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-1.5">
                <span className="font-bold text-amber-400 block">Drift Database Justification</span>
                <p className="text-stone-300 text-[11px]">
                  Drift was chosen over Isar due to active maintenance, compile-time type-safety, and seamless migration verification tests.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-100 text-sm">PostgreSQL / Supabase Schema</span>
                <button
                  onClick={() => handleCopy(sqlCode)}
                  className="bg-stone-800 hover:bg-stone-700 text-stone-200 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 font-medium border border-stone-700"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
                </button>
              </div>
              <pre className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-emerald-400/90 font-mono text-[11px] overflow-x-auto max-h-72">
                {sqlCode}
              </pre>
            </div>
          )}

          {activeTab === 'flutter' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-100 text-sm">Bluetooth State Machine (Dart)</span>
                <button
                  onClick={() => handleCopy(flutterCode)}
                  className="bg-stone-800 hover:bg-stone-700 text-stone-200 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 font-medium border border-stone-700"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Dart'}</span>
                </button>
              </div>
              <pre className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-amber-300/90 font-mono text-[11px] overflow-x-auto max-h-72">
                {flutterCode}
              </pre>
            </div>
          )}

          {activeTab === 'android' && (
            <div className="space-y-3">
              <h3 className="font-bold text-stone-100 text-sm">Android 12, 13, 14 Permissions Strategy</h3>
              <p className="text-stone-300">
                To run background proximity detection reliably without premature OS termination:
              </p>
              <pre className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-stone-300 font-mono text-[11px] overflow-x-auto">
{`<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" 
                 android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE" />

<service
    android:name=".services.BluetoothTrackingForegroundService"
    android:foregroundServiceType="connectedDevice"
    android:exported="false" />`}
              </pre>
            </div>
          )}

          {activeTab === 'bluetooth' && (
            <div className="space-y-3">
              <h3 className="font-bold text-stone-100 text-sm">Rotating Ephemeral Identifier (RPI) Protocol</h3>
              <p className="text-stone-300">
                To prevent third parties, retail tracking beacons, or wireless sniffers from tracking users:
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <span className="font-semibold text-amber-400 block mb-1">1. 15-Minute Token Rotation</span>
                  <p className="text-stone-300 text-[11px]">
                    Every 15 minutes, the device computes <code>HMAC-SHA256(User_Secret, Time_Window)</code>. Only mutually accepted friends holding the shared pairing key can map the token back to the user.
                  </p>
                </div>
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <span className="font-semibold text-amber-400 block mb-1">2. RSSI Threshold & Multipath Debounce</span>
                  <p className="text-stone-300 text-[11px]">
                    BLE discovery operates on RSSI <code>&gt;= -78 dBm</code>. If body shadowing or pocket placement causes a momentary signal dip, a 30-second grace timer prevents broken session fragmentation.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
