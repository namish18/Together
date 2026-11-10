/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TogetherProvider, useTogether } from './context/TogetherContext';
import { BLEProximityStudio } from './components/simulator/BLEProximityStudio';
import { HomeScreen } from './components/dashboard/HomeScreen';
import { PeopleScreen } from './components/people/PeopleScreen';
import { AnalyticsScreen } from './components/analytics/AnalyticsScreen';
import { VaultScreen } from './components/vault/VaultScreen';
import { ProfileScreen } from './components/profile/ProfileScreen';
import { BottomNav } from './components/navigation/BottomNav';
import { ArchitectureExplorerModal } from './components/docs/ArchitectureExplorerModal';

const AppContent: React.FC = () => {
  const { activeTab, setActiveTab } = useTogether();
  const [composeRecipientId, setComposeRecipientId] = useState<string | null>(null);

  const handleComposeCapsule = (friendId: string) => {
    setComposeRecipientId(friendId);
    setActiveTab('vault');
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Top Interactive Bluetooth Simulator & Identity Bar */}
      <BLEProximityStudio />

      {/* Main Mobile App Container */}
      <main className="flex-1 w-full max-w-md mx-auto relative bg-stone-950 min-h-[calc(100vh-45px)] shadow-2xl border-x border-stone-900">
        {activeTab === 'home' && <HomeScreen />}
        {activeTab === 'people' && (
          <PeopleScreen onComposeCapsule={handleComposeCapsule} />
        )}
        {activeTab === 'time' && <AnalyticsScreen />}
        {activeTab === 'vault' && (
          <VaultScreen
            initialRecipientId={composeRecipientId}
            onClearInitialRecipient={() => setComposeRecipientId(null)}
          />
        )}
        {activeTab === 'profile' && <ProfileScreen />}

        {/* Bottom Material 3 Navigation Bar */}
        <BottomNav />
      </main>

      {/* Technical Architecture & Flutter Blueprint Modal */}
      <ArchitectureExplorerModal />
    </div>
  );
};

export default function App() {
  return (
    <TogetherProvider>
      <AppContent />
    </TogetherProvider>
  );
}
