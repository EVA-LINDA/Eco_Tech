import React, { useId } from 'react';
import type { AvatarConfig } from '../types';

interface AvatarRendererProps {
  config: AvatarConfig;
  size?: number;
  className?: string;
  showBackdrop?: boolean;
}

function darkenHex(hex: string, amount = 0.2): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = Math.max(0, Math.round(((num >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 255) * (1 - amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function lightenHex(hex: string, amount = 0.25): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = Math.min(255, Math.round(((num >> 16) & 255) + (255 - ((num >> 16) & 255)) * amount));
  const g = Math.min(255, Math.round(((num >> 8) & 255) + (255 - ((num >> 8) & 255)) * amount));
  const b = Math.min(255, Math.round((num & 255) + (255 - (num & 255)) * amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export const AvatarRenderer: React.FC<AvatarRendererProps> = ({
  config,
  size = 140,
  className = '',
  showBackdrop = true,
}) => {
  const uid = useId().replace(/:/g, '');
  const primaryLight = lightenHex(config.primaryColor, 0.35);
  const primaryDark = darkenHex(config.primaryColor, 0.18);
  const outfitLight = lightenHex(config.outfitColor, 0.22);
  const outfitDark = darkenHex(config.outfitColor, 0.22);
  const bgLight = lightenHex(config.backdropColor, 0.22);
  const bgDark = darkenHex(config.backdropColor, 0.15);

  const isSide = config.angle === 'side';
  const isCelebrate = config.angle === 'celebrate';
  const props = config.equippedProps || [];

  const headShiftX = isSide ? 8 : 0;
  const bodyBounceY = isCelebrate ? -4 : 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 220 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      role="img"
      aria-label={`Avatar ${config.species}`}
    >
      <defs>
        <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="220" y2="220" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={bgLight} />
          <stop offset="100%" stopColor={bgDark} />
        </linearGradient>
        <radialGradient id={`skin-${uid}`} cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor={primaryLight} />
          <stop offset="60%" stopColor={config.primaryColor} />
          <stop offset="100%" stopColor={primaryDark} />
        </radialGradient>
        <radialGradient id={`outfit-${uid}`} cx="40%" cy="25%" r="75%">
          <stop offset="0%" stopColor={outfitLight} />
          <stop offset="65%" stopColor={config.outfitColor} />
          <stop offset="100%" stopColor={outfitDark} />
        </radialGradient>
        <radialGradient id={`bubble-${uid}`} cx="35%" cy="25%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.65" />
          <stop offset="55%" stopColor="#BAE6FD" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.35" />
        </radialGradient>
        <filter id={`shadow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#0F172A" floodOpacity="0.18" />
        </filter>
      </defs>

      {showBackdrop && (
        <rect x="4" y="4" width="212" height="212" rx="44" fill={`url(#bg-${uid})`} />
      )}

      {/* Ground shadow */}
      <ellipse cx="110" cy="196" rx="52" ry="10" fill="#0F172A" fillOpacity="0.16" />

      <g transform={`translate(0, ${bodyBounceY})`} filter={`url(#shadow-${uid})`}>
        {/* Fox Tail (Raposa) */}
        {config.species === 'raposa' && (
          <g transform={isSide ? 'translate(-22, 0)' : ''}>
            <path
              d="M72 158C38 158 26 130 42 108C54 92 74 112 76 138Z"
              fill={`url(#skin-${uid})`}
            />
            <path
              d="M42 108C48 100 57 104 61 112C53 116 47 117 42 108Z"
              fill="#FFF9F5"
            />
          </g>
        )}

        {/* Octopus Tentacles (Polvinho) */}
        {config.species === 'polvinho' && (
          <g>
            <ellipse cx="82" cy="176" rx="14" ry="10" fill={`url(#skin-${uid})`} />
            <ellipse cx="138" cy="176" rx="14" ry="10" fill={`url(#skin-${uid})`} />
          </g>
        )}

        {/* Arms */}
        <g>
          <path
            d={
              isCelebrate
                ? 'M72 132C52 114 48 96 58 88C66 82 78 96 82 122Z'
                : 'M74 128C56 136 52 154 62 160C70 164 80 150 82 136Z'
            }
            fill={`url(#skin-${uid})`}
          />
          <path
            d={
              isCelebrate
                ? 'M148 132C168 114 172 96 162 88C154 82 142 96 138 122Z'
                : 'M146 128C164 136 168 154 158 160C150 164 140 150 138 136Z'
            }
            fill={`url(#skin-${uid})`}
          />
        </g>

        {/* Legs / Shoes */}
        <g>
          <rect x="82" y="164" width="22" height="24" rx="11" fill={outfitDark} />
          <rect x="116" y="164" width="22" height="24" rx="11" fill={outfitDark} />
          <ellipse cx="93" cy="187" rx="14" ry="8" fill="#FFFFFF" />
          <ellipse cx="127" cy="187" rx="14" ry="8" fill="#FFFFFF" />
        </g>

        {/* Torso / Outfit */}
        <rect x="74" y="118" width="72" height="54" rx="28" fill={`url(#outfit-${uid})`} />
        {/* Outfit highlight / overalls / collar details */}
        {config.species === 'raposa' ? (
          <g>
            <rect x="84" y="118" width="52" height="16" rx="8" fill="#FFFFFF" fillOpacity="0.92" />
            <rect x="86" y="120" width="8" height="26" rx="4" fill={outfitDark} />
            <rect x="126" y="120" width="8" height="26" rx="4" fill={outfitDark} />
            <circle cx="90" cy="140" r="2.6" fill="#FDE68A" />
            <circle cx="130" cy="140" r="2.6" fill="#FDE68A" />
          </g>
        ) : config.species === 'porquinho' ? (
          <g>
            <path d="M98 123L110 129L122 123L118 134L110 130L102 134Z" fill="#F472B6" />
            <circle cx="110" cy="129" r="3.5" fill="#EC4899" />
          </g>
        ) : config.species === 'sapinho' ? (
          <rect x="78" y="138" width="64" height="10" rx="5" fill="#FB923C" fillOpacity="0.85" />
        ) : (
          <circle cx="110" cy="142" r="10" fill="#FFFFFF" fillOpacity="0.28" />
        )}

        {/* Prop: Crossbody Bag (Bolsa Tiracolo) */}
        {props.includes('bolsa') && (
          <g>
            <path d="M84 120L136 164" stroke="#F59E0B" strokeWidth="5" strokeLinecap="round" />
            <rect x="126" y="148" width="20" height="18" rx="6" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5" />
            <circle cx="136" cy="155" r="2.5" fill="#92400E" />
          </g>
        )}

        {/* HEAD GROUP */}
        <g transform={`translate(${headShiftX}, 0)`}>
          {/* Ears by species */}
          {config.species === 'raposa' && (
            <g>
              <path d="M62 72L56 30L94 52Z" fill={`url(#skin-${uid})`} />
              <path d="M66 64L62 40L86 54Z" fill="#FDE6D8" />
              <path d="M158 72L164 30L126 52Z" fill={`url(#skin-${uid})`} />
              <path d="M154 64L158 40L134 54Z" fill="#FDE6D8" />
            </g>
          )}

          {config.species === 'porquinho' && (
            <g>
              <ellipse cx="66" cy="56" rx="16" ry="13" transform="rotate(-24 66 56)" fill={`url(#skin-${uid})`} />
              <ellipse cx="67" cy="57" rx="9" ry="7" transform="rotate(-24 67 57)" fill="#FDA4AF" />
              <ellipse cx="154" cy="56" rx="16" ry="13" transform="rotate(24 154 56)" fill={`url(#skin-${uid})`} />
              <ellipse cx="153" cy="57" rx="9" ry="7" transform="rotate(24 153 57)" fill="#FDA4AF" />
            </g>
          )}

          {config.species === 'sapinho' && (
            <g>
              <circle cx="76" cy="50" r="18" fill={`url(#skin-${uid})`} />
              <circle cx="144" cy="50" r="18" fill={`url(#skin-${uid})`} />
            </g>
          )}

          {config.species === 'cachorrinho' && (
            <g>
              <ellipse cx="55" cy="88" rx="14" ry="28" transform="rotate(14 55 88)" fill={primaryDark} />
              <ellipse cx="165" cy="88" rx="14" ry="28" transform="rotate(-14 165 88)" fill={primaryDark} />
            </g>
          )}

          {config.species === 'ursinho' && (
            <g>
              <circle cx="68" cy="48" r="16" fill={`url(#skin-${uid})`} />
              <circle cx="68" cy="49" r="8" fill="#CBD5E1" />
              <circle cx="152" cy="48" r="16" fill={`url(#skin-${uid})`} />
              <circle cx="152" cy="49" r="8" fill="#CBD5E1" />
            </g>
          )}

          {/* Main Head Sphere */}
          <rect x="58" y="42" width="104" height="86" rx="43" fill={`url(#skin-${uid})`} />

          {/* Soft 3D vinyl forehead highlight */}
          <ellipse cx="94" cy="60" rx="26" ry="12" fill="#FFFFFF" fillOpacity="0.28" transform="rotate(-12 94 60)" />

          {/* Fox cheek markings */}
          {config.species === 'raposa' && (
            <path
              d="M60 95C60 115 80 128 110 128C140 128 160 115 160 95C146 95 136 105 110 105C84 105 74 95 60 95Z"
              fill="#FFF8F3"
              fillOpacity="0.92"
            />
          )}

          {/* Rosy Cheeks */}
          <ellipse cx="77" cy="96" rx="10" ry="6" fill="#FB7185" fillOpacity="0.38" />
          <ellipse cx="143" cy="96" rx="10" ry="6" fill="#FB7185" fillOpacity="0.38" />

          {/* Eyes */}
          <g>
            {config.expression === 'proud' ? (
              <>
                <path d="M80 82C83 76 91 76 94 82" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
                <path d="M126 82C129 76 137 76 140 82" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
              </>
            ) : (
              <>
                <circle cx="87" cy="82" r="6.5" fill="#1E293B" />
                <circle cx="85" cy="79.5" r="2.2" fill="#FFFFFF" />
                <circle cx="133" cy="82" r="6.5" fill="#1E293B" />
                <circle cx="131" cy="79.5" r="2.2" fill="#FFFFFF" />
              </>
            )}
          </g>

          {/* Snouts / Noses / Mouths */}
          {config.species === 'porquinho' ? (
            <g>
              <ellipse cx="110" cy="93" rx="18" ry="12" fill="#FB7185" fillOpacity="0.8" />
              <circle cx="104" cy="93" r="3" fill="#881337" />
              <circle cx="116" cy="93" r="3" fill="#881337" />
              <path d="M104 111C107 115 113 115 116 111" stroke="#881337" strokeWidth="2.8" strokeLinecap="round" />
            </g>
          ) : config.species === 'polvinho' ? (
            <g>
              <ellipse cx="110" cy="97" rx="11" ry="8" fill="#FB7185" />
              <ellipse cx="110" cy="97" rx="5" ry="4" fill="#881337" />
            </g>
          ) : config.species === 'sapinho' ? (
            <g>
              <circle cx="105" cy="89" r="1.5" fill="#365314" />
              <circle cx="115" cy="89" r="1.5" fill="#365314" />
              <path d="M98 103C104 110 116 110 122 103" stroke="#365314" strokeWidth="3" strokeLinecap="round" />
            </g>
          ) : (
            <g>
              <ellipse cx="110" cy="96" rx="14" ry="10" fill="#FFFDF9" fillOpacity="0.88" />
              <ellipse cx="110" cy="91" rx="6" ry="4.2" fill="#1E293B" />
              <path d="M104 100C107 104 113 104 116 100" stroke="#1E293B" strokeWidth="2.6" strokeLinecap="round" />
            </g>
          )}

          {/* Octopus Translucent Bubble Helmet */}
          {config.species === 'polvinho' && (
            <circle
              cx="110"
              cy="84"
              r="58"
              fill={`url(#bubble-${uid})`}
              stroke="#E0F2FE"
              strokeWidth="2.5"
            />
          )}

          {/* Prop: Óculos Tech */}
          {props.includes('oculos') && (
            <g>
              <rect x="70" y="72" width="34" height="20" rx="8" fill="#10B981" fillOpacity="0.28" stroke="#047857" strokeWidth="3" />
              <rect x="116" y="72" width="34" height="20" rx="8" fill="#10B981" fillOpacity="0.28" stroke="#047857" strokeWidth="3" />
              <path d="M104 82H116" stroke="#047857" strokeWidth="3" />
            </g>
          )}

          {/* Prop: Fones Studio */}
          {props.includes('fones') && (
            <g>
              <path
                d="M55 84C55 44 78 28 110 28C142 28 165 44 165 84"
                stroke="#6366F1"
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
              />
              <rect x="46" y="68" width="16" height="32" rx="8" fill="#4F46E5" />
              <rect x="158" y="68" width="16" height="32" rx="8" fill="#4F46E5" />
            </g>
          )}

          {/* Prop: Broto EcoTech */}
          {props.includes('broto') && (
            <g transform="translate(110, 38)">
              <path d="M0 6V-10" stroke="#15803D" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M0 -4C-12 -6 -16 -16 -10 -20C-2 -22 2 -12 0 -4Z" fill="#4ADE80" />
              <path d="M0 -6C12 -8 16 -18 10 -22C2 -24 -2 -14 0 -6Z" fill="#22C55E" />
            </g>
          )}

          {/* Prop: Chapéu Melancia */}
          {props.includes('melancia') && (
            <g transform="translate(110, 42)">
              <path d="M-28 4C-24 -18 24 -18 28 4Z" fill="#16A34A" />
              <path d="M-23 2C-20 -13 20 -13 23 2Z" fill="#FB7185" />
              <circle cx="-8" cy="-4" r="1.6" fill="#1E293B" />
              <circle cx="0" cy="-7" r="1.6" fill="#1E293B" />
              <circle cx="8" cy="-4" r="1.6" fill="#1E293B" />
            </g>
          )}

          {/* Prop: Coroa Guardião */}
          {props.includes('coroa') && (
            <g transform="translate(110, 36)">
              <path
                d="M-22 6L-24 -12L-10 -2L0 -16L10 -2L24 -12L22 6Z"
                fill="#FBBF24"
                stroke="#D97706"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx="0" cy="-2" r="3" fill="#10B981" />
            </g>
          )}
        </g>

        {/* Prop: Caranguejo Amigo (Companion) */}
        {props.includes('caranguejo') && (
          <g transform="translate(162, 162)">
            <ellipse cx="18" cy="18" rx="15" ry="10" fill="#EF4444" />
            <circle cx="12" cy="11" r="3.5" fill="#FFFFFF" />
            <circle cx="24" cy="11" r="3.5" fill="#FFFFFF" />
            <circle cx="12" cy="11" r="1.6" fill="#1E293B" />
            <circle cx="24" cy="11" r="1.6" fill="#1E293B" />
            <path d="M5 14C0 8 4 3 9 8" stroke="#DC2626" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M31 14C36 8 32 3 27 8" stroke="#DC2626" strokeWidth="3.5" strokeLinecap="round" />
          </g>
        )}

        {/* Prop: Passarinho Azul (Companion) */}
        {props.includes('passarinho') && (
          <g transform="translate(24, 48)">
            <ellipse cx="18" cy="16" rx="13" ry="11" fill="#38BDF8" />
            <path d="M29 14L36 16L29 19Z" fill="#F59E0B" />
            <circle cx="22" cy="13" r="2.2" fill="#0F172A" />
            <path d="M8 14C2 8 10 4 15 11" fill="#0284C7" />
          </g>
        )}
      </g>
    </svg>
  );
};
