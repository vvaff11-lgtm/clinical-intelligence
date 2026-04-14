import { HelpCircle, History as HistoryIcon, LogOut, Shield, User } from 'lucide-react';
import type { Page } from '../types';
import { cn } from '../lib/utils';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

export default function Sidebar({ currentPage, onNavigate, onLogout }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 bg-surface-container-low flex flex-col p-4 font-sans text-sm z-40">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center">
          <HistoryIcon className="text-white w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-black text-primary leading-tight font-headline">智医助手</h2>
          <p className="text-xs text-outline">Clinical AI Core</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        <button
          onClick={() => onNavigate('profile')}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
            currentPage === 'profile'
              ? 'bg-white text-primary shadow-sm font-medium'
              : 'text-outline hover:text-primary hover:translate-x-1'
          )}
        >
          <User className="w-5 h-5" />
          个人档案
        </button>
        <button
          onClick={() => onNavigate('history')}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
            currentPage === 'history'
              ? 'bg-white text-primary shadow-sm font-medium'
              : 'text-outline hover:text-primary hover:translate-x-1'
          )}
        >
          <HistoryIcon className="w-5 h-5" />
          智能问诊历史
        </button>
      </nav>

      <div className="mt-auto pt-4 border-t border-outline-variant/20 space-y-1">
        <button className="w-full flex items-center gap-3 px-4 py-2 text-outline hover:text-primary transition-colors text-left">
          <HelpCircle className="w-5 h-5" />
          帮助中心
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-2 text-outline hover:text-primary transition-colors text-left">
          <Shield className="w-5 h-5" />
          隐私政策
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 mt-4 bg-error-container text-error rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          <LogOut className="w-5 h-5" />
          退出
        </button>
      </div>
    </aside>
  );
}
