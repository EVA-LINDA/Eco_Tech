import React from 'react';

interface EcoLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  showSlogan?: boolean;
  onDark?: boolean;
}

export const EcoLogo: React.FC<EcoLogoProps> = ({
  size = 'md',
  showWordmark = true,
  showSlogan = false,
  onDark = false,
}) => {
  const imgSizeClass =
    size === 'sm'
      ? 'w-8 h-8 rounded-lg'
      : size === 'lg'
        ? 'w-14 h-14 rounded-2xl'
        : 'w-10 h-10 rounded-xl';

  return (
    <div className="inline-flex items-center gap-2.5 shrink-0 select-none">
      <img
        src="/assets/aistudio/ecotech_2b509258.png"
        alt="Logo EcoTech"
        className={`${imgSizeClass} object-cover shadow-sm border border-emerald-950/15 dark:border-white/15 bg-[#192820] shrink-0`}
      />
      {showWordmark && (
        <div className="min-w-0">
          <span
            className={`block font-display font-extrabold tracking-tight leading-none whitespace-nowrap ${
              size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg'
            } ${onDark ? 'text-white' : 'text-slate-900 dark:text-white'}`}
          >
            Eco<span className="text-[#558B0B] dark:text-[#E7F426]">Tech</span>
          </span>
          {showSlogan && (
            <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Pensar no futuro é agir no agora!
            </span>
          )}
        </div>
      )}
    </div>
  );
};

