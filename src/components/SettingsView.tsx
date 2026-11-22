import React, { useState } from 'react';
import {
  Accessibility,
  Bell,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  HelpCircle,
  Lock,
  LogOut,
  MessageSquareWarning,
  Moon,
  PartyPopper,
  QrCode,
  Shield,
  ShieldCheck,
  Sun,
  User,
  Users,
} from 'lucide-react';
import type { AppSection, AppState, UserSettings } from '../types';
import type { AccountTab } from './AccountAndSettingsView';
import { AvatarRenderer } from './AvatarRenderer';

export type SettingsSubScreen =
  | 'hub'
  | 'tema'
  | 'tempo'
  | 'idioma'
  | 'acessibilidade'
  | 'privacidade'
  | 'seguranca'
  | 'suporte';

interface SettingsViewProps {
  state: AppState;
  sessionSeconds: number;
  onUpdateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  onNavigateAccountTab: (tab: AccountTab) => void;
  onNavigate: (section: AppSection) => void;
  onLogout: () => Promise<void>;
  onReleaseBalloons: () => void;
  initialScreen?: SettingsSubScreen;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  state,
  sessionSeconds,
  onUpdateSettings,
  onNavigateAccountTab,
  onNavigate,
  onLogout,
  onReleaseBalloons,
  initialScreen = 'hub',
}) => {
  const [subScreen, setSubScreen] = useState<SettingsSubScreen>(initialScreen);
  const { user, settings, notifications, friends, weeklyScreenMinutes } = state;

  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const totalMinutesWeek = weeklyScreenMinutes.reduce((sum, d) => sum + d.minutes, 0);
  const totalHours = Math.floor(totalMinutesWeek / 60);
  const totalRemMin = totalMinutesWeek % 60;

  const totalPlatformMinutes = (user.totalToolMinutes || 0) + Math.floor(sessionSeconds / 60);
  const totalAllHours = Math.floor(totalPlatformMinutes / 60);
  const totalAllRemMin = totalPlatformMinutes % 60;

  const sessionMins = Math.floor(sessionSeconds / 60);
  const sessionRemSecs = sessionSeconds % 60;

  const daysUsingPlatform =
    typeof user.platformDays === 'number'
      ? user.platformDays
      : Math.max(0, Math.floor((Date.now() - new Date(user.joinedAt).getTime()) / 86400000));
  const hasOneMonth = daysUsingPlatform >= 30;
  const oneMonthPct = Math.min(100, Math.round((daysUsingPlatform / 30) * 100));

  const renderToggle = (
    label: string,
    description: string,
    checked: boolean,
    onChange: (val: boolean) => void
  ) => (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
          checked ? 'bg-[#0F9D58]' : 'bg-slate-300 dark:bg-slate-700'
        }`}
      >
        <span
          className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  const renderRow = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    badge?: string
  ) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer min-h-[48px]"
    >
      <span className="flex items-center gap-3 min-w-0">
        <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
          {label}
        </span>
      </span>
      <span className="flex items-center gap-2 shrink-0">
        {badge && (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {badge}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </span>
    </button>
  );

  const SubHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setSubScreen('hub')}
        aria-label="Voltar para Configurações"
        className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shrink-0"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <div className="min-w-0">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white truncate">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );

  const themeBadge = settings.useDeviceTheme
    ? 'Dispositivo'
    : settings.theme === 'dark'
      ? 'Escuro'
      : 'Claro';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Quick Theme Bar always visible at top of Configurações */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <AvatarRenderer config={user.avatar} size={52} className="shrink-0" />
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white truncate">
              {user.name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Nível {user.level} · {user.email}
            </p>
          </div>
        </div>

        {/* Instant Claro / Escuro Segmented Switch */}
        <div
          role="group"
          aria-label="Alternar tema Claro ou Escuro"
          className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 shrink-0 self-start sm:self-auto"
        >
          <button
            type="button"
            onClick={() => onUpdateSettings({ theme: 'light', useDeviceTheme: false })}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer min-h-[36px] ${
              settings.theme === 'light' && !settings.useDeviceTheme
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            Claro
          </button>
          <button
            type="button"
            onClick={() => onUpdateSettings({ theme: 'dark', useDeviceTheme: false })}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer min-h-[36px] ${
              settings.theme === 'dark' && !settings.useDeviceTheme
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-emerald-400" />
            Escuro
          </button>
        </div>
      </div>

      {/* HUB DE CONFIGURAÇÕES */}
      {subScreen === 'hub' && (
        <div className="space-y-5">
          {/* Seção: Conta */}
          <section className="space-y-2">
            <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Conta
            </h2>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {renderRow(
                <User className="w-4 h-4" />,
                'Conta',
                () => onNavigateAccountTab('perfil'),
                `Nível ${user.level}`
              )}
              {renderRow(
                <Lock className="w-4 h-4" />,
                'Privacidade',
                () => setSubScreen('privacidade'),
                settings.privateAccount ? 'Privada' : 'Pública'
              )}
              {renderRow(
                <ShieldCheck className="w-4 h-4" />,
                'Proteção e segurança',
                () => setSubScreen('seguranca'),
                settings.twoFactorEnabled ? '2FA ativo' : undefined
              )}
              {renderRow(
                <QrCode className="w-4 h-4" />,
                'Código de acesso',
                () => onNavigateAccountTab('qrcode'),
                user.accessCode
              )}
            </div>
          </section>

          {/* Seção: Conteúdo e Exibição */}
          <section className="space-y-2">
            <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Conteúdo e Exibição
            </h2>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {renderRow(
                <Bell className="w-4 h-4" />,
                'Notificações',
                () => onNavigateAccountTab('notificacoes'),
                unreadNotifs > 0 ? `${unreadNotifs} novas` : 'Todas lidas'
              )}
              {renderRow(
                <Clock className="w-4 h-4" />,
                'Tempo de tela',
                () => setSubScreen('tempo'),
                `${totalAllHours}h ${totalAllRemMin}m de uso`
              )}
              {renderRow(
                settings.theme === 'dark' ? (
                  <Moon className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                ),
                'Tema (Claro e Escuro)',
                () => setSubScreen('tema'),
                themeBadge
              )}
              {renderRow(
                <Globe className="w-4 h-4" />,
                'Idioma',
                () => setSubScreen('idioma'),
                settings.language === 'pt-BR' ? 'Português (Brasil)' : 'English (US)'
              )}
              {renderRow(
                <Users className="w-4 h-4" />,
                'Amigos',
                () => onNavigateAccountTab('amigos'),
                `${friends.filter((f) => f.isFriend).length} amigos`
              )}
              {renderRow(
                <Accessibility className="w-4 h-4" />,
                'Acessibilidade',
                () => setSubScreen('acessibilidade'),
                settings.fontSize === 'large' ? 'Texto grande' : 'Médio'
              )}
            </div>
          </section>

          {/* Seção: Suporte */}
          <section className="space-y-2">
            <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Suporte
            </h2>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {renderRow(
                <MessageSquareWarning className="w-4 h-4" />,
                'Relatar um Problema',
                () => onNavigate('chat')
              )}
              {renderRow(
                <HelpCircle className="w-4 h-4" />,
                'Suporte',
                () => setSubScreen('suporte')
              )}
              {renderRow(
                <FileText className="w-4 h-4" />,
                'Termos e Políticas',
                () => setSubScreen('suporte')
              )}
            </div>
          </section>

          <div className="pt-1">
            <button
              type="button"
              onClick={onLogout}
              className="w-full py-3 rounded-2xl border border-rose-200 dark:border-rose-900/70 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer min-h-[44px]"
            >
              <LogOut className="w-4 h-4" />
              Sair da conta
            </button>
          </div>
        </div>
      )}

      {/* SUB-TELA: TEMA (CLARO / ESCURO + DISPOSITIVO) */}
      {subScreen === 'tema' && (
        <div className="space-y-5">
          <SubHeader
            title="Tema"
            subtitle="Escolha entre Claro, Escuro ou acompanhe seu dispositivo"
          />

          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-md mx-auto">
              {/* Preview Card: Claro */}
              <button
                type="button"
                onClick={() => onUpdateSettings({ theme: 'light', useDeviceTheme: false })}
                className={`group rounded-2xl border p-4 flex flex-col items-center gap-3 transition-all cursor-pointer ${
                  settings.theme === 'light' && !settings.useDeviceTheme
                    ? 'border-[#0F9D58] bg-emerald-50/60 dark:bg-emerald-950/30 ring-2 ring-[#0F9D58]/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Mini Phone Mockup Light */}
                <div className="w-20 h-32 rounded-xl bg-[#F7FAF8] border-2 border-slate-300 p-2 flex flex-col justify-between shadow-sm">
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-8 rounded bg-[#0F9D58] mx-auto" />
                    <div className="grid grid-cols-2 gap-1 pt-1">
                      <div className="h-6 rounded bg-emerald-200" />
                      <div className="h-6 rounded bg-amber-200" />
                      <div className="h-6 rounded bg-sky-200" />
                      <div className="h-6 rounded bg-purple-200" />
                    </div>
                  </div>
                  <div className="h-2.5 w-full rounded bg-[#0F9D58]" />
                </div>

                <div className="text-center space-y-1.5">
                  <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                    <Sun className="w-4 h-4 text-amber-500" /> Claro
                  </p>
                  <span
                    className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center ${
                      settings.theme === 'light' && !settings.useDeviceTheme
                        ? 'border-rose-500'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {settings.theme === 'light' && !settings.useDeviceTheme && (
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    )}
                  </span>
                </div>
              </button>

              {/* Preview Card: Escuro */}
              <button
                type="button"
                onClick={() => onUpdateSettings({ theme: 'dark', useDeviceTheme: false })}
                className={`group rounded-2xl border p-4 flex flex-col items-center gap-3 transition-all cursor-pointer ${
                  settings.theme === 'dark' && !settings.useDeviceTheme
                    ? 'border-[#0F9D58] bg-emerald-50/60 dark:bg-emerald-950/30 ring-2 ring-[#0F9D58]/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Mini Phone Mockup Dark */}
                <div className="w-20 h-32 rounded-xl bg-slate-950 border-2 border-slate-700 p-2 flex flex-col justify-between shadow-sm">
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-8 rounded bg-emerald-500 mx-auto" />
                    <div className="grid grid-cols-2 gap-1 pt-1">
                      <div className="h-6 rounded bg-emerald-900" />
                      <div className="h-6 rounded bg-amber-900/80" />
                      <div className="h-6 rounded bg-slate-800" />
                      <div className="h-6 rounded bg-slate-700" />
                    </div>
                  </div>
                  <div className="h-2.5 w-full rounded bg-emerald-700" />
                </div>

                <div className="text-center space-y-1.5">
                  <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                    <Moon className="w-4 h-4 text-emerald-400" /> Escuro
                  </p>
                  <span
                    className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center ${
                      settings.theme === 'dark' && !settings.useDeviceTheme
                        ? 'border-rose-500'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {settings.theme === 'dark' && !settings.useDeviceTheme && (
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    )}
                  </span>
                </div>
              </button>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
              {renderToggle(
                'Usar configurações do dispositivo',
                'Ajusta a aparência automaticamente conforme o tema Claro ou Escuro do seu aparelho.',
                Boolean(settings.useDeviceTheme),
                (val) => {
                  const prefersDark =
                    typeof window !== 'undefined' &&
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
                  onUpdateSettings({
                    useDeviceTheme: val,
                    theme: val ? (prefersDark ? 'dark' : 'light') : settings.theme,
                  });
                }
              )}
            </div>
          </section>
        </div>
      )}

      {/* SUB-TELA: TEMPO DE USO DA FERRAMENTA */}
      {subScreen === 'tempo' && (
        <div className="space-y-5">
          <SubHeader
            title="Tempo de tela"
            subtitle="Tempo em que você utiliza a plataforma EcoTech"
          />

          {/* Cards com apenas o tempo de utilização da ferramenta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Tempo total na ferramenta
              </p>
              <p className="font-display text-3xl font-extrabold text-slate-900 dark:text-white mt-1.5 tabular-nums">
                {totalAllHours}h {String(totalAllRemMin).padStart(2, '0')}m
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                Acumulado desde o início na plataforma
              </p>
            </section>

            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Sessão atual ao vivo
              </p>
              <p className="font-display text-3xl font-extrabold text-slate-900 dark:text-white mt-1.5 font-mono tabular-nums">
                {String(sessionMins).padStart(2, '0')}:{String(sessionRemSecs).padStart(2, '0')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Contabilizando enquanto você usa o EcoTech
              </p>
            </section>
          </div>

          {/* Marco de 1 Mês na Plataforma + Balão Comemorativo */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  Marco de 1 mês na plataforma
                </p>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                  {hasOneMonth
                    ? `Você completou ${daysUsingPlatform} dias usando o EcoTech!`
                    : `${daysUsingPlatform} de 30 dias usando a ferramenta`}
                </h3>
              </div>
              {hasOneMonth && (
                <button
                  type="button"
                  onClick={onReleaseBalloons}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F9D58] hover:bg-[#0C854A] text-white text-xs font-bold transition-colors cursor-pointer min-h-[40px] shrink-0"
                >
                  <PartyPopper className="w-4 h-4" />
                  Soltar balão de 1 mês
                </button>
              )}
            </div>

            <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0F9D58] to-emerald-400 transition-all duration-300"
                style={{ width: `${oneMonthPct}%` }}
              />
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              {hasOneMonth
                ? 'Parabéns por 1 mês de uso da plataforma! Sempre que alcançar este marco, o EcoTech solta balões comemorativos.'
                : `Faltam ${30 - daysUsingPlatform} dias para completar 1 mês na plataforma e soltar o balão comemorativo.`}
            </p>
          </section>

          {/* Gráfico Semanal apenas com o tempo de uso */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Resumo · Esta semana
                </p>
                <p className="font-display text-lg font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                  Total semanal: {totalHours}h {totalRemMin}m
                </p>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 items-end h-32 pt-4">
              {weeklyScreenMinutes.map((item) => {
                const maxMin = Math.max(45, ...weeklyScreenMinutes.map((w) => w.minutes));
                const heightPct = Math.max(
                  15,
                  Math.min(100, Math.round((item.minutes / maxMin) * 100))
                );
                return (
                  <div
                    key={item.day}
                    className="flex flex-col items-center gap-1.5 h-full justify-end"
                  >
                    <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                      {item.minutes}m
                    </span>
                    <div
                      className="w-full max-w-[30px] rounded-t-lg bg-[#0F9D58]"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {item.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* SUB-TELA: IDIOMA */}
      {subScreen === 'idioma' && (
        <div className="space-y-5">
          <SubHeader title="Idioma" subtitle="Defina o idioma nativo e traduções do app" />

          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 px-5 py-2 divide-y divide-slate-100 dark:divide-slate-800">
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Idioma do app
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Define o idioma principal de exibição do aplicativo.
                </p>
              </div>
              <select
                aria-label="Idioma do app"
                value={settings.language}
                onChange={(e) =>
                  onUpdateSettings({ language: e.target.value as 'pt-BR' | 'en-US' })
                }
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
              </select>
            </div>

            {renderToggle(
              'Sempre traduzir',
              'Traduz automaticamente mensagens e dicas externas para o seu idioma.',
              settings.alwaysTranslate,
              (v) => onUpdateSettings({ alwaysTranslate: v })
            )}
          </section>
        </div>
      )}

      {/* SUB-TELA: ACESSIBILIDADE */}
      {subScreen === 'acessibilidade' && (
        <div className="space-y-5">
          <SubHeader
            title="Acessibilidade"
            subtitle="Ajuste texto, contraste e redução de movimento"
          />

          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 px-5 py-2 divide-y divide-slate-100 dark:divide-slate-800">
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Tamanho do texto
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Define o tamanho padrão de leitura no aplicativo.
                </p>
              </div>
              <select
                aria-label="Tamanho do texto"
                value={settings.fontSize}
                onChange={(e) =>
                  onUpdateSettings({ fontSize: e.target.value as 'normal' | 'large' })
                }
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="normal">Médio</option>
                <option value="large">Grande</option>
              </select>
            </div>

            {renderToggle(
              'Aumentar contraste de cor',
              'Reforça bordas e contrastes das telas apenas no EcoTech.',
              settings.highContrast,
              (v) => onUpdateSettings({ highContrast: v })
            )}
            {renderToggle(
              'Fotossensibilidade / Reduzir movimento',
              'Reduz animações e transições intensas na navegação.',
              settings.reducedMotion,
              (v) => onUpdateSettings({ reducedMotion: v })
            )}
            {renderToggle(
              'Legendas',
              'Exibe legendas descritivas em conteúdos e tutoriais.',
              settings.captions,
              (v) => onUpdateSettings({ captions: v })
            )}
          </section>
        </div>
      )}

      {/* SUB-TELA: PRIVACIDADE */}
      {subScreen === 'privacidade' && (
        <div className="space-y-5">
          <SubHeader
            title="Privacidade"
            subtitle="Controle quem vê seu perfil e o uso de localização"
          />

          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 px-5 py-2 divide-y divide-slate-100 dark:divide-slate-800">
            {renderToggle(
              'Conta privada',
              'Com a conta privada, somente seus amigos poderão ver seu perfil e progresso.',
              settings.privateAccount,
              (v) => onUpdateSettings({ privateAccount: v })
            )}
            {renderToggle(
              'Sincronizar conta',
              'Mantém moedas, avatares e cupons sincronizados para evitar perda de dados.',
              settings.syncAccount,
              (v) => onUpdateSettings({ syncAccount: v })
            )}
            {renderToggle(
              'Permitir amigos te enviarem mensagens privadas',
              'Permite conversas diretas com seus contatos no chat integrado.',
              settings.allowFriendMessages,
              (v) => onUpdateSettings({ allowFriendMessages: v })
            )}
            {renderToggle(
              'Permitir localização',
              'Usa sua localização em Palmas - TO para ordenar os pontos de coleta próximos.',
              settings.shareLocation,
              (v) => onUpdateSettings({ shareLocation: v })
            )}
          </section>
        </div>
      )}

      {/* SUB-TELA: PROTEÇÃO E SEGURANÇA */}
      {subScreen === 'seguranca' && (
        <div className="space-y-5">
          <SubHeader
            title="Proteção e segurança"
            subtitle="Proteja sua conta, cupons e sessões ativas"
          />

          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 px-5 py-2 divide-y divide-slate-100 dark:divide-slate-800">
            {renderToggle(
              'Salvar informações da conta',
              'Mantém seu acesso rápido salvo neste navegador.',
              settings.saveLoginInfo,
              (v) => onUpdateSettings({ saveLoginInfo: v })
            )}
            {renderToggle(
              'Verificação em duas etapas',
              'Adiciona confirmação extra antes de resgates de cupons de alto valor.',
              settings.twoFactorEnabled,
              (v) => onUpdateSettings({ twoFactorEnabled: v })
            )}
            {renderToggle(
              'Alertas de segurança',
              'Receba notificações sempre que um novo dispositivo acessar sua conta.',
              settings.securityAlerts,
              (v) => onUpdateSettings({ securityAlerts: v })
            )}
          </section>
        </div>
      )}

      {/* SUB-TELA: SUPORTE */}
      {subScreen === 'suporte' && (
        <div className="space-y-5">
          <SubHeader title="Suporte e Políticas" subtitle="Ajuda, segurança e privacidade EcoTech" />

          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {renderRow(
              <HelpCircle className="w-4 h-4 text-emerald-600" />,
              'Central de Ajuda (EcoBot)',
              () => onNavigate('chat')
            )}
            {renderRow(
              <Shield className="w-4 h-4 text-emerald-600" />,
              'Centro de Segurança',
              () => setSubScreen('seguranca')
            )}
            {renderRow(
              <Lock className="w-4 h-4 text-emerald-600" />,
              'Central de Privacidade',
              () => setSubScreen('privacidade')
            )}
          </section>
        </div>
      )}
    </div>
  );
};
