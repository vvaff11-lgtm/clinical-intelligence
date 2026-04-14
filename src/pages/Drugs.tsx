import React, { useEffect, useMemo, useState } from 'react';
import { Bolt, Filter, Heart, Search } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { Drug, Page } from '../types';

interface DrugsProps {
  onNavigate: (page: Page) => void;
}

export default function Drugs({ onNavigate }: DrugsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [selectedDrugId, setSelectedDrugId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listDrugs(activeSearch || undefined)
      .then((response) => {
        setDrugs(response.items);
        setSelectedDrugId((current) => current ?? response.items[0]?.id ?? null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : '药品数据加载失败'));
  }, [activeSearch]);

  const selectedDrug = useMemo(
    () => drugs.find((drug) => drug.id === selectedDrugId) ?? drugs[0] ?? null,
    [drugs, selectedDrugId]
  );

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setActiveSearch(searchQuery);
  };

  return (
    <main className="pt-24 pb-16 px-8 max-w-7xl mx-auto">
      <header className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl w-full">
            <h1 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface mb-2">药品目录库</h1>
            <p className="text-on-surface-variant mb-6 font-medium">
              智能检索系统：连接本地数据库中的临床药品信息与最新说明数据。
            </p>
            <form onSubmit={handleSearch} className="relative group flex gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border-none ring-1 ring-outline-variant focus:ring-2 focus:ring-primary shadow-sm transition-all text-lg"
                  placeholder="搜索药品名称、成分或病症..."
                  type="text"
                />
              </div>
              <button
                type="submit"
                className="px-8 py-4 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary-container transition-all shadow-md shadow-primary/20 active:scale-95"
              >
                搜索
              </button>
            </form>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onNavigate('home')}
              className="px-6 py-3 bg-tertiary-container text-on-tertiary-container rounded-full font-semibold flex items-center gap-2 hover:opacity-90 transition-all"
            >
              <Filter className="w-5 h-5" /> 返回首页
            </button>
          </div>
        </div>
      </header>

      {error && <div className="mb-6 px-4 py-3 rounded-lg bg-error-container text-error text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {drugs.length > 0 ? (
            drugs.map((drug) => (
              <div
                key={drug.id}
                onClick={() => setSelectedDrugId(drug.id)}
                className={`bg-white rounded-xl p-5 hover:translate-y-[-4px] transition-all cursor-pointer border shadow-sm ${
                  selectedDrug?.id === drug.id ? 'border-primary ring-1 ring-primary' : 'border-transparent hover:border-primary/10'
                }`}
              >
                <div className="aspect-video rounded-lg overflow-hidden mb-4 bg-surface-container">
                  <img src={drug.imageUrl} alt={drug.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex justify-between items-start mb-2">
                  <span
                    className={`text-xs font-bold tracking-widest px-2 py-0.5 rounded uppercase ${
                      drug.drugType === 'OTC' ? 'bg-tertiary/10 text-tertiary' : 'bg-error/10 text-error'
                    }`}
                  >
                    {drug.drugType}
                  </span>
                </div>
                <h3 className="font-headline font-bold text-lg mb-1">{drug.name}</h3>
                <p className="text-sm text-on-surface-variant line-clamp-2 leading-relaxed">{drug.description}</p>
                {drug.drugType === 'RX' && (
                  <div className="mt-3 flex items-center gap-1 text-tertiary text-xs font-bold uppercase tracking-tighter">
                    <Bolt className="w-3 h-3" /> AI 强烈推荐
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-surface-container-low rounded-2xl border-2 border-dashed border-outline-variant">
              <Search className="w-12 h-12 text-outline mx-auto mb-4 opacity-20" />
              <p className="text-on-surface-variant font-medium">未找到相关药品，请尝试其他关键词</p>
            </div>
          )}
        </div>

        {selectedDrug && (
          <div className="lg:col-span-5">
            <div className="sticky top-24 glass-panel rounded-xl p-8 border border-white/50 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full mb-3 uppercase tracking-widest">
                    Selected Insight
                  </span>
                  <h2 className="text-3xl font-extrabold font-headline tracking-tighter text-on-surface">{selectedDrug.name}</h2>
                  <p className="text-on-surface-variant font-medium">{selectedDrug.scientificName}</p>
                </div>
                <button className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-sm text-outline hover:text-error transition-colors">
                  <Heart className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-tertiary/5 rounded-lg p-5 border-l-4 border-tertiary mb-8">
                <div className="flex items-center gap-2 text-tertiary font-bold mb-2">
                  <Bolt className="w-4 h-4" />
                  <span className="text-sm uppercase tracking-wider">临床智能分析</span>
                </div>
                <p className="text-sm text-tertiary leading-relaxed">{selectedDrug.aiInsight}</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-container-low rounded-lg">
                    <span className="block text-[10px] font-bold text-outline uppercase tracking-widest mb-1">标准用法</span>
                    <span className="font-headline font-bold text-on-surface">{selectedDrug.dosage}</span>
                  </div>
                  <div className="p-4 bg-surface-container-low rounded-lg">
                    <span className="block text-[10px] font-bold text-outline uppercase tracking-widest mb-1">规格包装</span>
                    <span className="font-headline font-bold text-on-surface">{selectedDrug.packaging}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-outline uppercase tracking-widest mb-3">适应症</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDrug.indications.map((indication) => (
                      <span key={indication} className="px-3 py-1 bg-surface-container-highest text-on-surface-variant text-xs font-medium rounded-full">
                        {indication}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
