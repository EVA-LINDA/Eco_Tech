import React, { useEffect } from 'react';
import { PartyPopper, X } from 'lucide-react';

interface BalloonCelebrationProps {
  visible: boolean;
  daysUsing: number;
  reducedMotion?: boolean;
  onClose: () => void;
}

const BALLOON_SPECS = [
  { left: '6%', color: '#0F9D58', shine: '#6EE7B7', scale: 1.0, delay: '0s', duration: '4.4s', sway: '22px' },
  { left: '16%', color: '#F59E0B', shine: '#FDE68A', scale: 0.88, delay: '0.25s', duration: '4.9s', sway: '-26px' },
  { left: '26%', color: '#38BDF8', shine: '#BAE6FD', scale: 1.08, delay: '0.1s', duration: '4.6s', sway: '18px' },
  { left: '38%', color: '#F43F5E', shine: '#FECDD3', scale: 0.94, delay: '0.4s', duration: '5.1s', sway: '-20px' },
  { left: '50%', color: '#0F9D58', shine: '#A7F3D0', scale: 1.12, delay: '0.15s', duration: '4.5s', sway: '26px' },
  { left: '62%', color: '#A855F7', shine: '#E9D5FF', scale: 0.9, delay: '0.35s', duration: '5.0s', sway: '-22px' },
  { left: '74%', color: '#F59E0B', shine: '#FEF3C7', scale: 1.04, delay: '0.05s', duration: '4.7s', sway: '20px' },
  { left: '84%', color: '#0EA5E9', shine: '#BAE6FD', scale: 0.96, delay: '0.3s', duration: '4.8s', sway: '-24px' },
  { left: '92%', color: '#F43F5E', shine: '#FFE4E6', scale: 1.0, delay: '0.2s', duration: '4.4s', sway: '-16px' },
];

export const BalloonCelebration: React.FC<BalloonCelebrationProps> = ({
  visible,
  daysUsing,
  reducedMotion = false,
  onClose,
}) => {
  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => {
      onClose();
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
      aria-live="polite"
      role="status"
    >
      {/* Floating Festive Balloons */}
      {!reducedMotion &&
        BALLOON_SPECS.map((b, idx) => (
          <div
            key={idx}
            className="eco-balloon-float absolute bottom-0"
            style={
              {
                left: b.left,
                '--balloon-delay': b.delay,
                '--balloon-duration': b.duration,
                '--balloon-sway': b.sway,
              } as React.CSSProperties
            }
          >
            <svg
              width={Math.round(58 * b.scale)}
              height={Math.round(110 * b.scale)}
              viewBox="0 0 64 120"
              fill="none"
              aria-hidden="true"
            >
              {/* Balloon string */}
              <path
                d="M32 76 C28 88, 37 96, 31 118"
                stroke="#94A3B8"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Balloon knot */}
              <polygon points="28,74 36,74 32,68" fill={b.color} />
              {/* Balloon body */}
              <ellipse cx="32" cy="36" rx="26" ry="33" fill={b.color} />
              {/* Glossy vinyl highlight */}
              <ellipse
                cx="22"
                cy="24"
                rx="7"
                ry="12"
                transform="rotate(-22 22 24)"
                fill={b.shine}
                opacity="0.7"
              />
            </svg>
          </div>
        ))}

      {/* Celebratory Milestone Banner */}
      <div className="pointer-events-auto fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-md bg-white dark:bg-slate-900 border-2 border-emerald-500 shadow-2xl rounded-2xl p-4 flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
          <PartyPopper className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Marco de 1 mês no EcoTech
          </p>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
            Parabéns pelos {daysUsing} dias usando a plataforma!
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
            Obrigado por reciclar eletrônicos e manter o planeta mais limpo.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar comemoração"
          className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
