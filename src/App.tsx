import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { clearToken, setToken, api, ApiError } from './lib/api';
import type { AuthResponse, AuthUser, Page } from './types';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Chat from './pages/Chat';
import News from './pages/News';
import Drugs from './pages/Drugs';
import ArticleDetail from './pages/ArticleDetail';
import Profile from './pages/Profile';
import History from './pages/History';
import KnowledgeGraph from './pages/KnowledgeGraph';

const PUBLIC_PAGES: Page[] = ['login', 'register'];

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const [selectedConsultationId, setSelectedConsultationId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .me()
      .then((authUser) => {
        if (!mounted) return;
        setUser(authUser);
        setCurrentPage('home');
      })
      .catch(() => {
        if (!mounted) return;
        clearToken();
        setUser(null);
        setCurrentPage('login');
      })
      .finally(() => {
        if (mounted) {
          setBooting(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleAuthSuccess = (response: AuthResponse) => {
    setToken(response.token);
    setUser(response.user);
    setCurrentPage('home');
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setSelectedArticleId(null);
    setSelectedConsultationId(null);
    setCurrentPage('login');
  };

  const handleNavigate = (page: Page) => {
    if (!user && !PUBLIC_PAGES.includes(page)) {
      setCurrentPage('login');
      return;
    }
    setCurrentPage(page);
  };

  const handleAuthExpired = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      handleLogout();
    }
  };

  const pageContent = useMemo(() => {
    switch (currentPage) {
      case 'login':
        return <Login onLogin={handleAuthSuccess} onNavigateToRegister={() => setCurrentPage('register')} />;
      case 'register':
        return <Register onRegister={handleAuthSuccess} onNavigateToLogin={() => setCurrentPage('login')} />;
      case 'home':
        return (
          <Home
            onNavigate={handleNavigate}
            onOpenArticle={(articleId) => {
              setSelectedArticleId(articleId);
              setCurrentPage('article');
            }}
          />
        );
      case 'chat':
        return (
          <Chat
            activeSessionId={selectedConsultationId}
            onNavigate={handleNavigate}
            onSelectSession={setSelectedConsultationId}
            onAuthExpired={handleAuthExpired}
          />
        );
      case 'news':
        return (
          <News
            onNavigate={handleNavigate}
            onOpenArticle={(articleId) => {
              setSelectedArticleId(articleId);
              setCurrentPage('article');
            }}
          />
        );
      case 'drugs':
        return <Drugs onNavigate={handleNavigate} />;
      case 'article':
        return (
          <ArticleDetail
            articleId={selectedArticleId}
            onNavigate={handleNavigate}
            onOpenChat={() => setCurrentPage('chat')}
          />
        );
      case 'profile':
        return <Profile onNavigate={handleNavigate} onLogout={handleLogout} onAuthExpired={handleAuthExpired} />;
      case 'history':
        return (
          <History
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            onOpenConsultation={(sessionId) => {
              setSelectedConsultationId(sessionId);
              setCurrentPage('chat');
            }}
            onAuthExpired={handleAuthExpired}
          />
        );
      case 'knowledge-graph':
        return <KnowledgeGraph onNavigate={handleNavigate} onAuthExpired={handleAuthExpired} />;
      default:
        return null;
    }
  }, [currentPage, selectedArticleId, selectedConsultationId, user]);

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-on-surface-variant">正在初始化应用...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {user && !PUBLIC_PAGES.includes(currentPage) && (
        <Navbar user={user} currentPage={currentPage} onNavigate={handleNavigate} onLogout={handleLogout} />
      )}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {pageContent}
          </motion.div>
        </AnimatePresence>
      </main>
      {user && !PUBLIC_PAGES.includes(currentPage) && currentPage !== 'chat' && <Footer />}
    </div>
  );
}
