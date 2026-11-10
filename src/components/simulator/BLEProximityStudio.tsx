import React, { useState } from 'react';
import {
  Bluetooth,
  Radio,
  Sliders,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
  Shield,
  UserCheck,
  AlertTriangle,
  Play,
  Square,
  Sparkles,
} from 'lucide-react';
import { useTogether } from '../../context/TogetherContext';
import { MOCK_USERS } from '../../data/mock-data';

export const BLEProximityStudio: React.FC = () => {
  const {
    currentUser,
    switchUser,
    activeEncounter,
    simulateBringTogether,
    simulateSeparate,
    simulateSignalDrop,
    simulateSignalRecover,
    currentRpi,
    isWebBleAvailable,
    isWebBleScanning,
    startWebBluetoothScan,
    trackingEnabled,
    invisibleMode,
  } = useTogether();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('user_bruno');
  const [customRssi, setCustomRssi] = useState<number>(-65);

  const availablePartners = Object.values(MOCK_USERS).filter((u) => u.id !== currentUser.id);

  return (
    <div className="bg-stone-900 border-b border-stone-800 text-stone-100 text-xs">
      {/* Top Banner / Toggle Bar */}
      <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-between">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-stone-300 hover:text-amber-400 font-medium transition-colors"
          aria-expanded={isOpen}
          aria-label="Toggle BLE Simulator and Proximity Studio"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <Radio className="w-3.5 h-3.5 text-amber-400" />
          <span>BLE Proximity Studio</span>
          {activeEncounter && (
            <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono text-[10px]">
              {activeEncounter.state} with {activeEncounter.partnerName.split(' ')[0]}
            </span>
          )}
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* Identity Quick Switcher */}
        <div className="flex items-center gap-1.5">
          <span className="text-stone-400 text-[11px]">Viewing as:</span>
          <select
            value={currentUser.id}
            onChange={(e) => switchUser(e.target.value)}
            className="bg-stone-800 text-amber-300 font-semibold rounded px-2 py-1 text-xs border border-stone-700 focus:outline-none focus:border-amber-400"
            aria-label="Switch Active User Identity"
          >
            {Object.values(MOCK_USERS).map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName} (@{user.username})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expanded Controls Drawer */}
      {isOpen && (
        <div className="max-w-md mx-auto px-4 py-3 bg-stone-950/70 border-t border-stone-800/80 space-y-3">
          {/* Identity & BLE RPI Info */}
          <div className="grid grid-cols-2 gap-2 text-[11px] bg-stone-900/60 p-2.5 rounded-xl border border-stone-800">
            <div>
              <span className="text-stone-400 block">Active Device RPI (Rotating):</span>
              <span className="font-mono text-emerald-400 font-medium truncate block">{currentRpi}</span>
            </div>
            <div>
              <span className="text-stone-400 block">Foreground Service:</span>
              <span className="text-stone-200 flex items-center gap-1 font-medium">
                <Shield className="w-3 h-3 text-emerald-400" />
                {trackingEnabled && !invisibleMode ? 'Active (API 34+)' : 'Disabled / Hidden'}
              </span>
            </div>
          </div>

          {/* Encounter Simulation Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-stone-300 font-medium">
              <span>Simulate Physical Encounter:</span>
              <span className="text-[10px] text-stone-400 font-mono">RSSI: {customRssi} dBm</span>
            </div>

            <div className="flex gap-2">
              <select
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
                className="flex-1 bg-stone-900 text-stone-200 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs"
                disabled={!!activeEncounter}
              >
                {availablePartners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName} (@{p.username})
                  </option>
                ))}
              </select>

              {!activeEncounter ? (
                <button
                  onClick={() => simulateBringTogether(selectedPartnerId, customRssi)}
                  className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Start Proximity</span>
                </button>
              ) : (
                <button
                  onClick={() => simulateSeparate(activeEncounter.userBId)}
                  className="bg-rose-500 hover:bg-rose-400 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Part Ways (End)</span>
                </button>
              )}
            </div>

            {/* RSSI Signal & Grace Period Simulator */}
            {activeEncounter && (
              <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-stone-300">Signal Degradation & Grace Period Test:</span>
                  <span className={`font-medium ${activeEncounter.state === 'TEMPORARILY_LOST' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    State: {activeEncounter.state}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => simulateSignalDrop(activeEncounter.userBId)}
                    disabled={activeEncounter.state === 'TEMPORARILY_LOST'}
                    className="flex-1 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-300 py-1.5 px-2 rounded text-[11px] font-medium border border-stone-700"
                  >
                    Simulate Signal Drop (-95dBm)
                  </button>
                  <button
                    onClick={() => simulateSignalRecover(activeEncounter.userBId)}
                    disabled={activeEncounter.state !== 'TEMPORARILY_LOST'}
                    className="flex-1 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-emerald-300 py-1.5 px-2 rounded text-[11px] font-medium border border-stone-700"
                  >
                    Recover Signal (-62dBm)
                  </button>
                </div>
                {activeEncounter.state === 'TEMPORARILY_LOST' && (
                  <p className="text-[10px] text-amber-400/90 italic">
                    Grace period running (30s debounce). If signal does not recover, session will finalize without false drops.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Web Bluetooth API scan button */}
          <div className="pt-1 flex items-center justify-between border-t border-stone-800/80 text-[11px]">
            <span className="text-stone-400">Hardware Web Bluetooth:</span>
            <button
              onClick={startWebBluetoothScan}
              disabled={isWebBleScanning}
              className="text-stone-300 hover:text-amber-400 flex items-center gap-1 font-medium disabled:opacity-50"
            >
              <Bluetooth className={`w-3.5 h-3.5 ${isWebBleScanning ? 'animate-pulse text-amber-400' : ''}`} />
              <span>{isWebBleScanning ? 'Scanning Hardware...' : 'Scan Nearby BLE'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
