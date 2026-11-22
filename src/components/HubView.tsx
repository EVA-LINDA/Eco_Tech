import React from 'react';
import {
  ArrowRight,
  Coins,
  Gift,
  HelpCircle,
  MapPin,
  MessageSquare,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import type { AppSection, AppState } from '../types';
import { WASTE_CATEGORIES } from '../data/ecotechData';
import { AvatarRenderer } from './AvatarRenderer';

interface HubViewProps {
  state: AppState;
  onNavigate: (section: AppSection) => void;
}

export const HubView: React.FC<HubViewProps> = ({ state, onNavigate }) => {
  const { user, friends, dropOffs } = state;
  const monthlyPct = Math.min(100, Math.round((user.monthlyRecycledKg / user.monthlyGoalKg) * 100));

  const leaderboard = [
    ...friends.map((f) => ({
      id: f.id,
      name: f.name,
      kg: f.kgRecycled,
      avatar: f.avatar,
      isYou: false,
    })),
    {
      id: user.id,
      name: `${user.name} (Você)`,
      kg: user.kgRecycled,
      avatar: user.avatar,
      isYou: true,
    },
  ]
    .sort((a, b) => b.kg - a.kg)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Hero Greeting + Avatar Showcase */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                Pensar no futuro é agir no agora! · Nível {user.level} ({user.tier})
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1 text-balance">
                Olá, {user.name.split(' ')[0]}! Pronto para reciclar hoje?
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 max-w-xl">
                Cada entrega em pontos EcoTech gera moedas e XP para liberar cupons de desconto e novos avatares colecionáveis.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('mapa')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0F9D58] hover:bg-[#0C854A] text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap min-h-[44px]"
              >
                <MapPin className="w-4 h-4" />
                Encontrar Coleta
              </button>
            </div>
          </div>

          {/* Monthly Progress Bar */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-slate-800 dark:text-slate-200">
                Seu progresso este mês
              </span>
              <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {user.monthlyRecycledKg.toFixed(1)} kg de {user.monthlyGoalKg} kg ({monthlyPct}%)
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0F9D58] to-emerald-400 transition-all duration-300"
                style={{ width: `${monthlyPct}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {user.monthlyRecycledKg >= user.monthlyGoalKg
                ? 'Meta mensal alcançada! Continue reciclando para acumular mais EcoCoins.'
                : `Faltam ${(user.monthlyGoalKg - user.monthlyRecycledKg).toFixed(1)} kg para o bônus mensal de +150 EcoCoins.`}
            </p>
          </div>
        </div>

        {/* Live Custom Avatar Card */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 flex items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Seu Avatar Ativo
            </p>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Estúdio 3D
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {user.unlockedSpecies.length}/6 personagens · {user.unlockedProps.length}/8 acessórios
            </p>
            <button
              type="button"
              onClick={() => onNavigate('avatar')}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer min-h-[40px]"
            >
              Personalizar avatar <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('avatar')}
            className="shrink-0 rounded-2xl overflow-hidden hover:scale-[1.03] transition-transform cursor-pointer"
            title="Abrir Estúdio de Avatar"
          >
            <AvatarRenderer config={user.avatar} size={118} />
          </button>
        </div>
      </section>

      {/* Primary Quick Action Cards (Hub Grid) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('mapa')}
          className="text-left bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-900 rounded-2xl p-5 transition-colors cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-3">
            <MapPin className="w-5 h-5" />
          </div>
          <h3 className="font-display font-bold text-slate-900 dark:text-white">
            Pontos de coleta
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Encontre ecopontos específicos para pilhas, celulares, cabos e monitores.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('cupons')}
          className="text-left bg-amber-50/70 dark:bg-amber-950/25 hover:bg-amber-100/70 dark:hover:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/60 rounded-2xl p-5 transition-colors cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-3">
            <Gift className="w-5 h-5" />
          </div>
          <h3 className="font-display font-bold text-slate-900 dark:text-white">
            Cupons & Bônus
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Você tem <span className="font-semibold tabular-nums">{user.coins} EcoCoins</span> para trocar por descontos.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('quiz')}
          className="text-left bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 transition-colors cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center mb-3">
            <HelpCircle className="w-5 h-5" />
          </div>
          <h3 className="font-display font-bold text-slate-900 dark:text-white">
            Quiz Ecológico
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            {state.completedQuizLevels.length}/5 níveis concluídos · Aprenda e ganhe moedas.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('chat')}
          className="text-left bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 transition-colors cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center mb-3">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h3 className="font-display font-bold text-slate-900 dark:text-white">
            Chat Integrado
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Fale com o EcoBot guia de descarte, amigos e seu time de desafios.
          </p>
        </button>
      </section>

      {/* Two-Column Detail Row: Weekly Contributors + Recent Deliveries & Mission */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Top contribuintes da semana
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('desafios')}
              className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Ver desafios
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {leaderboard.map((item, idx) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs font-semibold text-slate-400 w-5 tabular-nums">
                    {idx + 1}.
                  </span>
                  <AvatarRenderer config={item.avatar} size={42} className="rounded-xl shrink-0" />
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold truncate ${
                        item.isYou
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Ranking semanal
                    </p>
                  </div>
                </div>
                <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200 tabular-nums shrink-0">
                  {item.kg.toFixed(1)} kg
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-600" />
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Entregas recentes
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('mapa')}
                className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Registrar nova
              </button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {dropOffs.slice(0, 3).map((d) => {
                const catLabel =
                  WASTE_CATEGORIES.find((c) => c.id === d.category)?.label || d.category;
                return (
                  <div key={d.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {d.pointName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {catLabel} · {d.weightKg} kg · Cód. {d.code}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">
                      +{d.coinsEarned} moedas
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <Users className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Time <strong className="text-slate-900 dark:text-white">{state.groupChallenge.teamName}</strong>:{' '}
                {state.groupChallenge.missionProgress}/{state.groupChallenge.missionGoal} itens
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('desafios')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" /> Contribuir
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
