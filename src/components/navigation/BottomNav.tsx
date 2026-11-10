import React from 'react';
import { Home, Users, BarChart3, Lock, User, Sparkles } from 'lucide-react';
import { useTogether } from '../../context/TogetherContext';

interface TabItem {
  id: 'home' | 'people' | 'time' | 'vault' | 'profile';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, capsules, currentUser } = useTogether();

  // Count unopened capsules for current user
  const readyCapsulesCount = capsules.filter(
    (c) => c.recipientId === currentUser.id && !c.isUnlocked
  ).length;

  const tabs: TabItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'people', label: 'People', icon: Users },
    { id: 'time', label: 'Time', icon: BarChart3 },
    {
      id: 'vault',
      label: 'Vault',
      icon: Lock,
      badge: readyCapsulesCount > 0 ? readyCapsulesCount : undefined,
    },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav 
      aria-label="Main Navigation" 
      className="fixed bottom-0 left-0 right-0 z-40 bg-stone-900/95 backdrop-blur-md border-t border-stone-800/80 px-2 py-1 max-w-md mx-auto"
    >
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-amber-400 font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 bg-amber-500 text-stone-950 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
