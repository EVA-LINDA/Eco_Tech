import React, { useMemo, useState } from 'react';
import {
  Accessibility,
  Bell,
  Check,
  Clock,
  Copy,
  Globe,
  HelpCircle,
  Lock,
  LogOut,
  Moon,
  QrCode,
  Search,
  Shield,
  Sun,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import type { AppSection, AppState, UserSettings } from '../types';
import { AvatarRenderer } from './AvatarRenderer';

interface AccountAndSettingsViewProps {
  state: AppState;
  onUpdateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  onToggleFriend: (friendId: string) => Promise<void>;
  onMarkNotificationsRead: () => Promise<void>;
  onLogout: () => Promise<void>;
  onNavigate: (section: AppSection) => void;
  requestedTab?: { tab: AccountTab; nonce: number } | null;
}

export type AccountTab =
  | 'perfil'
  | 'amigos'
  | 'qrcode'
  | 'config'
  | 'notificacoes';

function buildQrGrid(seed: string): boolean[][] {
  const size = 21;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const placeFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isEdge = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[r0 + r][c0 + c] = isEdge || isCenter;
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inFinder =
        (r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8);
      if (inFinder) continue;
      hash = (hash * 1664525 + 1013904223) >>> 0;
      grid[r][c] = (hash & 1) === 1;
    }
  }
  return grid;
}

