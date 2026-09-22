import React from 'react';
import { ActiveTab } from '../types';
import { ShoppingCart, ShoppingBag, Package, Layers, Sliders } from 'lucide-react';

interface NavigationProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  cartItemCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  cartItemCount,
}) => {
  const tabs = [
    {
      id: 'order' as ActiveTab,
      label: 'สั่งของ',
      sublabel: 'ORDER',
      icon: ShoppingCart,
    },
    {
      id: 'cart' as ActiveTab,
      label: 'ตะกร้า',
      sublabel: 'CART',
      icon: ShoppingBag,
      badge: cartItemCount > 0 ? cartItemCount : undefined,
    },
    {
      id: 'products' as ActiveTab,
      label: 'วัตถุดิบ',
      sublabel: 'PRODUCTS',
      icon: Package,
    },
    {
      id: 'categories' as ActiveTab,
      label: 'หมวดหมู่',
      sublabel: 'CATEGORIES',
      icon: Layers,
    },
    {
      id: 'settings' as ActiveTab,
      label: 'ตั้งค่า',
      sublabel: 'SETTINGS',
      icon: Sliders,
    },
  ];

  return (
    <>
      {/* Desktop / Tablet Top Navigation Bar */}
      <nav
        id="desktop-navigation"
        className="hidden md:block bg-white border-b border-gray-200 sticky top-[73px] z-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex space-x-2 py-2 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-desktop-tab-${tab.id}`}
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all shrink-0 active:scale-95 ${
                    isActive
                      ? 'bg-[#F27D26]/10 text-[#F27D26]'
                      : 'text-gray-500 hover:text-[#141414] hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                  <span>{tab.label}</span>
                  <span className="text-[10px] opacity-60 font-semibold">{tab.sublabel}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`ml-0.5 px-2 py-0.5 rounded-full text-xs font-black ${
                        isActive ? 'bg-[#F27D26] text-white' : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Fixed Navigation Bar */}
      <nav
        id="mobile-bottom-navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-xl px-2 pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="grid grid-cols-5 gap-1 py-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-mobile-tab-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all active:scale-95 ${
                  isActive
                    ? 'text-[#F27D26] font-bold'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                  {tab.badge !== undefined && (
                    <span
                      id="nav-mobile-cart-badge"
                      className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-[#F27D26] text-white text-[10px] font-black flex items-center justify-center leading-none"
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-1 font-semibold leading-none">{tab.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F27D26] mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
