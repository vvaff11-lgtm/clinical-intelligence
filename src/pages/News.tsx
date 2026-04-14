import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, History, Mail, Search, TrendingUp } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { Article, Page } from '../types';

interface NewsProps {
  onNavigate: (page: Page) => void;
  onOpenArticle: (articleId: number) => void;
}

export default function News({ onNavigate, onOpenArticle }: NewsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listArticles(activeSearch || undefined)
      .then((response) => setArticles(response.items))
      .catch((err) => setError(err instanceof ApiError ? err.message : '资讯加载失败'));
  }, [activeSearch]);

  const featured = articles[0];
  const editorialFeed = useMemo(() => articles.slice(1), [articles]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchQuery);
  };

  return (
    <main className="pt-24 pb-12 px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-12">
          {error && <div className="px-4 py-3 rounded-lg bg-error-container text-error text-sm">{error}</div>}

          {articles.length > 0 ? (
            <>
              {featured && (
                <section className="group cursor-pointer" onClick={() => onOpenArticle(featured.id)}>
                  <div className="relative overflow-hidden rounded-xl mb-6 aspect-[21/9]">
                    <img
                      src={featured.imageUrl}
                      alt={featured.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-6 left-6 text-white">
                      <span className="px-3 py-1 bg-tertiary text-white text-xs font-bold rounded-full mb-3 inline-block">
                        {featured.category}
                      </span>
                      <h1 className="text-3xl font-headline font-extrabold leading-tight tracking-tight max-w-2xl">
                        {featured.title}
                      </h1>
                    </div>
                  </div>
                  <p className="text-on-surface-variant text-lg leading-relaxed line-clamp-3">{featured.excerpt}</p>
                </section>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {editorialFeed.map((article, index) => (
                  <article
                    key={article.id}
                    className={`bg-white p-6 rounded-xl hover:translate-x-1 transition-transform duration-200 shadow-sm border border-outline-variant/10 cursor-pointer ${
                      index === 2 ? 'md:col-span-2 flex flex-col md:flex-row gap-6 bg-surface-container-low' : ''
                    }`}
                    onClick={() => onOpenArticle(article.id)}
                  >
                    <div className={`${index === 2 ? 'md:w-1/3 h-56' : 'h-48'} overflow-hidden rounded-lg mb-4`}>
                      <img
                        src={article.imageUrl}
                        alt={article.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className={index === 2 ? 'md:w-2/3 flex flex-col' : ''}>
                      <span className="text-[10px] font-sans font-bold tracking-widest uppercase mb-2 block text-primary">
                        {article.category}
                      </span>
                      <h2 className={`${index === 2 ? 'text-2xl' : 'text-xl'} font-headline font-bold text-on-surface mb-3`}>
                        {article.title}
                      </h2>
                      <p className="text-sm text-on-surface-variant mb-4 line-clamp-2">{article.excerpt}</p>
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-surface-container-highest">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-slate-200"></div>
                          <span className="text-xs text-on-surface-variant">
                            {article.author} · {new Date(article.publishedAt).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                        {index === 2 && (
                          <div className="flex items-center gap-2">
                            <History className="text-primary w-4 h-4" />
                            <span className="text-xs text-on-surface-variant">阅读时长 {article.readTime}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="py-20 text-center bg-surface-container-low rounded-2xl border-2 border-dashed border-outline-variant">
              <Search className="w-12 h-12 text-outline mx-auto mb-4 opacity-20" />
              <p className="text-on-surface-variant font-medium">未找到相关资讯，请尝试其他关键词</p>
              <button onClick={() => { setSearchQuery(''); setActiveSearch(''); }} className="mt-4 text-primary font-bold hover:underline">
                清除搜索条件
              </button>
            </div>
          )}

          {articles.length > 0 && (
            <div className="flex justify-center pt-8 gap-2">
              <button className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center transition-all">1</button>
              <button className="w-10 h-10 rounded-lg flex items-center justify-center text-on-surface hover:bg-primary-fixed transition-all">2</button>
              <button className="w-10 h-10 rounded-lg flex items-center justify-center text-on-surface hover:bg-primary-fixed transition-all">3</button>
              <button className="w-10 h-10 rounded-lg flex items-center justify-center text-on-surface hover:bg-primary-fixed transition-all">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-surface-container-low p-4 rounded-xl shadow-sm border border-surface-container-high">
            <form onSubmit={handleSearch} className="relative flex items-center gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/60 shadow-inner"
                  placeholder="搜索资讯..."
                  type="text"
                />
              </div>
              <button type="submit" className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:bg-primary-container transition-all active:scale-95">
                搜索
              </button>
            </form>
          </div>

          <div className="bg-surface-container-low p-8 rounded-xl">
            <h3 className="font-headline font-bold text-lg mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-primary rounded-full"></span>
              资讯分类
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => { setSearchQuery(''); setActiveSearch(''); }}
                className={`w-full flex justify-between items-center px-4 py-3 shadow-sm font-semibold rounded-lg transition-all ${
                  !activeSearch ? 'bg-primary text-white' : 'bg-white text-primary hover:bg-surface-container-highest'
                }`}
              >
                <span>全部资讯</span>
                <span className={`px-2 py-0.5 rounded text-xs ${!activeSearch ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>
                  {articles.length}
                </span>
              </button>
              <button onClick={() => { setSearchQuery('研究'); setActiveSearch('研究'); }} className="w-full flex justify-between items-center px-4 py-3 hover:bg-white/50 transition-all rounded-lg text-on-surface-variant">
                <span>前沿科技</span>
                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs">32</span>
              </button>
              <button onClick={() => { setSearchQuery('健康'); setActiveSearch('健康'); }} className="w-full flex justify-between items-center px-4 py-3 hover:bg-white/50 transition-all rounded-lg text-on-surface-variant">
                <span>健康养生</span>
                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs">45</span>
              </button>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-xl border border-outline-variant/20 shadow-xl">
            <h3 className="font-headline font-bold text-lg mb-6 flex items-center gap-2 text-tertiary">
              <TrendingUp className="w-5 h-5" />
              全网热点
            </h3>
            <div className="space-y-6">
              {articles.slice(0, 3).map((article, index) => (
                <div key={article.id} className="flex gap-4">
                  <span className="text-2xl font-black text-tertiary/20">{`0${index + 1}`}</span>
                  <div>
                    <h4
                      onClick={() => onOpenArticle(article.id)}
                      className="font-bold text-sm leading-tight hover:text-tertiary cursor-pointer transition-colors"
                    >
                      {article.title}
                    </h4>
                    <p className="text-[10px] text-on-surface-variant mt-1">{article.readTime} · {article.category}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-primary p-8 rounded-xl text-on-primary">
            <Mail className="w-10 h-10 mb-4" />
            <h3 className="text-xl font-headline font-bold mb-2">订阅每周精选</h3>
            <p className="text-sm opacity-80 mb-6 font-light">获取最新医疗突破与健康趋势，每周二准时发送至您的邮箱。</p>
            <div className="space-y-3">
              <input className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-white/30 border-0" placeholder="输入您的电子邮箱" type="email" />
              <button className="w-full bg-white text-primary font-bold py-2 rounded-lg text-sm hover:bg-primary-fixed transition-all">
                立即订阅
              </button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
