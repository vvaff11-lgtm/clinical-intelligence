import { FormEvent, useState } from 'react';
import { Lock, Mail, Phone } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { AuthResponse } from '../types';

interface RegisterProps {
  onRegister: (response: AuthResponse) => void;
  onNavigateToLogin: () => void;
}

export default function Register({ onRegister, onNavigateToLogin }: RegisterProps) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await api.register({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      });
      onRegister(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '注册失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
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
              Join <br /> Intelligence
            </h1>
          </div>
          <p className="text-on-surface-variant text-lg max-w-md font-light leading-relaxed">
            开启您的 <span className="text-tertiary font-semibold">智能健康之旅</span>。注册以获取个性化医疗建议、实时健康监测和专业的护理管理。
          </p>
        </div>

        <div className="flex justify-center md:justify-end">
          <div className="glass-panel w-full max-w-md p-10 rounded-xl shadow-2xl border border-white/40">
            <div className="mb-10 text-center md:text-left">
              <h2 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-2">创建账号</h2>
              <p className="text-on-surface-variant text-sm">填写以下信息以完成注册</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1" htmlFor="name">
                  姓名
                </label>
                <input
                  id="name"
                  className="block w-full px-4 py-3 bg-surface-container-highest/50 border-none rounded-lg focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline/60 text-on-surface"
                  placeholder="输入您的姓名"
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1" htmlFor="email">
                  邮箱
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-outline group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    className="block w-full pl-11 pr-4 py-3 bg-surface-container-highest/50 border-none rounded-lg focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline/60 text-on-surface"
                    id="email"
                    placeholder="example@mail.com"
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1" htmlFor="phone">
                  电话
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="w-5 h-5 text-outline group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    className="block w-full pl-11 pr-4 py-3 bg-surface-container-highest/50 border-none rounded-lg focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline/60 text-on-surface"
                    id="phone"
                    placeholder="输入您的电话号码"
                    type="tel"
                    value={form.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1" htmlFor="password">
                  密码
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-outline group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    className="block w-full pl-11 pr-4 py-3 bg-surface-container-highest/50 border-none rounded-lg focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline/60 text-on-surface"
                    id="password"
                    placeholder="设置您的密码"
                    type="password"
                    value={form.password}
                    onChange={(event) => updateField('password', event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1" htmlFor="confirmPassword">
                  再次输入密码
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-outline group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    className="block w-full pl-11 pr-4 py-3 bg-surface-container-highest/50 border-none rounded-lg focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline/60 text-on-surface"
                    id="confirmPassword"
                    placeholder="请再次输入密码"
                    type="password"
                    value={form.confirmPassword}
                    onChange={(event) => updateField('confirmPassword', event.target.value)}
                    required
                  />
                </div>
              </div>

              {error && <p className="text-sm text-error">{error}</p>}

              <div className="pt-4">
                <button
                  className="w-full py-4 bg-primary text-on-primary font-bold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-container transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? '注册中...' : '立即注册'}
                </button>
              </div>
            </form>

            <div className="mt-8 flex flex-col items-center space-y-6">
              <p className="text-sm text-on-surface-variant">
                已有账号？
                <button
                  onClick={onNavigateToLogin}
                  className="text-primary font-semibold hover:underline underline-offset-4 decoration-2 decoration-primary/20 transition-all ml-1 cursor-pointer"
                >
                  返回登录
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
