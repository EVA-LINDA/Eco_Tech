import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  CheckCheck,
  Coins,
  Gift,
  HelpCircle,
  Home,
  MapPin,
  MessageSquare,
  Moon,
  Settings,
  Smile,
  Sun,
  Trophy,
  User,
  X,
} from 'lucide-react';
import {
  AccountAndSettingsView,
  type AccountTab,
} from './components/AccountAndSettingsView';
import { AuthView } from './components/AuthView';
import { AvatarRenderer } from './components/AvatarRenderer';
import { AvatarStudioView } from './components/AvatarStudioView';
import { BalloonCelebration } from './components/BalloonCelebration';
import { ChallengesView } from './components/ChallengesView';
import { ChatView } from './components/ChatView';
import { EcoLogo } from './components/EcoLogo';
import { HubView } from './components/HubView';
import { MapView } from './components/MapView';
import { QuizView } from './components/QuizView';
import { RewardsView } from './components/RewardsView';
import { SettingsView } from './components/SettingsView';
import { INITIAL_APP_STATE } from './data/ecotechData';
import type {
  AppSection,
  AppState,
  AvatarConfig,
  DropOffRecord,
  NotificationItem,
  RedeemedCoupon,
  UserSettings,
  WasteCategoryId,
} from './types';

async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao processar solicitação.');
  }
  return data as T;
}

