import { ChevronRight, Download, Filter, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { api, ApiError } from '../lib/api';
import type { ConsultationSession, Page } from '../types';

interface HistoryProps {
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  onOpenConsultation: (sessionId: number) => void;
  onAuthExpired: (error: unknown) => void;
}

export default function History({ onNavigate, onLogout, onOpenConsultation, onAuthExpired }: HistoryProps) {
  const [historyItems, setHistoryItems] = useState<ConsultationSession[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listConsultations()
      .then((response) => setHistoryItems(response.items))
      .catch((err) => {
        onAuthExpired(err);
        setError(err instanceof ApiError ? err.message : '问诊历史加载失败');
      });
  }, []);

  const filteredItems = useMemo(
    () => historyItems.filter((item) => item.title.includes(query) || item.summary.includes(query)),
    [historyItems, query]
  );

  return (
    <div className="pt-16 flex min-h-screen bg-surface">
      <Sidebar currentPage="history" onNavigate={onNavigate} onLogout={onLogout} />

      <main className="flex-grow ml-64 p-12">
        <div className="max-w-5xl mx-auto">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="space-y-1">
              <h1 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">智能问诊历史</h1>
              <p className="text-on-surface-variant font-medium">查看您过去的所有 AI 咨询记录与健康建议报告。</p>
            </div>
            <div className="flex gap-3">
              <button className="px-6 py-2.5 bg-surface-container-high text-on-surface rounded-lg font-bold flex items-center gap-2 hover:bg-surface-container-highest transition-all">
                <Filter className="w-4 h-4" /> 筛选
              </button>
              <button className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-bold flex items-center gap-2 hover:bg-primary-container transition-all shadow-lg shadow-primary/10">
                <Download className="w-4 h-4" /> 导出全部
              </button>
            </div>
          </header>

          <div className="mb-8 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border-none ring-1 ring-outline-variant/30 focus:ring-2 focus:ring-primary shadow-sm transition-all"
              placeholder="搜索问诊记录、症状或建议..."
              type="text"
            />
          </div>

          {error && <div className="mb-6 px-4 py-3 rounded-lg bg-error-container text-error text-sm">{error}</div>}

          <div className="space-y-4">
            {filteredItems.map((item) => {
              const date = new Date(item.lastMessageAt);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-6 flex items-center gap-6 hover:translate-x-1 transition-all cursor-pointer shadow-sm border border-outline-variant/10 group"
                  onClick={() => onOpenConsultation(item.id)}
                >
                  <div className="w-14 h-14 rounded-xl bg-surface-container-low flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-tighter">
                      {date.toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-xl font-black text-primary leading-none">
                      {date.toLocaleDateString('zh-CN', { day: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex-grow space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase tracking-widest">
                        智能问诊
                      </span>
                      <span className="text-xs text-outline font-medium">{date.toLocaleString('zh-CN')}</span>
                    </div>
                    <h3 className="text-lg font-headline font-bold text-on-surface group-hover:text-primary transition-colors">{item.title}</h3>
                    <p className="text-sm text-on-surface-variant line-clamp-1">{item.summary}</p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="hidden md:flex flex-col items-end">
                      <span className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1">状态</span>
                      <span className="text-xs font-bold text-tertiary flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-tertiary"></div>
                        已完成
                      </span>
                    </div>
                    <ChevronRight className="text-outline group-hover:text-primary transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
