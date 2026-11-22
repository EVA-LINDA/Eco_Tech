import React, { useState } from 'react';
import { Check, Coins, Lock, RotateCw, Save, Sparkles } from 'lucide-react';
import { AVATAR_PROPS, AVATAR_SPECIES } from '../data/ecotechData';
import type {
  AvatarAngle,
  AvatarConfig,
  AvatarExpression,
  AvatarPropId,
  AvatarSpeciesId,
  UserProfile,
} from '../types';
import { AvatarRenderer } from './AvatarRenderer';

interface AvatarStudioViewProps {
  user: UserProfile;
  onUnlock: (type: 'species' | 'prop', id: string) => Promise<void>;
  onSaveAvatar: (avatar: AvatarConfig) => Promise<void>;
}

const SKIN_SWATCHES = ['#F09472', '#F7B7C4', '#98D47C', '#7ACCE5', '#FCE192', '#F3F6FA'];
const OUTFIT_SWATCHES = ['#A7D38C', '#7CC6FE', '#F8D460', '#F7C948', '#2D3A54', '#FB7185'];
const BACKDROP_SWATCHES = ['#E4898C', '#C8A5F5', '#5AC18E', '#67A8E5', '#F5C469', '#E580AA'];

export const AvatarStudioView: React.FC<AvatarStudioViewProps> = ({
  user,
  onUnlock,
  onSaveAvatar,
}) => {
  const [draft, setDraft] = useState<AvatarConfig>(user.avatar);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedSpeciesMeta = AVATAR_SPECIES.find((s) => s.id === draft.species)!;
  const isSpeciesUnlocked = user.unlockedSpecies.includes(draft.species);

  const selectSpecies = (id: AvatarSpeciesId) => {
    const meta = AVATAR_SPECIES.find((s) => s.id === id)!;
    setFeedback(null);
    setErrorMsg(null);
    setDraft((prev) => ({
      ...prev,
      species: id,
      primaryColor: meta.defaultPrimary,
      outfitColor: meta.defaultOutfit,
      backdropColor: meta.defaultBackdrop,
    }));
  };

  const toggleProp = (propId: AvatarPropId) => {
    if (!user.unlockedProps.includes(propId)) return;
    setFeedback(null);
    setDraft((prev) => {
      const exists = prev.equippedProps.includes(propId);
      return {
        ...prev,
        equippedProps: exists
          ? prev.equippedProps.filter((p) => p !== propId)
          : [...prev.equippedProps, propId],
      };
    });
  };

  const handleUnlock = async (type: 'species' | 'prop', id: string) => {
    setErrorMsg(null);
    setFeedback(null);
    try {
      await onUnlock(type, id);
      setFeedback(
        type === 'species'
          ? 'Novo personagem desbloqueado e adicionado à sua coleção!'
          : 'Acessório desbloqueado e equipado no seu avatar!'
      );
      if (type === 'prop') {
        setDraft((prev) => ({
          ...prev,
          equippedProps: Array.from(new Set([...prev.equippedProps, id as AvatarPropId])),
        }));
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Moedas insuficientes.');
    }
  };

  const handleSave = async () => {
    if (!isSpeciesUnlocked) {
      setErrorMsg('Desbloqueie este personagem antes de equipá-lo no seu perfil.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    setFeedback(null);
    try {
      await onSaveAvatar(draft);
      setFeedback('Avatar salvo e atualizado em todo o EcoTech!');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar avatar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Estúdio de Avatar Colecionável
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Personalize seu mascote 3D, altere ângulos e desbloqueie personagens e acessórios como recompensa por reciclar.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-4 py-2 rounded-xl tabular-nums shrink-0">
          <Coins className="w-4 h-4" />
          {user.coins} EcoCoins
        </div>
      </div>

      {feedback && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm px-4 py-3 rounded-xl">
          {feedback}
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm px-4 py-3 rounded-xl">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Live 3D Avatar Preview Stage (Role Choice / Angle Change card) */}
        <div
          className="lg:col-span-5 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col items-center justify-between transition-colors"
          style={{ backgroundColor: draft.backdropColor }}
        >
          <div className="w-full flex items-center justify-between text-xs font-semibold tracking-wide opacity-90">
            <span>{selectedSpeciesMeta.codename}</span>
            <span>{selectedSpeciesMeta.subtitle}</span>
          </div>

          <div className="my-5">
            <AvatarRenderer config={draft} size={230} showBackdrop={false} />
          </div>

          <div className="w-full text-center space-y-1">
            <h2 className="font-display text-2xl font-bold">{selectedSpeciesMeta.name}</h2>
            <p className="text-xs text-white/90 max-w-xs mx-auto leading-relaxed">
              {selectedSpeciesMeta.description}
            </p>
          </div>

          {/* Angle Change & Expression Controls */}
          <div className="w-full mt-5 pt-4 border-t border-white/20 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold inline-flex items-center gap-1">
                <RotateCw className="w-3.5 h-3.5" /> Ângulo
              </span>
              <div className="flex items-center gap-1 bg-black/15 p-1 rounded-xl">
                {(['front', 'side', 'celebrate'] as AvatarAngle[]).map((ang) => (
                  <button
                    key={ang}
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, angle: ang }))}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      draft.angle === ang ? 'bg-white text-slate-900' : 'text-white hover:bg-white/10'
                    }`}
                  >
                    {ang === 'front' ? 'Frente' : ang === 'side' ? 'Perfil' : 'Festa'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold inline-flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Expressão
              </span>
              <div className="flex items-center gap-1 bg-black/15 p-1 rounded-xl">
                {(['happy', 'curious', 'proud'] as AvatarExpression[]).map((exp) => (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, expression: exp }))}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      draft.expression === exp
                        ? 'bg-white text-slate-900'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    {exp === 'happy' ? 'Feliz' : exp === 'curious' ? 'Curioso' : 'Orgulhoso'}
                  </button>
                ))}
              </div>
            </div>

            {isSpeciesUnlocked ? (
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer transition-colors min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Equipar e Salvar Avatar'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleUnlock('species', draft.species)}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer transition-colors min-h-[44px]"
              >
                <Lock className="w-4 h-4" />
                Desbloquear por {selectedSpeciesMeta.costCoins} moedas
              </button>
            )}
          </div>
        </div>

        {/* Right: Role Choice (Species), Color Palette & Props */}
        <div className="lg:col-span-7 space-y-6">
          {/* Role Choice Grid */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white mb-3">
              Escolha do Personagem (Role Choice)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {AVATAR_SPECIES.map((sp) => {
                const unlocked = user.unlockedSpecies.includes(sp.id);
                const selected = draft.species === sp.id;
                return (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => selectSpecies(sp.id)}
                    className={`rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                      selected
                        ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-center mb-2">
                      <AvatarRenderer
                        config={{
                          species: sp.id,
                          primaryColor: sp.defaultPrimary,
                          outfitColor: sp.defaultOutfit,
                          backdropColor: sp.defaultBackdrop,
                          angle: 'front',
                          expression: 'happy',
                          equippedProps: [],
                        }}
                        size={72}
                      />
                    </div>
                    <p className="font-display font-bold text-xs text-slate-900 dark:text-white truncate">
                      {sp.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {unlocked ? 'Desbloqueado' : `${sp.costCoins} moedas`}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Colors Customization */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Cores do Avatar & Cartão
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Cor do personagem
                </p>
                <div className="flex flex-wrap gap-2">
                  {SKIN_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setDraft((p) => ({ ...p, primaryColor: hex }))}
                      aria-label={`Selecionar cor ${hex}`}
                      className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-transform ${
                        draft.primaryColor === hex
                          ? 'border-slate-900 dark:border-white scale-110'
                          : 'border-white dark:border-slate-800'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Cor da roupa
                </p>
                <div className="flex flex-wrap gap-2">
                  {OUTFIT_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setDraft((p) => ({ ...p, outfitColor: hex }))}
                      aria-label={`Selecionar roupa ${hex}`}
                      className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-transform ${
                        draft.outfitColor === hex
                          ? 'border-slate-900 dark:border-white scale-110'
                          : 'border-white dark:border-slate-800'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Fundo do cartão
                </p>
                <div className="flex flex-wrap gap-2">
                  {BACKDROP_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setDraft((p) => ({ ...p, backdropColor: hex }))}
                      aria-label={`Selecionar fundo ${hex}`}
                      className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-transform ${
                        draft.backdropColor === hex
                          ? 'border-slate-900 dark:border-white scale-110'
                          : 'border-white dark:border-slate-800'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Unlockable Props Section */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white mb-1">
              Props & Companheiros (Recompensas)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Equipe acessórios reciclados e companheiros colecionáveis no seu avatar.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AVATAR_PROPS.map((prop) => {
                const unlocked = user.unlockedProps.includes(prop.id);
                const equipped = draft.equippedProps.includes(prop.id);
                return (
                  <div
                    key={prop.id}
                    className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 ${
                      equipped
                        ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {prop.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {prop.description}
                      </p>
                    </div>
                    {unlocked ? (
                      <button
                        type="button"
                        onClick={() => toggleProp(prop.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold shrink-0 cursor-pointer min-h-[40px] inline-flex items-center gap-1 ${
                          equipped
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {equipped ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Equipado
                          </>
                        ) : (
                          'Equipar'
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUnlock('prop', prop.id)}
                        className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shrink-0 cursor-pointer min-h-[40px] font-mono tabular-nums"
                      >
                        {prop.costCoins} 🪙
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
