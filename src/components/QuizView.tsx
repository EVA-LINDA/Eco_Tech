import React, { useState } from 'react';
import { Award, CheckCircle2, Coins, RotateCcw, XCircle } from 'lucide-react';
import { QUIZ_QUESTIONS } from '../data/ecotechData';
import type { UserProfile } from '../types';
import { AvatarRenderer } from './AvatarRenderer';

interface QuizViewProps {
  user: UserProfile;
  completedLevels: number[];
  onCompleteQuiz: (
    level: number,
    correctCount: number,
    totalQuestions: number
  ) => Promise<{ coinsEarned: number; xpEarned: number; unlocks: string[] }>;
}

export const QuizView: React.FC<QuizViewProps> = ({
  user,
  completedLevels,
  onCompleteQuiz,
}) => {
  const [activeLevel, setActiveLevel] = useState<number>(1);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    coinsEarned: number;
    xpEarned: number;
    unlocks: string[];
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const currentQuestion =
    QUIZ_QUESTIONS.find((q) => q.level === activeLevel) || QUIZ_QUESTIONS[0];

  const handleSelectLevel = (lvl: number) => {
    setActiveLevel(lvl);
    setSelectedOption(null);
    setSubmitted(false);
    setResult(null);
  };

  const handleAnswer = async (idx: number) => {
    if (submitted || saving) return;
    setSelectedOption(idx);
    setSubmitted(true);
    setSaving(true);
    const isCorrect = idx === currentQuestion.correctIndex;
    try {
      const res = await onCompleteQuiz(activeLevel, isCorrect ? 1 : 0, 1);
      setResult(res);
    } finally {
      setSaving(false);
    }
  };

  const isCorrect = selectedOption === currentQuestion.correctIndex;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Quiz Ecológico EcoTech
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Complete os 5 níveis sobre reciclagem de eletrônicos para ganhar EcoCoins e desbloquear o Cachorrinho Seven no Nível 3.
          </p>
        </div>
        <div className="text-sm font-mono font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
          {completedLevels.length}/5 níveis concluídos
        </div>
      </div>

      {/* 5-Level Selector Path */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex items-center gap-3 overflow-x-auto">
        {QUIZ_QUESTIONS.map((q) => {
          const done = completedLevels.includes(q.level);
          const active = activeLevel === q.level;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => handleSelectLevel(q.level)}
              className={`flex-1 min-w-[110px] py-3 px-4 rounded-xl border text-left transition-colors cursor-pointer ${
                active
                  ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-sm text-slate-900 dark:text-white">
                  Nível {q.level}
                </span>
                {done && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </div>
              <p className="text-xs font-mono text-amber-600 dark:text-amber-400 mt-0.5 tabular-nums">
                +{q.coinsReward} moedas
              </p>
            </button>
          );
        })}
      </div>

      {/* Forest Canopy Quiz Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 bg-gradient-to-b from-[#1A5D3A] to-[#0E3E26] text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-emerald-200 font-medium mb-5">
              <span>Nível {currentQuestion.level} de 5</span>
              <span className="font-mono tabular-nums">Recompensa: +{currentQuestion.coinsReward} EcoCoins</span>
            </div>

            <div className="bg-[#F4F8EC] dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl p-6 shadow-inner">
              <h2 className="font-display text-lg sm:text-xl font-bold leading-snug text-balance">
                {currentQuestion.question}
              </h2>

              <div className="mt-5 space-y-2.5">
                {currentQuestion.options.map((opt, idx) => {
                  const letter = ['A', 'B', 'C', 'D'][idx];
                  const isThisSelected = selectedOption === idx;
                  const isThisCorrect = idx === currentQuestion.correctIndex;

                  let btnClass =
                    'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-800 dark:text-slate-100';
                  if (submitted) {
                    if (isThisCorrect) {
                      btnClass =
                        'bg-emerald-600 border-emerald-600 text-white font-semibold';
                    } else if (isThisSelected && !isThisCorrect) {
                      btnClass = 'bg-rose-600 border-rose-600 text-white';
                    } else {
                      btnClass =
                        'bg-white/60 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400';
                    }
                  }

                  return (
                    <button
                      key={letter}
                      type="button"
                      disabled={submitted}
                      onClick={() => handleAnswer(idx)}
                      className={`w-full p-3.5 rounded-xl border text-left text-sm flex items-center gap-3 transition-colors cursor-pointer min-h-[48px] ${btnClass}`}
                    >
                      <span className="w-7 h-7 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {letter}
                      </span>
                      <span className="flex-1">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Correto / Errado Feedback */}
              {submitted && (
                <div
                  className={`mt-5 rounded-xl p-4 border ${
                    isCorrect
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-display font-bold text-base">
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>Correto!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-rose-600" />
                        <span>Errado</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs mt-1.5 leading-relaxed">{currentQuestion.explanation}</p>
                </div>
              )}
            </div>
          </div>

          {submitted && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleSelectLevel(activeLevel)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold cursor-pointer min-h-[40px]"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Tentar novamente
              </button>
              {activeLevel < 5 && (
                <button
                  type="button"
                  onClick={() => handleSelectLevel(activeLevel + 1)}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold cursor-pointer min-h-[40px]"
                >
                  Próximo nível ({activeLevel + 1}/5)
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Result / Celebration Summary Card */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col items-center justify-center text-center space-y-4">
          <AvatarRenderer config={user.avatar} size={136} />
          {result ? (
            <>
              <div className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-display font-bold text-lg">
                <Award className="w-5 h-5" />
                Parabéns, {user.name.split(' ')[0]}!
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Você completou a rodada e somou recompensas na sua conta.
              </p>
              <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 flex items-center justify-around">
                <div>
                  <p className="text-xs text-slate-500">Moedas</p>
                  <p className="font-mono text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    +{result.coinsEarned}
                  </p>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                <div>
                  <p className="text-xs text-slate-500">XP</p>
                  <p className="font-mono text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    +{result.xpEarned}
                  </p>
                </div>
              </div>
              {result.unlocks.length > 0 && (
                <div className="w-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  {result.unlocks.join(' ')}
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="font-display font-bold text-slate-900 dark:text-white">
                Pronto para responder?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Cada questão respondida corretamente recompensa você com EcoCoins e experiência para subir de nível.
              </p>
              <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">
                <Coins className="w-4 h-4" />
                Saldo atual: {user.coins} moedas
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