const NAV_ITEMS: {
  id: AppSection;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'hub', label: 'Início (Hub)', shortLabel: 'Início', icon: Home },
  { id: 'mapa', label: 'Mapa de Coleta', shortLabel: 'Mapa', icon: MapPin },
  { id: 'avatar', label: 'Estúdio Avatar', shortLabel: 'Avatar', icon: Smile },
  { id: 'cupons', label: 'Cupons & Bônus', shortLabel: 'Cupons', icon: Gift },
  { id: 'quiz', label: 'Quiz Ecológico', shortLabel: 'Quiz', icon: HelpCircle },
  { id: 'desafios', label: 'Desafios Grupo', shortLabel: 'Grupo', icon: Trophy },
  { id: 'chat', label: 'Chat Integrado', shortLabel: 'Chat', icon: MessageSquare },
  { id: 'config', label: 'Configurações', shortLabel: 'Configs', icon: Settings },
  { id: 'conta', label: 'Minha Conta', shortLabel: 'Conta', icon: User },
];

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_APP_STATE);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<AppSection>('hub');
  const [mapCategory, setMapCategory] = useState<WasteCategoryId | 'all'>('all');
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [activeAlertToast, setActiveAlertToast] = useState<NotificationItem | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showBalloons, setShowBalloons] = useState(false);
  const monthTriggeredRef = useRef(false);
  const [requestedAccountTab, setRequestedAccountTab] = useState<{
    tab: AccountTab;
    nonce: number;
  } | null>(null);
  const notifContainerRef = useRef<HTMLDivElement>(null);
  const seenNotificationIdsRef = useRef<Set<string>>(
    new Set(INITIAL_APP_STATE.notifications.map((n) => n.id))
  );

  const syncStateWithAlerts = useCallback((next: AppState) => {
    const newUnread = next.notifications.find(
      (n) => !n.read && !seenNotificationIdsRef.current.has(n.id)
    );
    next.notifications.forEach((n) => seenNotificationIdsRef.current.add(n.id));
    if (newUnread) {
      setActiveAlertToast(newUnread);
    }
    setState(next);
  }, []);

  useEffect(() => {
    if (!activeAlertToast) return;
    const timer = window.setTimeout(() => {
      setActiveAlertToast(null);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [activeAlertToast]);

  useEffect(() => {
    if (!notifOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotifOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notifOpen]);

  useEffect(() => {
    const handleQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/state').then((r) => r.json()),
      fetch('/api/maps-config')
        .then((r) => r.json())
        .catch(() => ({ apiKey: '' })),
    ])
      .then(([data, mapsCfg]: [AppState, { apiKey?: string }]) => {
        data.notifications.forEach((n) => seenNotificationIdsRef.current.add(n.id));
        setState(data);
        if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && mapsCfg?.apiKey) {
          setMapsApiKey(mapsCfg.apiKey);
        }
      })
      .catch(() => {
        // Keep initial state if offline
      })
      .finally(() => setLoading(false));
  }, []);

  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const isDarkTheme = state.settings.useDeviceTheme
    ? systemDark
    : state.settings.theme === 'dark';

  // Sync Dark Theme & Accessibility classes on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkTheme) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    root.classList.toggle('eco-font-large', state.settings.fontSize === 'large');
    root.classList.toggle('eco-high-contrast', state.settings.highContrast);
    root.classList.toggle('eco-reduced-motion', state.settings.reducedMotion);
  }, [isDarkTheme, state.settings.fontSize, state.settings.highContrast, state.settings.reducedMotion]);

  const daysUsingPlatform =
    typeof state.user.platformDays === 'number'
      ? state.user.platformDays
      : Math.max(
          0,
          Math.floor((Date.now() - new Date(state.user.joinedAt || Date.now()).getTime()) / 86400000)
        );

  // Live tool usage timer (ticks seconds locally, syncs 1 min to server every 60s)
  useEffect(() => {
    if (loading || !state.authenticated) return;
    const interval = window.setInterval(() => {
      setSessionSeconds((prev) => {
        const next = prev + 1;
        if (next > 0 && next % 60 === 0) {
          void apiPost<{ state: AppState }>('/api/usage/tick', { minutes: 1 })
            .then((res) => setState(res.state))
            .catch(() => {});
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [loading, state.authenticated]);

  // Automatic 1-month platform milestone balloon release
  useEffect(() => {
    if (loading || !state.authenticated) return;
    if (
      daysUsingPlatform >= 30 &&
      !state.user.oneMonthCelebrated &&
      !monthTriggeredRef.current
    ) {
      monthTriggeredRef.current = true;
      setShowBalloons(true);
      void apiPost<{ state: AppState }>('/api/usage/celebrate-month')
        .then((res) => syncStateWithAlerts(res.state))
        .catch(() => {});
    }
  }, [loading, state.authenticated, daysUsingPlatform, state.user.oneMonthCelebrated, syncStateWithAlerts]);

  const handleLogin = async (email: string, password: string, demo?: boolean) => {
    const next = await apiPost<AppState>('/api/auth/login', { email, password, demo });
    setState(next);
    setSection('hub');
  };

  const handleSendEmailCode = async (payload: {
    email: string;
    flow: 'login' | 'register';
    name?: string;
    city?: string;
    password?: string;
  }): Promise<{ email: string; mvpPreviewCode: string }> => {
    const res = await apiPost<{
      ok: boolean;
      email: string;
      mvpPreviewCode: string;
    }>('/api/auth/send-code', payload);
    return { email: res.email, mvpPreviewCode: res.mvpPreviewCode };
  };

  const handleVerifyEmailCode = async (email: string, code: string) => {
    const res = await apiPost<{ ok: boolean; state: AppState }>(
      '/api/auth/verify-code',
      { email, code }
    );
    syncStateWithAlerts(res.state);
    setSection('hub');
  };

  const handleRecover = async (email: string): Promise<string> => {
    const res = await apiPost<{ message: string }>('/api/auth/recover', { email });
    return res.message;
  };

  const handleLogout = async () => {
    const next = await apiPost<AppState>('/api/auth/logout');
    setState(next);
  };

  const handleRegisterDropOff = async (
    pointId: string,
    pointName: string,
    pointNeighborhood: string,
    category: WasteCategoryId,
    weightKg: number
  ): Promise<{ record: DropOffRecord; unlocks: string[] }> => {
    const res = await apiPost<{ state: AppState; record: DropOffRecord; unlocks: string[] }>(
      '/api/dropoffs',
      { pointId, pointName, pointNeighborhood, category, weightKg }
    );
    syncStateWithAlerts(res.state);
    return { record: res.record, unlocks: res.unlocks };
  };

  const handleCompleteQuiz = async (
    level: number,
    correctCount: number,
    totalQuestions: number
  ) => {
    const res = await apiPost<{
      state: AppState;
      coinsEarned: number;
      xpEarned: number;
      unlocks: string[];
    }>('/api/quiz/complete', { level, correctCount, totalQuestions });
    syncStateWithAlerts(res.state);
    return {
      coinsEarned: res.coinsEarned,
      xpEarned: res.xpEarned,
      unlocks: res.unlocks,
    };
  };

  const handleRedeemCoupon = async (offerId: string): Promise<RedeemedCoupon> => {
    const res = await apiPost<{ state: AppState; redeemed: RedeemedCoupon }>(
      '/api/rewards/redeem-coupon',
      { offerId }
    );
    syncStateWithAlerts(res.state);
    return res.redeemed;
  };

  const handleUnlockAvatar = async (type: 'species' | 'prop', id: string) => {
    const res = await apiPost<{ state: AppState }>('/api/avatar/unlock', { type, id });
    syncStateWithAlerts(res.state);
  };

  const handleSaveAvatar = async (avatar: AvatarConfig) => {
    const res = await apiPost<{ state: AppState }>('/api/avatar/save', { avatar });
    setState(res.state);
  };

  const handleSaveTeam = async (teamName: string, invitedIds: string[]) => {
    const res = await apiPost<{ state: AppState }>('/api/challenges/team', {
      teamName,
      invitedIds,
    });
    setState(res.state);
  };

  const handleContribute = async (
    itemLabel: string,
    quantity: number,
    photoName?: string
  ) => {
    const res = await apiPost<{
      state: AppState;
      coinsEarned: number;
      missionJustCompleted: boolean;
      unlocks: string[];
    }>('/api/challenges/contribute', { itemLabel, quantity, photoName });
    syncStateWithAlerts(res.state);
    return {
      coinsEarned: res.coinsEarned,
      missionJustCompleted: res.missionJustCompleted,
      unlocks: res.unlocks,
    };
  };

  const handleToggleFriend = async (friendId: string, action: 'add' | 'invite') => {
    const res = await apiPost<{ state: AppState }>('/api/friends/toggle', {
      friendId,
      action,
    });
    setState(res.state);
  };

  const handleSendMessage = async (channelId: string, text: string) => {
    const res = await apiPost<{ state: AppState }>('/api/chat/message', {
      channelId,
      text,
    });
    setState(res.state);
  };

  const handleUpdateSettings = async (patch: Partial<UserSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...patch,
      },
    }));
    const res = await apiPost<{ state: AppState }>('/api/settings', { settings: patch });
    setState(res.state);
  };

  const handleMarkNotificationsRead = async () => {
    const res = await apiPost<{ state: AppState }>('/api/notifications/read-all');
    setState(res.state);
    setActiveAlertToast(null);
  };

  const handleMarkOneNotificationRead = async (id: string) => {
    const res = await apiPost<{ state: AppState }>('/api/notifications/read', { id });
    setState(res.state);
    if (activeAlertToast?.id === id) {
      setActiveAlertToast(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7FAF8] dark:bg-[#0D1512] flex items-center justify-center">
        <div className="text-center space-y-3">
          <EcoLogo size="lg" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Carregando seu painel EcoTech...
          </p>
        </div>
      </div>
    );
  }

  if (!state.authenticated) {
    return (
      <AuthView
        onLogin={handleLogin}
        onSendEmailCode={handleSendEmailCode}
        onVerifyEmailCode={handleVerifyEmailCode}
        onRecover={handleRecover}
      />
    );
  }

  const activeNavMeta = NAV_ITEMS.find((n) => n.id === section) || NAV_ITEMS[0];
  const unreadCount = state.notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-[#F7FAF8] dark:bg-[#0D1512] text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row">
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 px-4 py-6 justify-between z-30">
        <div className="space-y-8">
          <div className="px-2">
            <EcoLogo showSlogan />
          </div>

          <nav className="space-y-1" aria-label="Navegação principal">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Avatar Mini Profile Footer */}
        <button
          type="button"
          onClick={() => setSection('conta')}
          className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
        >
          <AvatarRenderer config={state.user.avatar} size={42} className="shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {state.user.name}
            </p>
            <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">
              Nível {state.user.level} · {state.user.coins} 🪙
            </p>
          </div>
        </button>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen pb-20 lg:pb-0">
        {gmpQuotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}
        {/* Compact Top Header Bar (mobile <= 56px, desktop clean 3-zone) */}
        <header className="sticky top-0 z-20 h-14 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="lg:hidden">
              <EcoLogo size="sm" showWordmark={false} />
            </div>
            <span className="font-display font-bold text-base text-slate-900 dark:text-white truncate">
              {activeNavMeta.label}
            </span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            <button
              type="button"
              onClick={() => setSection('cupons')}
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer tabular-nums whitespace-nowrap px-1.5 py-2"
            >
              <Coins className="w-4 h-4" />
              {state.user.coins} <span className="hidden xs:inline">moedas</span>
            </button>

            <button
              type="button"
              onClick={() => setSection('mapa')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F9D58] hover:bg-[#0C854A] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap min-h-[40px]"
            >
              Registrar Descarte
            </button>

            {/* Quick 1-Click Claro / Escuro Theme Toggle */}
            <button
              type="button"
              onClick={() =>
                void handleUpdateSettings({
                  theme: isDarkTheme ? 'light' : 'dark',
                  useDeviceTheme: false,
                })
              }
              aria-label={
                isDarkTheme ? 'Mudar para tema claro' : 'Mudar para tema escuro'
              }
              title={isDarkTheme ? 'Tema claro' : 'Tema escuro'}
              className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center gap-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isDarkTheme ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
              <span className="hidden md:inline text-xs font-semibold">
                {isDarkTheme ? 'Claro' : 'Escuro'}
              </span>
            </button>

            {/* Direct Configurações Shortcut */}
            <button
              type="button"
              onClick={() => setSection('config')}
              aria-label="Abrir Configurações"
              title="Configurações"
              className={`min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                section === 'config'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Top-Bar Notification Bell + Unread Badge + Popover */}
            <div ref={notifContainerRef} className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                aria-label={
                  unreadCount > 0
                    ? `Notificações (${unreadCount} não lidas)`
                    : 'Notificações'
                }
                aria-expanded={notifOpen}
                aria-haspopup="dialog"
                className={`relative min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                  notifOpen
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span
                    data-testid="notification-badge"
                    className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-rose-600 text-white font-mono text-[10px] font-extrabold leading-none flex items-center justify-center ring-2 ring-white dark:ring-slate-900 tabular-nums"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  role="dialog"
                  aria-label="Central rápida de notificações"
                  className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                        Notificações
                      </h2>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-mono text-[11px] font-bold tabular-nums">
                          {unreadCount} novas
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkNotificationsRead}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Marcar todas
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {state.notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                        Nenhuma notificação por enquanto.
                      </div>
                    ) : (
                      state.notifications.slice(0, 8).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            if (!n.read) {
                              void handleMarkOneNotificationRead(n.id);
                            }
                          }}
                          className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer ${
                            !n.read
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <span
                            className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                              !n.read
                                ? 'bg-[#0F9D58]'
                                : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                                {n.title}
                              </p>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {n.timeLabel}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                              {n.body}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40">
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        setRequestedAccountTab({
                          tab: 'notificacoes',
                          nonce: Date.now(),
                        });
                        setSection('conta');
                      }}
                      className="w-full py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                    >
                      Ver todas as notificações
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSection('avatar')}
              aria-label="Abrir Estúdio de Avatar"
              className="rounded-xl overflow-hidden cursor-pointer shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              <AvatarRenderer config={state.user.avatar} size={36} />
            </button>
          </div>
        </header>

        {/* Real-time Unlocked Reward / Achievement Alert Toast */}
        {activeAlertToast && (
          <div
            role="status"
            aria-live="polite"
            className="fixed top-16 right-4 sm:right-8 z-40 max-w-sm w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 shadow-lg rounded-2xl p-3.5 flex items-start gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveAlertToast(null);
                setNotifOpen(true);
              }}
              className="flex-1 min-w-0 text-left cursor-pointer"
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Nova recompensa ou conquista
              </p>
              <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                {activeAlertToast.title}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                {activeAlertToast.body}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setActiveAlertToast(null)}
              aria-label="Fechar alerta"
              className="min-w-[32px] min-h-[32px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Secondary Horizontal Strip on Mobile for Cupons / Quiz / Grupo / Configs / Conta */}
        <div className="lg:hidden px-4 pt-3 flex items-center gap-2 overflow-x-auto">
          {(['cupons', 'quiz', 'desafios', 'config', 'conta'] as AppSection[]).map((id) => {
            const meta = NAV_ITEMS.find((n) => n.id === id)!;
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {meta.shortLabel}
              </button>
            );
          })}
        </div>

        {/* Active View Content */}
        <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-8">
          {section === 'hub' && <HubView state={state} onNavigate={setSection} />}
          {section === 'mapa' && (
            <MapView
              mapsApiKey={mapsApiKey}
              isDark={isDarkTheme}
              initialCategory={mapCategory}
              onRegisterDropOff={handleRegisterDropOff}
            />
          )}
          {section === 'avatar' && (
            <AvatarStudioView
              user={state.user}
              onUnlock={handleUnlockAvatar}
              onSaveAvatar={handleSaveAvatar}
            />
          )}
          {section === 'cupons' && (
            <RewardsView
              user={state.user}
              redeemedCoupons={state.redeemedCoupons}
              onRedeemCoupon={handleRedeemCoupon}
              onNavigate={setSection}
            />
          )}
          {section === 'quiz' && (
            <QuizView
              user={state.user}
              completedLevels={state.completedQuizLevels}
              onCompleteQuiz={handleCompleteQuiz}
            />
          )}
          {section === 'desafios' && (
            <ChallengesView
              user={state.user}
              challenge={state.groupChallenge}
              friends={state.friends}
              onSaveTeam={handleSaveTeam}
              onContribute={handleContribute}
              onToggleInvite={(fid) => handleToggleFriend(fid, 'invite')}
            />
          )}
          {section === 'chat' && (
            <ChatView
              user={state.user}
              channels={state.channels}
              messages={state.messages}
              friends={state.friends}
              onSendMessage={handleSendMessage}
              onOpenPointOnMap={(catOrPoint) => {
                setMapCategory(catOrPoint as WasteCategoryId);
                setSection('mapa');
              }}
            />
          )}
          {section === 'config' && (
            <SettingsView
              state={state}
              sessionSeconds={sessionSeconds}
              onUpdateSettings={handleUpdateSettings}
              onNavigateAccountTab={(tab) => {
                setRequestedAccountTab({ tab, nonce: Date.now() });
                setSection('conta');
              }}
              onNavigate={setSection}
              onLogout={handleLogout}
              onReleaseBalloons={() => setShowBalloons(true)}
            />
          )}
          {section === 'conta' && (
            <AccountAndSettingsView
              state={state}
              onUpdateSettings={handleUpdateSettings}
              onToggleFriend={(fid) => handleToggleFriend(fid, 'add')}
              onMarkNotificationsRead={handleMarkNotificationsRead}
              onLogout={handleLogout}
              onNavigate={setSection}
              requestedTab={requestedAccountTab}
            />
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Thumb Navigation Bar (5 core tabs, <= 64px) */}
      <nav
        aria-label="Navegação móvel"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 items-center"
      >
        {(
          [
            ['hub', 'Início', Home],
            ['mapa', 'Mapa', MapPin],
            ['avatar', 'Avatar', Smile],
            ['chat', 'Chat', MessageSquare],
            ['conta', 'Conta', User],
          ] as [AppSection, string, React.FC<{ className?: string }>][]
        ).map(([id, label, Icon]) => {
          const active = section === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={`flex flex-col items-center justify-center h-full cursor-pointer ${
                active
                  ? 'text-[#0F9D58] dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-1">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* 1-Month Usage Milestone Balloon Celebration */}
      <BalloonCelebration
        visible={showBalloons}
        daysUsing={daysUsingPlatform}
        reducedMotion={state.settings.reducedMotion}
        onClose={() => setShowBalloons(false)}
      />
    </div>
  );
}
