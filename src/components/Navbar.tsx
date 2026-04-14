import { useState } from 'react';
import { History, LogOut, User as UserIcon } from 'lucide-react';
import type { AuthUser, Page } from '../types';
import { cn } from '../lib/utils';

interface NavbarProps {
  user: AuthUser;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

export default function Navbar({ user, currentPage, onNavigate, onLogout }: NavbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const navItems = [
    { label: '首页', page: 'home' as Page },
    { label: '智能问诊', page: 'chat' as Page },
    { label: '药品信息', page: 'drugs' as Page },
    { label: '医疗资讯', page: 'news' as Page },
  ];

  return (
    <>
      {isDropdownOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[55]"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}

      <nav className="fixed top-0 w-full z-[60] bg-white/80 backdrop-blur-xl shadow-sm h-16 flex justify-between items-center px-8 font-headline tracking-tight">
        <div className="flex items-center gap-8">
          <span
            className="text-2xl font-bold tracking-tighter text-primary cursor-pointer"
            onClick={() => onNavigate('home')}
          >
            Clinical Intelligence
          </span>
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className={cn(
                  'transition-colors font-semibold py-1',
                  currentPage === item.page || (currentPage === 'article' && item.page === 'news')
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-on-surface-variant hover:text-primary'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="h-9 w-9 rounded-full bg-surface-container overflow-hidden ring-2 ring-primary/20 cursor-pointer"
            >
              <img
                src={user.avatar}
                alt="User Profile"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-2xl border border-outline-variant/15 py-2 z-[70] overflow-hidden">
                <div className="px-4 py-3 border-b border-surface-container">
                  <p className="text-sm font-bold text-on-surface">{user.name}</p>
                  <p className="text-xs text-on-surface-variant">{user.email}</p>
                </div>
                <div className="py-2">
                  <button
                    onClick={() => {
                      onNavigate('profile');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-surface-container-low text-on-surface transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-primary" />
                    <span className="text-sm">个人档案</span>
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('history');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-surface-container-low text-on-surface transition-colors"
                  >
                    <History className="w-4 h-4 text-primary" />
                    <span className="text-sm">智能问诊历史</span>
                  </button>
                </div>
                <div className="pt-2 border-t border-surface-container">
                  <button
                    onClick={() => {
                      onLogout();
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-error-container/20 text-error transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-semibold uppercase tracking-wider">退出</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
