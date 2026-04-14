import { useEffect, useState } from 'react';
import { ArrowRight, Bolt, Search } from 'lucide-react';
import { api } from '../lib/api';
import type { Article, Page } from '../types';

interface HomeProps {
  onNavigate: (page: Page) => void;
  onOpenArticle: (articleId: number) => void;
}

export default function Home({ onNavigate, onOpenArticle }: HomeProps) {
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    api.listArticles().then((response) => setArticles(response.items)).catch(() => setArticles([]));
  }, []);

  const featured = articles[0];
  const secondary = articles.slice(1, 3);

  return (
    <div className="pt-16 pb-12">
      <section className="relative w-full h-[500px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-container z-0"></div>
        <div className="absolute inset-0 opacity-20 mix-blend-overlay z-0">
          <img
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA_iPh34YE3RIzyiKyICx4BjWUodIA3SeFhr68dIG2ich1fmfqhGK0BbAQK2BBvQeZAMwlHZxdNncMIELa-IPB2ohSycbrII7A3gjmHQGn6ytyxVjF9LzdjHi20ooYK5DGnt1YBjdiix9ITbIMeVRh0WLvlOvVz-KRP3WR6QMnRWaAsMQ9wU94DB9ghqxN2e5HEInbfmj6ms7AAD2xu3pr-hO7zpdW6BsPZG6NBrUJOtKkQQHVeQBbhZjudilXT2jUeKn6SUZIOPDc"
            alt="Hero Background"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-10 w-full max-w-5xl px-8 flex flex-col items-center text-center">
          <h1 className="font-headline text-5xl md:text-7xl font-extrabold text-on-primary tracking-tighter mb-6">
            Clinical Intelligence
          </h1>
          <p className="text-white/80 text-lg md:text-xl font-light mb-12 max-w-2xl">
            通过 AI 智能技术为您提供精准的健康评估与医疗建议，开启个性化健康新时代。
          </p>

          <div className="w-full max-w-3xl glass-panel p-2 rounded-xl shadow-2xl flex items-center group focus-within:ring-2 ring-tertiary transition-all">
            <Search className="mx-4 text-on-surface-variant" />
            <input
              className="flex-grow bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline py-4 font-sans text-lg"
              placeholder="描述您的症状，例如：头痛伴随发热..."
              type="text"
              readOnly
            />
            <button
              onClick={() => onNavigate('chat')}
              className="bg-primary text-on-primary px-8 py-3 rounded-lg font-semibold hover:bg-primary-container transition-all flex items-center gap-2"
            >
              智能诊断
              <Bolt className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-3 mt-6">
            <span className="px-4 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-sans uppercase tracking-widest backdrop-blur-md">过敏咨询</span>
            <span className="px-4 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-sans uppercase tracking-widest backdrop-blur-md">用药建议</span>
            <span className="px-4 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-sans uppercase tracking-widest backdrop-blur-md">体检解读</span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-8 mt-16 space-y-24">
        <section>
          <div className="flex justify-between items-end mb-10">
            <div className="space-y-1">
              <span className="text-xs font-sans text-primary font-bold uppercase tracking-[0.2em]">Personalized Insights</span>
              <h2 className="font-headline text-4xl font-bold tracking-tight">为您推荐</h2>
            </div>
            <button onClick={() => onNavigate('news')} className="text-primary font-semibold flex items-center gap-1 group">
              查看更多 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-6 h-auto md:h-[600px]">
            {featured && (
              <div
                className="md:col-span-2 md:row-span-2 bg-surface-container-high rounded-xl overflow-hidden group relative cursor-pointer"
                onClick={() => onOpenArticle(featured.id)}
              >
                <img
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  src={featured.imageUrl}
                  alt={featured.title}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-0 p-8 space-y-3">
                  <span className="bg-blue-600 text-white px-2 py-1 text-[10px] font-bold rounded uppercase tracking-widest">
                    {featured.category}
                  </span>
                  <h3 className="text-white font-headline text-3xl font-bold">{featured.title}</h3>
                  <p className="text-white/70 text-sm font-light">{featured.excerpt}</p>
                </div>
              </div>
            )}

            {secondary.map((article) => (
              <div
                key={article.id}
                className="md:col-span-2 bg-white rounded-xl overflow-hidden group flex shadow-sm border border-outline-variant/10 cursor-pointer"
                onClick={() => onOpenArticle(article.id)}
              >
                <div className="w-1/2 p-6 flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-primary font-sans text-[10px] font-bold uppercase tracking-widest">{article.category}</span>
                    <h3 className="font-headline text-xl font-bold leading-tight">{article.title}</h3>
                  </div>
                  <span className="text-outline text-[10px] font-sans">阅读时长 · {article.readTime}</span>
                </div>
                <div className="w-1/2 overflow-hidden">
                  <img
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    src={article.imageUrl}
                    alt={article.title}
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
