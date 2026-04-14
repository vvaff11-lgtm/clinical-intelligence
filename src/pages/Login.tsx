import { FormEvent, useState } from 'react';
import { Lock, Mail, User } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { AuthResponse } from '../types';

interface LoginProps {
  onLogin: (response: AuthResponse) => void;
  onNavigateToRegister: () => void;
}

export default function Login({ onLogin, onNavigateToRegister }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await api.login({ email, password });
      onLogin(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '登录失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="fixed inset-0 z-0">
        <img
          className="w-full h-full object-cover opacity-30 grayscale-[20%]"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUG7ysXKVAOPlytup9HxeN3geODwEtxSrYLARC0EtG_Bp5KqLvzG_KQM-XN_-Y7BmshYajNSQDrk_tBDexvXoisEaTb3eVTzk6-cKXPPRRyz-GJVDGiUFmQoaBpAVnP9yYdbxwW1twmJVqhRtBqciJiLddkWcZj2khCMxLcHtNCHp1R_PsWZB82ZFz04LiDsK8M8QPbmji9LAScr2gk0yH1-AEhRVPtGnwdrakFJI786zhV8WQ5fPy2t8viUznfGFbBrNxkwbfqM8"
          alt="Clinic Background"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-surface/60 to-surface/80"></div>
      </div>

      <main className="relative z-10 w-full max-w-6xl px-6 grid md:grid-cols-2 gap-12 items-center">
        <div className="hidden md:flex flex-col space-y-6">
          <div className="space-y-2">
            <span className="text-tertiary font-sans text-xs uppercase tracking-widest font-bold">
              Clinical Intelligence Framework
            </span>
            <h1 className="font-headline text-6xl font-extrabold text-primary tracking-tighter leading-none">
              Clinical <br /> Intelligence
            </h1>
          </div>
          <p className="text-on-surface-variant text-lg max-w-md font-light leading-relaxed">
            通过 <span className="text-tertiary font-semibold">AI 智能医疗系统</span>
            为医疗专业人员赋能。精准诊断与直观的护理管理。
          </p>
          <div className="flex items-center gap-6 pt-8">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm">
              <User className="text-tertiary w-5 h-5" />
              <span className="text-sm font-medium text-on-surface">AI Secure Verified</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm">
              <Lock className="text-primary w-5 h-5" />
              <span className="text-sm font-medium text-on-surface">End-to-End Encryption</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <div className="glass-panel w-full max-w-md p-10 rounded-xl shadow-2xl border border-white/40">
            <div className="mb-10 text-center md:text-left">
              <h2 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-2">欢迎回来</h2>
              <p className="text-on-surface-variant text-sm">请输入您的凭据以访问智能问诊系统</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label
                  className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1"
                  htmlFor="email"
                >
                  用户邮箱
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-outline group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    className="block w-full pl-11 pr-4 py-3.5 bg-surface-container-highest/50 border-none rounded-lg focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline/60 text-on-surface"
                    id="email"
                    placeholder="输入您的邮箱"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label
                    className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant"
                    htmlFor="password"
                  >
                    密码
                  </label>
                  <a
                    className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary-container transition-colors"
                    href="#"
                  >
                    忘记密码？
                  </a>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-outline group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    className="block w-full pl-11 pr-4 py-3.5 bg-surface-container-highest/50 border-none rounded-lg focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline/60 text-on-surface"
                    id="password"
                    placeholder="输入您的密码"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                  id="remember"
                  type="checkbox"
                />
                <label className="text-xs text-on-surface-variant" htmlFor="remember">
                  保持登录状态
                </label>
              </div>

              {error && <p className="text-sm text-error">{error}</p>}

              <div className="pt-4">
                <button
                  className="w-full py-4 bg-primary text-on-primary font-bold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-container transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? '登录中...' : '登录'}
                </button>
              </div>
            </form>

            <div className="mt-8 flex flex-col items-center space-y-6">
              <div className="w-full flex items-center gap-4">
                <div className="h-[1px] flex-1 bg-outline-variant/30"></div>
                <span className="text-[10px] font-bold text-outline uppercase tracking-tighter">或者</span>
                <div className="h-[1px] flex-1 bg-outline-variant/30"></div>
              </div>
              <p className="text-sm text-on-surface-variant">
                还没有账户？
                <button
                  onClick={onNavigateToRegister}
                  className="text-primary font-semibold hover:underline underline-offset-4 decoration-2 decoration-primary/20 transition-all ml-1 cursor-pointer"
                >
                  立即注册
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] left-[-10%] w-[30%] h-[30%] rounded-full bg-tertiary/5 blur-[100px] pointer-events-none"></div>
    </div>
  );
}
