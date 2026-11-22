import React, { useState } from 'react';
import { Camera, Check, CheckCircle2, Coins, Trophy, UserPlus, Users } from 'lucide-react';
import type { FriendProfile, GroupChallengeState, UserProfile } from '../types';
import { AvatarRenderer } from './AvatarRenderer';

interface ChallengesViewProps {
  user: UserProfile;
  challenge: GroupChallengeState;
  friends: FriendProfile[];
  onSaveTeam: (teamName: string, invitedIds: string[]) => Promise<void>;
  onContribute: (
    itemLabel: string,
    quantity: number,
    photoName?: string
  ) => Promise<{ coinsEarned: number; missionJustCompleted: boolean; unlocks: string[] }>;
  onToggleInvite: (friendId: string) => Promise<void>;
}

export const ChallengesView: React.FC<ChallengesViewProps> = ({
  user,
  challenge,
  friends,
  onSaveTeam,
  onContribute,
  onToggleInvite,
}) => {
  const [teamNameInput, setTeamNameInput] = useState(challenge.teamName);
  const [editingTeam, setEditingTeam] = useState(!challenge.teamCreated);
  const [itemLabel, setItemLabel] = useState('');
  const [quantity, setQuantity] = useState(4);
  const [photoName, setPhotoName] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const progressPct = Math.min(
    100,
    Math.round((challenge.missionProgress / challenge.missionGoal) * 100)
  );
  const ringCircumference = 2 * Math.PI * 46;
  const ringOffset = ringCircumference - (progressPct / 100) * ringCircumference;

  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamNameInput.trim()) return;
    const invitedIds = friends.filter((f) => f.invitedToTeam).map((f) => f.id);
    await onSaveTeam(teamNameInput, invitedIds);
    setEditingTeam(false);
    setFeedback(`Equipe "${teamNameInput.trim()}" atualizada!`);
  };

  const handleContributionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemLabel.trim()) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await onContribute(itemLabel, quantity, photoName);
      setItemLabel('');
      setPhotoName(undefined);
      const unlockTxt = res.unlocks.length > 0 ? ` ${res.unlocks.join(' ')}` : '';
      setFeedback(
        res.missionJustCompleted
          ? `Missão do time concluída! Você ganhou +${res.coinsEarned} moedas e o bônus da equipe!${unlockTxt}`
          : `Contribuição registrada! +${res.coinsEarned} EcoCoins adicionadas.${unlockTxt}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Eco Desafios em Grupo
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Reúna de 3 a 5 amigos, registre fotos dos eletrônicos reciclados e desbloqueie o Ursinho Polar ao concluir a missão.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditingTeam((v) => !v)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 cursor-pointer min-h-[40px] shrink-0"
        >
          {editingTeam ? 'Fechar edição de equipe' : 'Editar equipe & convidar'}
        </button>
      </div>

      {feedback && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm px-4 py-3 rounded-xl">
          {feedback}
        </div>
      )}

      {editingTeam && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-5">
          <form onSubmit={handleTeamSubmit} className="space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Formar Time Eco-Heróis
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={teamNameInput}
                onChange={(e) => setTeamNameInput(e.target.value)}
                placeholder="Nome criativo da equipe"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#0F9D58] hover:bg-[#0C854A] text-white text-sm font-semibold cursor-pointer min-h-[44px]"
              >
                Salvar equipe
              </button>
            </div>
          </form>

          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3">
              Convidar amigos para o time
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {friends.map((fr) => (
                <div
                  key={fr.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AvatarRenderer config={fr.avatar} size={38} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {fr.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">Nível {fr.level}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleInvite(fr.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 inline-flex items-center gap-1 min-h-[36px] ${
                      fr.invitedToTeam
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {fr.invitedToTeam ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> No time
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" /> Convite
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Mission Progress + Contribution Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Progress Ring Card */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#0F7D4E] to-[#08452B] text-white rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between text-center">
          <div className="w-full flex items-center justify-between text-xs text-emerald-100">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Users className="w-4 h-4" /> {challenge.teamName}
            </span>
            <span className="font-mono tabular-nums">{challenge.members.length} membros</span>
          </div>

          <div className="my-6 relative w-36 h-36 flex items-center justify-center">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 110 110">
              <circle
                cx="55"
                cy="55"
                r="46"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="10"
                fill="none"
              />
              <circle
                cx="55"
                cy="55"
                r="46"
                stroke="#FBBF24"
                strokeWidth="10"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-2xl font-extrabold tabular-nums">
                {challenge.missionProgress}/{challenge.missionGoal}
              </span>
              <span className="text-[11px] text-emerald-100">itens</span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-xl font-bold">{challenge.missionTitle}</h2>
            <p className="text-xs text-emerald-100 inline-flex items-center justify-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-300" />
              Prêmio: +{challenge.rewardCoins} EcoCoins + Avatar Ursinho Polar
            </p>
          </div>

          {challenge.rewardClaimed && (
            <div className="mt-4 w-full bg-white/15 rounded-xl py-2.5 px-4 text-xs font-bold inline-flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-300" />
              Missão concluída com sucesso!
            </div>
          )}
        </div>

        {/* Send Photo / Contribution + Activity Feed */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between gap-6">
          <form onSubmit={handleContributionSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Enviar foto & registrar itens do time
              </h3>
              <span className="text-xs font-mono text-amber-600 dark:text-amber-400 font-semibold tabular-nums">
                +6 moedas / item
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={itemLabel}
                onChange={(e) => setItemLabel(e.target.value)}
                placeholder="Ex: 5 pilhas e 1 mouse quebrado"
                className="sm:col-span-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="number"
                min={1}
                max={30}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label="Quantidade de itens"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer min-h-[44px]">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>{photoName ? `Foto: ${photoName}` : 'Anexar foto da coleta'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setPhotoName(file.name);
                  }}
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-[#0F9D58] hover:bg-[#0C854A] text-white text-sm font-semibold cursor-pointer min-h-[44px] inline-flex items-center justify-center gap-2"
              >
                <Coins className="w-4 h-4" />
                {submitting ? 'Enviando...' : `Enviar (+${quantity * 6} moedas)`}
              </button>
            </div>
          </form>

          {/* Contributions Feed */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">
              Histórico do time ({user.name.split(' ')[0]} e amigos)
            </h4>
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {challenge.contributions.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {c.author} · {c.itemLabel}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {c.photoName ? `Foto anexada: ${c.photoName}` : 'Registro verificado'}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">
                    +{c.quantity} itens
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