export const AccountAndSettingsView: React.FC<AccountAndSettingsViewProps> = ({
  state,
  onUpdateSettings,
  onToggleFriend,
  onMarkNotificationsRead,
  onLogout,
  onNavigate,
  requestedTab,
}) => {
  const [tab, setTab] = useState<AccountTab>(requestedTab?.tab || 'perfil');
  const [friendSearch, setFriendSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  React.useEffect(() => {
    if (requestedTab?.tab) {
      setTab(requestedTab.tab);
    }
  }, [requestedTab]);

  const { user, friends, notifications, settings, weeklyScreenMinutes } = state;
  const xpPct = Math.min(100, Math.round((user.xp / user.xpToNext) * 100));
  const qrGrid = useMemo(() => buildQrGrid(user.accessCode), [user.accessCode]);

  const filteredFriends = friends.filter((f) =>
    f.name.toLowerCase().includes(friendSearch.trim().toLowerCase())
  );

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(user.accessCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const renderToggle = (
    label: string,
    description: string,
    checked: boolean,
    onChange: (val: boolean) => void
  ) => (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
          checked ? 'bg-[#0F9D58]' : 'bg-slate-300 dark:bg-slate-700'
        }`}
      >
        <span
          className={`block w-5 h-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(
          [
            ['perfil', 'Minha Conta'],
            ['amigos', `Amigos (${friends.filter((f) => f.isFriend).length})`],
            ['qrcode', 'Código QR'],
            ['config', 'Configurações & Tema'],
            ['notificacoes', `Notificações (${notifications.filter((n) => !n.read).length})`],
          ] as [AccountTab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] ${
              tab === id
                ? 'bg-[#0F9D58] text-white'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* PERFIL / CONTA */}
      {tab === 'perfil' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-gradient-to-br from-[#0F7D4E] to-[#08452B] text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
            <div className="flex items-center gap-4">
              <AvatarRenderer config={user.avatar} size={86} />
              <div className="min-w-0">
                <p className="text-xs text-emerald-100">
                  Nível {user.level} · Conta {user.tier}
                </p>
                <h2 className="font-display text-2xl font-bold truncate">{user.name}</h2>
                <p className="text-xs text-emerald-100 truncate">{user.email}</p>
              </div>
            </div>

            <div className="mt-6 bg-white/10 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span>Experiência para próximo nível</span>
                <span className="font-mono font-bold tabular-nums">
                  {user.xp} / {user.xpToNext} XP
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-2xl p-4">
                <p className="text-xs text-emerald-100">Entregas concluídas</p>
                <p className="font-display text-2xl font-extrabold tabular-nums mt-1">
                  {user.deliveriesCount}
                </p>
              </div>
              <div className="bg-white/10 rounded-2xl p-4">
                <p className="text-xs text-emerald-100">Quantidade entregue</p>
                <p className="font-display text-2xl font-extrabold tabular-nums mt-1">
                  {user.kgRecycled.toFixed(1)} kg
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('avatar')}
              className="mt-6 w-full py-3 rounded-xl bg-white text-slate-900 font-bold text-xs cursor-pointer hover:bg-slate-100 min-h-[44px]"
            >
              Personalizar Avatar no Estúdio
            </button>
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" /> Amigos próximos
                </h3>
                <button
                  type="button"
                  onClick={() => setTab('amigos')}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Gerenciar todos
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {friends
                  .filter((f) => f.isFriend)
                  .slice(0, 3)
                  .map((fr) => (
                    <div
                      key={fr.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-center"
                    >
                      <div className="flex justify-center mb-2">
                        <AvatarRenderer config={fr.avatar} size={64} />
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {fr.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        Nível {fr.level} · {fr.kgRecycled} kg
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setTab('qrcode')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer min-h-[40px]"
              >
                <QrCode className="w-4 h-4" /> Ver QR Code de Coleta
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-semibold cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/30 min-h-[40px]"
              >
                <LogOut className="w-4 h-4" /> Sair da conta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AMIGOS */}
      {tab === 'amigos' && (
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Amigos & Comunidade
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Adicione amigos para competir no ranking semanal e enviar mensagens no chat integrado.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                placeholder="Buscar pessoa..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredFriends.map((fr) => (
              <div key={fr.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <AvatarRenderer config={fr.avatar} size={48} className="shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {fr.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {fr.city} · Nível {fr.level} · {fr.kgRecycled} kg reciclados
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {fr.isFriend && (
                    <button
                      type="button"
                      onClick={() => onNavigate('chat')}
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer min-h-[40px]"
                    >
                      Conversar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onToggleFriend(fr.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer min-h-[40px] ${
                      fr.isFriend
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                        : 'bg-[#0F9D58] text-white'
                    }`}
                  >
                    {fr.isFriend ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" /> Amigo
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" /> Adicionar
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* QR CODE DE ACESSO */}
      {tab === 'qrcode' && (
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 max-w-lg mx-auto text-center space-y-5">
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Código de Acesso EcoTech
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Apresente este QR Code nos totens e ecopontos parceiros para creditar moedas automaticamente na sua conta.
          </p>

          <div className="inline-block p-5 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <svg width="189" height="189" viewBox="0 0 21 21" className="mx-auto">
              <rect width="21" height="21" fill="#FFFFFF" />
              {qrGrid.map((row, r) =>
                row.map((cell, c) =>
                  cell ? (
                    <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0F172A" />
                  ) : null
                )
              )}
            </svg>
          </div>

          <div className="flex items-center justify-center gap-2">
            <code className="font-mono text-sm font-bold bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl text-slate-900 dark:text-white">
              {user.accessCode}
            </code>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-4 py-2 rounded-xl bg-[#0F9D58] text-white text-xs font-semibold cursor-pointer min-h-[40px] inline-flex items-center gap-1.5"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCode ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </section>
      )}

      {/* CONFIGURAÇÕES & TEMA */}
      {tab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tema, Idioma & Acessibilidade */}
          <div className="lg:col-span-6 space-y-6">
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
              <h3 className="font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {settings.theme === 'dark' ? (
                  <Moon className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
                Tema do Aplicativo
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ theme: 'light', useDeviceTheme: false })}
                  className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                    settings.theme === 'light' && !settings.useDeviceTheme
                      ? 'border-emerald-600 bg-emerald-50/70 text-slate-900'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Sun className="w-5 h-5 mb-2 text-amber-500" />
                  <p className="text-sm font-bold">Claro</p>
                  <p className="text-xs opacity-75">Visual leve e diurno</p>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ theme: 'dark', useDeviceTheme: false })}
                  className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                    settings.theme === 'dark' && !settings.useDeviceTheme
                      ? 'border-emerald-500 bg-emerald-950/60 text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Moon className="w-5 h-5 mb-2 text-emerald-400" />
                  <p className="text-sm font-bold">Escuro</p>
                  <p className="text-xs opacity-75">Conforto noturno</p>
                </button>
              </div>
            </section>

            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 divide-y divide-slate-100 dark:divide-slate-800">
              <h3 className="font-display font-bold text-slate-900 dark:text-white pb-3 flex items-center gap-2">
                <Accessibility className="w-4 h-4 text-emerald-600" /> Acessibilidade & Idioma
              </h3>
              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> Idioma do app
                  </p>
                  <p className="text-xs text-slate-500">Português (Brasil) / English</p>
                </div>
                <select
                  value={settings.language}
                  onChange={(e) =>
                    onUpdateSettings({ language: e.target.value as 'pt-BR' | 'en-US' })
                  }
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  <option value="pt-BR">Português (BR)</option>
                  <option value="en-US">English (US)</option>
                </select>
              </div>
              {renderToggle(
                'Fonte ampliada',
                'Aumenta a legibilidade dos textos em todas as telas',
                settings.fontSize === 'large',
                (v) => onUpdateSettings({ fontSize: v ? 'large' : 'normal' })
              )}
              {renderToggle(
                'Aumentar contraste de cor',
                'Reforça bordas e contrastes para leitura',
                settings.highContrast,
                (v) => onUpdateSettings({ highContrast: v })
              )}
              {renderToggle(
                'Reduzir movimento',
                'Desativa transições e animações intensas',
                settings.reducedMotion,
                (v) => onUpdateSettings({ reducedMotion: v })
              )}
            </section>
          </div>

          {/* Tempo de Tela, Privacidade, Segurança & Suporte */}
          <div className="lg:col-span-6 space-y-6">
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" /> Tempo de uso da ferramenta
                </h3>
                <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {Math.floor((user.totalToolMinutes || 0) / 60)}h {(user.totalToolMinutes || 0) % 60}m no total
                </span>
              </div>
              <div className="grid grid-cols-7 gap-2 items-end h-28 pt-4">
                {weeklyScreenMinutes.map((item) => {
                  const maxMin = Math.max(45, ...weeklyScreenMinutes.map((w) => w.minutes));
                  const heightPct = Math.max(15, Math.min(100, Math.round((item.minutes / maxMin) * 100)));
                  return (
                    <div key={item.day} className="flex flex-col items-center gap-1.5 h-full justify-end">
                      <div
                        className="w-full max-w-[28px] rounded-t-lg bg-[#0F9D58]"
                        style={{ height: `${heightPct}%` }}
                        title={`${item.minutes} min`}
                      />
                      <span className="text-[11px] font-mono text-slate-500">{item.day}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 divide-y divide-slate-100 dark:divide-slate-800">
              <h3 className="font-display font-bold text-slate-900 dark:text-white pb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" /> Privacidade & Segurança
              </h3>
              {renderToggle(
                'Conta privada',
                'Restringe seu histórico de entregas apenas a amigos',
                settings.privateAccount,
                (v) => onUpdateSettings({ privateAccount: v })
              )}
              {renderToggle(
                'Permitir localização no mapa',
                'Usa sua região para ordenar os ecopontos mais próximos',
                settings.shareLocation,
                (v) => onUpdateSettings({ shareLocation: v })
              )}
              {renderToggle(
                'Verificação em duas etapas',
                'Protege o resgate de cupons e alterações de conta',
                settings.twoFactorEnabled,
                (v) => onUpdateSettings({ twoFactorEnabled: v })
              )}
              <div className="pt-3 flex items-center justify-between text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Dados criptografados localmente
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('chat')}
                  className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" /> Falar com Suporte
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* NOTIFICAÇÕES */}
      {tab === 'notificacoes' && (
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-600" /> Notificações
            </h2>
            <button
              type="button"
              onClick={onMarkNotificationsRead}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Marcar todas como lidas
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((n) => (
              <div key={n.id} className="py-3.5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-400 font-medium">
                    {n.section} · {n.timeLabel}
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{n.body}</p>
                </div>
                {!n.read && (
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                    Nova
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
