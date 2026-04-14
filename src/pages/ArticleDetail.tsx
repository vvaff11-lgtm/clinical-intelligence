import { useEffect, useState } from 'react';
import { ArrowLeft, Bookmark, Clock, Share2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { Article, Page } from '../types';

interface ArticleDetailProps {
  articleId: number | null;
  onNavigate: (page: Page) => void;
  onOpenChat: () => void;
}

export default function ArticleDetail({ articleId, onNavigate, onOpenChat }: ArticleDetailProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadArticle = async () => {
      try {
        const id = articleId ?? (await api.listArticles()).items[0]?.id;
        if (!id) return;
        const detail = await api.getArticle(id);
        setArticle(detail);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : '文章详情加载失败');
      }
    };

    void loadArticle();
  }, [articleId]);

  if (!article) {
    return <main className="pt-24 pb-16 px-8 max-w-4xl mx-auto">{error || '正在加载文章详情...'}</main>;
  }

  return (
    <main className="pt-24 pb-16 px-8 max-w-4xl mx-auto">
      <button onClick={() => onNavigate('news')} className="flex items-center gap-2 text-primary font-bold mb-8 hover:-translate-x-1 transition-transform">
        <ArrowLeft className="w-5 h-5" /> 返回资讯列表
      </button>

      <header className="mb-12">
        <div className="flex items-center gap-4 mb-6">
          <span className="px-3 py-1 bg-tertiary text-white text-xs font-bold rounded-full uppercase tracking-widest">{article.category}</span>
          <div className="flex items-center gap-2 text-outline text-xs">
            <Clock className="w-4 h-4" />
            <span>发布于 {new Date(article.publishedAt).toLocaleDateString('zh-CN')}</span>
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-headline font-black tracking-tighter leading-tight text-on-surface mb-8">
          {article.title}
        </h1>
        <div className="flex items-center justify-between py-6 border-y border-surface-container">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-surface-container overflow-hidden">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC3S1xboJdz1cUwjKaw-hQNDfC3PGl1qGSEGquaMS0HG4SYk8mjRFgmkPDkIlgP4I245gE00IVcq0mWPTD5_sa2tYSjQpuh-s4-CO9vvnRluXC-91bnhT71dEggpOG7vJfceIkQRUN6UAOrLNHlFg0-TcD4rne89HrtPdzXKAN4BzD2V_gjLYHSikjvBQPMlKz6hWiJ6cSQNceD-Qj3H_ZTv0geDYgyiXTTNruP55BchR9QHN9agqfMAfVn9BJ5DsEBMsfqm6rY0kU"
                alt="Author"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">{article.author}</p>
              <p className="text-xs text-outline">Clinical Intelligence 核心实验室研究员</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button className="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant">
              <Bookmark className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="aspect-video rounded-2xl overflow-hidden mb-12 shadow-xl">
        <img src={article.imageUrl} alt="Article cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>

      <article className="prose prose-slate max-w-none">
        <p className="text-xl font-light leading-relaxed text-on-surface-variant mb-8 italic">{article.excerpt}</p>
        <div className="space-y-6 text-on-surface leading-loose text-lg">
          <p>{article.content}</p>
          <div className="bg-surface-container-low p-8 rounded-xl border-l-4 border-primary my-12">
            <p className="text-primary font-bold text-xl mb-2">“AI 是辅助决策工具，临床判断始终属于医生与患者。”</p>
            <p className="text-sm text-outline">Clinical Intelligence 编辑部</p>
          </div>
          <p>本文内容已同步到后端文章接口，可与首页推荐和资讯列表保持一致。</p>
        </div>
      </article>

      <footer className="mt-16 pt-12 border-t border-surface-container">
        <div className="flex flex-wrap gap-2 mb-12">
          {article.tags.map((tag) => (
            <span key={tag} className="px-4 py-1.5 bg-surface-container-highest text-on-surface-variant text-xs font-bold rounded-full uppercase tracking-widest">
              #{tag}
            </span>
          ))}
        </div>
        <div className="bg-surface-container-low p-8 rounded-2xl flex items-center justify-between">
          <div>
            <h4 className="font-headline font-bold text-xl mb-1">对本文有疑问？</h4>
            <p className="text-sm text-on-surface-variant">您可以直接咨询我们的智能医助获取更多信息。</p>
          </div>
          <button onClick={onOpenChat} className="px-8 py-3 bg-primary text-on-primary rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all">
            立即咨询
          </button>
        </div>
      </footer>
    </main>
  );
}
