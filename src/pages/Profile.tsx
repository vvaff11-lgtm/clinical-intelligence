import { Calendar, Droplets, Edit3, Mail, MapPin, Phone, Ruler, Shield, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { api, ApiError } from '../lib/api';
import type { Page, Profile as ProfileType } from '../types';

interface ProfileProps {
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  onAuthExpired: (error: unknown) => void;
}

interface MedicalDraft {
  allergiesText: string;
  chronicConditionsText: string;
}

export default function Profile({ onNavigate, onLogout, onAuthExpired }: ProfileProps) {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [draft, setDraft] = useState<ProfileType | null>(null);
  const [medicalDraft, setMedicalDraft] = useState<MedicalDraft | null>(null);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingMedical, setIsEditingMedical] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api
      .getProfile()
      .then((response) => setProfile(response))
      .catch((err) => {
        onAuthExpired(err);
        setError(err instanceof ApiError ? err.message : '个人资料加载失败');
      });
  }, []);

  const openEditor = () => {
    if (!profile) return;
    setDraft({ ...profile });
    setIsEditing(true);
  };

  const closeEditor = () => {
    setIsEditing(false);
    setDraft(null);
  };

  const openMedicalEditor = () => {
    if (!profile) return;
    setMedicalDraft({
      allergiesText: profile.allergies.join('\n'),
      chronicConditionsText: profile.chronicConditions.join('\n'),
    });
    setIsEditingMedical(true);
  };

  const closeMedicalEditor = () => {
    setIsEditingMedical(false);
    setMedicalDraft(null);
  };

  const updateDraft = <K extends keyof ProfileType>(key: K, value: ProfileType[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const parseListInput = (value: string) =>
    value
      .split(/[，,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);

  const handleSave = async () => {
    if (!draft) return;
    setIsSaving(true);
    setError('');

    try {
      const updated = await api.updateProfile({
        name: draft.name,
        phone: draft.phone || null,
        avatar: draft.avatar,
        age: draft.age,
        bloodType: draft.bloodType || null,
        height: draft.height || null,
        address: draft.address || null,
      });
      setProfile(updated);
      closeEditor();
    } catch (err) {
      onAuthExpired(err);
      setError(err instanceof ApiError ? err.message : '个人信息保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMedicalSave = async () => {
    if (!medicalDraft) return;
    setIsSaving(true);
    setError('');

    try {
      const updated = await api.updateProfile({
        allergies: parseListInput(medicalDraft.allergiesText),
        chronicConditions: parseListInput(medicalDraft.chronicConditionsText),
      });
      setProfile(updated);
      closeMedicalEditor();
    } catch (err) {
      onAuthExpired(err);
      setError(err instanceof ApiError ? err.message : '病史与过敏原保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSetting = async (key: 'shareHistory' | 'smartAlerts') => {
    if (!profile || isSaving) return;

    setIsSaving(true);
    setError('');

    const nextPrivacySettings = {
      ...profile.privacySettings,
      [key]: !profile.privacySettings[key],
    };

    try {
      const updated = await api.updateProfile({
        privacySettings: nextPrivacySettings,
      });
      setProfile(updated);
    } catch (err) {
      onAuthExpired(err);
      setError(err instanceof ApiError ? err.message : '系统设置保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) {
    return <div className="pt-24 px-8">{error || '正在加载个人资料...'}</div>;
  }

  return (
    <div className="pt-16 flex min-h-screen bg-surface">
      <Sidebar currentPage="profile" onNavigate={onNavigate} onLogout={onLogout} />

      {isEditing && draft && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[80]" onClick={closeEditor} />
          <div className="fixed inset-0 z-[90] flex items-center justify-center px-6">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-outline-variant/15 overflow-hidden">
              <div className="px-8 py-6 border-b border-surface-container flex items-center justify-between">
                <div>
                  <h3 className="font-headline text-2xl font-bold text-on-surface">编辑个人信息</h3>
                  <p className="text-sm text-on-surface-variant mt-1">保存后会同步更新到个人档案和后端数据库。</p>
                </div>
                <button onClick={closeEditor} className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center">
                  <X className="w-5 h-5 text-outline" />
                </button>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium">姓名</span>
                  <input
                    className="mt-2 w-full rounded-lg border border-outline-variant/20 px-4 py-3"
                    value={draft.name}
                    onChange={(event) => updateDraft('name', event.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">手机号</span>
                  <input
                    className="mt-2 w-full rounded-lg border border-outline-variant/20 px-4 py-3"
                    value={draft.phone || ''}
                    onChange={(event) => updateDraft('phone', event.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">年龄</span>
                  <input
                    type="number"
                    className="mt-2 w-full rounded-lg border border-outline-variant/20 px-4 py-3"
                    value={draft.age ?? ''}
                    onChange={(event) => updateDraft('age', event.target.value ? Number(event.target.value) : null)}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">血型</span>
                  <input
                    className="mt-2 w-full rounded-lg border border-outline-variant/20 px-4 py-3"
                    value={draft.bloodType || ''}
                    onChange={(event) => updateDraft('bloodType', event.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">身高</span>
                  <input
                    className="mt-2 w-full rounded-lg border border-outline-variant/20 px-4 py-3"
                    value={draft.height || ''}
                    onChange={(event) => updateDraft('height', event.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">头像 URL</span>
                  <input
                    className="mt-2 w-full rounded-lg border border-outline-variant/20 px-4 py-3"
                    value={draft.avatar}
                    onChange={(event) => updateDraft('avatar', event.target.value)}
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm font-medium">地址</span>
                  <input
                    className="mt-2 w-full rounded-lg border border-outline-variant/20 px-4 py-3"
                    value={draft.address || ''}
                    onChange={(event) => updateDraft('address', event.target.value)}
                  />
                </label>
              </div>

              <div className="px-8 py-5 border-t border-surface-container flex items-center justify-between">
                <p className="text-sm text-on-surface-variant">当前编辑的是基础个人资料。</p>
                <div className="flex gap-3">
                  <button onClick={closeEditor} className="px-5 py-2.5 rounded-lg bg-surface-container-low font-semibold text-on-surface">
                    取消
                  </button>
                  <button
                    onClick={() => void handleSave()}
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-lg bg-primary text-on-primary font-semibold disabled:opacity-60"
                  >
                    {isSaving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {isEditingMedical && medicalDraft && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[80]" onClick={closeMedicalEditor} />
          <div className="fixed inset-0 z-[90] flex items-center justify-center px-6">
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-outline-variant/15 overflow-hidden">
              <div className="px-8 py-6 border-b border-surface-container flex items-center justify-between">
                <div>
                  <h3 className="font-headline text-2xl font-bold text-on-surface">编辑病史与过敏原</h3>
                  <p className="text-sm text-on-surface-variant mt-1">每行一项，或使用逗号分隔，保存后会同步到数据库。</p>
                </div>
                <button onClick={closeMedicalEditor} className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center">
                  <X className="w-5 h-5 text-outline" />
                </button>
              </div>

              <div className="p-8 space-y-5">
                <label className="block">
                  <span className="text-sm font-medium">过敏原</span>
                  <textarea
                    className="mt-2 w-full rounded-lg border border-outline-variant/20 px-4 py-3 min-h-28 resize-none"
                    value={medicalDraft.allergiesText}
                    onChange={(event) => setMedicalDraft((current) => (current ? { ...current, allergiesText: event.target.value } : current))}
                    placeholder="例如：青霉素&#10;花粉"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">慢性病史</span>
                  <textarea
                    className="mt-2 w-full rounded-lg border border-outline-variant/20 px-4 py-3 min-h-28 resize-none"
                    value={medicalDraft.chronicConditionsText}
                    onChange={(event) => setMedicalDraft((current) => (current ? { ...current, chronicConditionsText: event.target.value } : current))}
                    placeholder="例如：高血压&#10;糖尿病"
                  />
                </label>
              </div>

              <div className="px-8 py-5 border-t border-surface-container flex items-center justify-between">
                <p className="text-sm text-on-surface-variant">仅保存病史与过敏原。</p>
                <div className="flex gap-3">
                  <button onClick={closeMedicalEditor} className="px-5 py-2.5 rounded-lg bg-surface-container-low font-semibold text-on-surface">
                    取消
                  </button>
                  <button
                    onClick={() => void handleMedicalSave()}
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-lg bg-primary text-on-primary font-semibold disabled:opacity-60"
                  >
                    {isSaving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <main className="flex-grow ml-64 p-12">
        <div className="max-w-5xl mx-auto">
          <header className="flex justify-between items-end mb-12">
            <div className="space-y-1">
              <h1 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">个人档案</h1>
              <p className="text-on-surface-variant font-medium">管理您的个人信息、健康数据与隐私设置。</p>
            </div>
            <button
              onClick={openEditor}
              className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-bold flex items-center gap-2 hover:bg-primary-container transition-all shadow-lg shadow-primary/10"
            >
              <Edit3 className="w-4 h-4" /> 编辑个人信息
            </button>
          </header>

          {error && <div className="mb-6 px-4 py-3 rounded-lg bg-error-container text-error text-sm">{error}</div>}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-outline-variant/10 flex flex-col items-center text-center">
                <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-primary/10 mb-6">
                  <img src={profile.avatar} alt="User Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <h2 className="text-2xl font-headline font-black text-on-surface mb-1">{profile.name}</h2>
                <p className="text-sm text-outline font-medium mb-6">ID: {profile.id}</p>
                <div className="w-full pt-6 border-t border-surface-container space-y-4">
                  <div className="flex items-center gap-3 text-on-surface-variant">
                    <Mail className="w-4 h-4 text-primary" />
                    <span className="text-sm">{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-on-surface-variant">
                    <Phone className="w-4 h-4 text-primary" />
                    <span className="text-sm">{profile.phone || '未填写手机号'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-on-surface-variant">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-sm">{profile.address || '未填写地址'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-tertiary/5 rounded-2xl p-6 border border-tertiary/10">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="text-tertiary w-5 h-5" />
                  <h3 className="text-sm font-bold text-tertiary uppercase tracking-widest">隐私保护状态</h3>
                </div>
                <p className="text-xs text-on-tertiary-fixed-variant leading-relaxed mb-4">
                  您的医疗数据已通过端到端加密保护。Clinical Intelligence Framework 严格遵守医疗数据保护标准。
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-tertiary"></div>
                  <span className="text-[10px] font-bold text-tertiary uppercase">已开启最高级别防护</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Calendar className="text-blue-600 w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-outline uppercase tracking-widest">年龄</span>
                  </div>
                  <p className="text-3xl font-headline font-black text-on-surface">{profile.age ?? '--'} <span className="text-sm font-medium text-outline">岁</span></p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                      <Droplets className="text-red-600 w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-outline uppercase tracking-widest">血型</span>
                  </div>
                  <p className="text-3xl font-headline font-black text-on-surface">{profile.bloodType || '--'}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                      <Ruler className="text-green-600 w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-outline uppercase tracking-widest">身高</span>
                  </div>
                  <p className="text-3xl font-headline font-black text-on-surface">{profile.height || '--'}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-outline-variant/10">
                <div className="px-8 py-6 border-b border-surface-container flex justify-between items-center">
                  <h3 className="font-headline font-bold text-xl">既往病史与过敏原</h3>
                  <button onClick={openMedicalEditor} className="text-primary text-sm font-bold">编辑详情</button>
                </div>
                <div className="p-8 space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-outline uppercase tracking-widest">已知过敏</h4>
                    <div className="flex flex-wrap gap-2">
                      {(profile.allergies.length ? profile.allergies : ['暂无记录']).map((item) => (
                        <span key={item} className="px-4 py-1.5 bg-error-container text-error text-xs font-bold rounded-full">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-outline uppercase tracking-widest">慢性病史</h4>
                    <div className="flex flex-wrap gap-2">
                      {(profile.chronicConditions.length ? profile.chronicConditions : ['暂无记录']).map((item) => (
                        <span key={item} className="px-4 py-1.5 bg-surface-container-highest text-on-surface-variant text-xs font-bold rounded-full">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-outline-variant/10">
                <div className="px-8 py-6 border-b border-surface-container">
                  <h3 className="font-headline font-bold text-xl">系统设置</h3>
                </div>
                <div className="p-8 space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-bold text-on-surface">AI 诊断深度模式</p>
                      <p className="text-xs text-outline">开启后将结合更多历史数据进行深度分析</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleToggleSetting('shareHistory')}
                      disabled={isSaving}
                      aria-pressed={Boolean(profile.privacySettings.shareHistory)}
                      className={`w-12 h-6 ${profile.privacySettings.shareHistory ? 'bg-primary' : 'bg-outline-variant'} rounded-full relative transition-colors disabled:opacity-60`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${profile.privacySettings.shareHistory ? 'right-1' : 'left-1'}`}></span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-bold text-on-surface">健康异常实时提醒</p>
                      <p className="text-xs text-outline">当监测到生物指标异常时发送通知</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleToggleSetting('smartAlerts')}
                      disabled={isSaving}
                      aria-pressed={Boolean(profile.privacySettings.smartAlerts)}
                      className={`w-12 h-6 ${profile.privacySettings.smartAlerts ? 'bg-primary' : 'bg-outline-variant'} rounded-full relative transition-colors disabled:opacity-60`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${profile.privacySettings.smartAlerts ? 'right-1' : 'left-1'}`}></span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
