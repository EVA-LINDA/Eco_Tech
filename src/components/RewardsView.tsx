import React, { useState } from 'react';
import { Check, Coins, Copy, Gift, Sparkles, Tag } from 'lucide-react';
import { AVATAR_SPECIES, COUPON_OFFERS } from '../data/ecotechData';
import type { AppSection, RedeemedCoupon, UserProfile } from '../types';
import { AvatarRenderer } from './AvatarRenderer';

interface RewardsViewProps {
  user: UserProfile;
  redeemedCoupons: RedeemedCoupon[];
  onRedeemCoupon: (offerId: string) => Promise<RedeemedCoupon>;
  onNavigate: (section: AppSection) => void;
}

export const RewardsView: React.FC<RewardsViewProps> = ({
  user,
  redeemedCoupons,
  onRedeemCoupon,
  onNavigate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [justRedeemed, setJustRedeemed] = useState<RedeemedCoupon | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ['Todos', 'Tecnologia', 'Marketplace', 'Varejo', 'Sustentável'];

  const filteredOffers =
    selectedCategory === 'Todos'
      ? COUPON_OFFERS
      : COUPON_OFFERS.filter((o) => o.category === selectedCategory);

  const handleRedeem = async (offerId: string) => {
    setErrorMsg(null);
    setRedeemingId(offerId);
    try {
      const coupon = await onRedeemCoupon(offerId);
      setJustRedeemed(coupon);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Não foi possível resgatar.');
    } finally {
      setRedeemingId(null);
    }
  };

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="space-y-6">
      {/* Header Balance Card */}
      <section className="bg-gradient-to-r from-[#0F7D4E] to-[#0A5937] text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-emerald-100">
            Recompensas EcoTech · Nível {user.level}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1">
            Cupons de Desconto & Avatares
          </h1>
          <p className="text-sm text-emerald-100 mt-1">
            Troque suas moedas acumuladas em descartes e quizzes por descontos em lojas parceiras.
          </p>
        </div>
        <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-4 shrink-0">
          <p className="text-xs text-emerald-100">Você tem</p>
          <p className="font-display text-3xl font-extrabold tabular-nums flex items-center gap-2 mt-0.5">
            <Coins className="w-6 h-6 text-amber-300" />
            {user.coins}
          </p>
          <p className="text-xs text-emerald-100 mt-0.5">EcoCoins disponíveis</p>
        </div>
      </section>

      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm px-4 py-3 rounded-xl">
          {errorMsg}
        </div>
      )}

      {justRedeemed && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              Cupom gerado com sucesso!
            </p>
            <p className="font-display text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {justRedeemed.brand} · {justRedeemed.discountLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <code className="font-mono text-sm font-bold bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
              {justRedeemed.promoCode}
            </code>
            <button
              type="button"
              onClick={() => handleCopy(justRedeemed.id, justRedeemed.promoCode)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer min-h-[40px] inline-flex items-center gap-1.5"
            >
              {copiedId === justRedeemed.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedId === justRedeemed.id ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      )}

      {/* Filter Categories */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] ${
              selectedCategory === cat
                ? 'bg-slate-900 dark:bg-emerald-600 text-white'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Coupons Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOffers.map((offer) => {
          const canAfford = user.coins >= offer.costCoins;
          return (
            <div
              key={offer.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-display font-extrabold text-lg shrink-0"
                  style={{
                    backgroundColor: offer.accentBg,
                    color: offer.accentBg === '#FFE600' ? '#0F172A' : '#FFFFFF',
                  }}
                >
                  {offer.shortCode}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {offer.brand} · {offer.category}
                  </p>
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {offer.discountLabel}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    {offer.description}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {offer.costCoins} moedas
                </span>
                <button
                  type="button"
                  disabled={redeemingId === offer.id || !canAfford}
                  onClick={() => handleRedeem(offer.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-[40px] ${
                    canAfford
                      ? 'bg-[#0F9D58] hover:bg-[#0C854A] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {redeemingId === offer.id
                    ? 'Resgatando...'
                    : canAfford
                      ? 'Trocar agora'
                      : 'Moedas insuficientes'}
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {/* Two-Column Bottom: Redeemed Coupons + Avatar Rewards Promo */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-emerald-600" />
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Meus Cupons Ativos ({redeemedCoupons.length})
            </h2>
          </div>
          {redeemedCoupons.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">
              Você ainda não resgatou cupons. Troque suas moedas acima!
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {redeemedCoupons.map((rc) => (
                <div key={rc.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {rc.brand} — {rc.discountLabel}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Válido até {new Date(rc.expiresAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <code className="font-mono text-xs font-semibold bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg text-slate-800 dark:text-slate-200">
                      {rc.promoCode}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy(rc.id, rc.promoCode)}
                      aria-label="Copiar código"
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {copiedId === rc.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Recompensas de Avatar
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Use suas EcoCoins ou conquiste metas de reciclagem para liberar novos avatares 3D e acessórios exclusivos.
            </p>
            <div className="mt-4 flex items-center gap-3">
              {AVATAR_SPECIES.slice(2, 5).map((sp) => (
                <div key={sp.id} className="text-center">
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
                  <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 mt-1">
                    {sp.name.split(' ')[0]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('avatar')}
            className="mt-5 w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer min-h-[44px] inline-flex items-center justify-center gap-2"
          >
            <Gift className="w-4 h-4" />
            Ir para o Estúdio de Avatar
          </button>
        </div>
      </section>
    </div>
  );
};
