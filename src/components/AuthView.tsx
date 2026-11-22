import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Delete,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  RefreshCw,
  ShieldCheck,
  User,
} from 'lucide-react';

interface AuthViewProps {
  onLogin: (email: string, password: string, demo?: boolean) => Promise<void>;
  onSendEmailCode: (payload: {
    email: string;
    flow: 'login' | 'register';
    name?: string;
    city?: string;
    password?: string;
  }) => Promise<{ email: string; mvpPreviewCode: string }>;
  onVerifyEmailCode: (email: string, code: string) => Promise<void>;
  onRecover: (email: string) => Promise<string>;
}

type AuthScreen = 'login' | 'register' | 'verify-code' | 'recover';

export const AuthView: React.FC<AuthViewProps> = ({
  onLogin,
  onSendEmailCode,
  onVerifyEmailCode,
  onRecover,
}) => {
  const [screen, setScreen] = useState<AuthScreen>('login');
  const [loginMethod, setLoginMethod] = useState<'code' | 'password'>('code');
  const [email, setEmail] = useState('rafael@ecotech.app');
  const [password, setPassword] = useState('ecotech123');
  const [name, setName] = useState('');
  const [city, setCity] = useState('Palmas, TO');

  const [pendingFlow, setPendingFlow] = useState<'login' | 'register'>('login');
  const [pendingEmail, setPendingEmail] = useState('');
  const [mvpPreviewCode, setMvpPreviewCode] = useState('');
  const [otpDigits, setOtpDigits] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitVerifyCode = async (codeToVerify: string) => {
    if (codeToVerify.length !== 6 || loading) return;
    setError(null);
    setLoading(true);
    try {
      await onVerifyEmailCode(pendingEmail, codeToVerify);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código inválido.');
    } finally {
      setLoading(false);
    }
  };

  // Physical keyboard support when on the keypad verification screen
  useEffect(() => {
    if (screen !== 'verify-code') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        setOtpDigits((prev) => (prev.length < 6 ? prev + e.key : prev));
      } else if (e.key === 'Backspace') {
        setOtpDigits((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter' && otpDigits.length === 6) {
        void submitVerifyCode(otpDigits);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, otpDigits, pendingEmail]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (loginMethod === 'password') {
        await onLogin(email, password);
      } else {
        const res = await onSendEmailCode({ email, flow: 'login' });
        setPendingFlow('login');
        setPendingEmail(res.email);
        setMvpPreviewCode(res.mvpPreviewCode);
        setOtpDigits('');
        setScreen('verify-code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await onSendEmailCode({
        email,
        flow: 'register',
        name,
        city,
        password,
      });
      setPendingFlow('register');
      setPendingEmail(res.email);
      setMvpPreviewCode(res.mvpPreviewCode);
      setOtpDigits('');
      setScreen('verify-code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await onSendEmailCode({
        email: pendingEmail,
        flow: pendingFlow,
        name: pendingFlow === 'register' ? name : undefined,
        city: pendingFlow === 'register' ? city : undefined,
        password: pendingFlow === 'register' ? password : undefined,
      });
      setMvpPreviewCode(res.mvpPreviewCode);
      setOtpDigits('');
      setMessage('Novo código enviado para o seu e-mail.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível reenviar.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const msg = await onRecover(email);
      setMessage(msg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao recuperar senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeypadPress = (digit: string) => {
    setError(null);
    setOtpDigits((prev) => (prev.length < 6 ? prev + digit : prev));
  };

  const handleKeypadBackspace = () => {
    setError(null);
    setOtpDigits((prev) => prev.slice(0, -1));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#A5F3EC] via-[#E6FAF5] to-[#BDF5E8] dark:from-[#062418] dark:via-[#0A2E20] dark:to-[#071D14] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl border border-emerald-900/10 dark:border-slate-800">
        {/* LEFT PANEL: Inspired by Panel 1 + Slogan + EcoTech Official Logo */}
        <div className="lg:col-span-6 relative overflow-hidden bg-gradient-to-br from-[#1C854F] via-[#0F693E] to-[#083F26] text-white p-8 sm:p-11 flex flex-col justify-between">
          {/* Botanical leaf silhouettes at bottom matching reference */}
          <svg
            viewBox="0 0 400 180"
            className="pointer-events-none absolute bottom-0 left-0 right-0 w-full opacity-20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M20 180 C25 110, 80 75, 115 95 C95 135, 65 160, 20 180 Z"
              fill="#FFFFFF"
            />
            <path
              d="M55 180 C70 130, 125 115, 145 140 C120 165, 90 175, 55 180 Z"
              fill="#A7F3D0"
            />
            <path
              d="M375 180 C360 105, 300 70, 265 98 C290 140, 325 165, 375 180 Z"
              fill="#FFFFFF"
            />
            <path
              d="M325 180 C315 125, 270 112, 248 135 C270 162, 295 174, 325 180 Z"
              fill="#A7F3D0"
            />
          </svg>

          <div className="relative z-10 flex flex-col items-center lg:items-start text-center lg:text-left">
            {/* Official EcoTech Logo uploaded by user */}
            <div className="inline-flex items-center gap-3.5">
              <img
                src="/assets/aistudio/ecotech_2b509258.png"
                alt="Logo EcoTech"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shadow-xl border border-white/20 bg-[#172B21]"
              />
              <div>
                <p className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Eco<span className="text-lime-300">Tech</span>
                </p>
              </div>
            </div>

            {/* Slogan Box inspired by uploaded slogan image */}
            <div className="mt-8 w-full rounded-3xl bg-gradient-to-br from-[#2B9348] via-[#1E7B3D] to-[#135A2B] border-2 border-white/30 shadow-2xl p-6 sm:p-7">
              <p className="font-display text-2xl sm:text-[28px] font-extrabold tracking-tight leading-tight text-white uppercase">
                PENSAR NO FUTURO É AGIR NO AGORA!
              </p>
              <p className="mt-3 text-emerald-50/95 text-sm leading-relaxed">
                Encontre ecopontos específicos para cada eletrônico, valide sua conta por e-mail, acumule EcoCoins, monte seu avatar 3D e resgate descontos reais.
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-8 grid grid-cols-2 gap-3 border-t border-white/20 pt-5 text-center lg:text-left">
            <div>
              <p className="font-display text-xl font-extrabold tabular-nums">6+</p>
              <p className="text-xs text-emerald-100">Tipos de e-lixo</p>
            </div>
            <div>
              <p className="font-display text-xl font-extrabold tabular-nums">6</p>
              <p className="text-xs text-emerald-100">Avatares 3D</p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Based on Panel 2 (Clean Card) & Panel 3 (Keypad Verification) */}
        <div className="lg:col-span-6 flex flex-col justify-center bg-white dark:bg-slate-900">
          {screen === 'verify-code' ? (
            /* PANEL 3 STYLE: Email Code Verification with Numeric Keypad */
            <div className="flex flex-col h-full">
              <div className="bg-gradient-to-b from-[#66C91F] to-[#0F9D58] text-white px-6 py-6 sm:px-8 sm:py-7 text-center relative">
                <button
                  type="button"
                  onClick={() => {
                    setScreen(pendingFlow === 'register' ? 'register' : 'login');
                    setError(null);
                    setMessage(null);
                  }}
                  aria-label="Voltar"
                  className="absolute left-5 top-5 w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-white" />
                </button>

                <div className="w-14 h-14 mx-auto rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-7 h-7 text-white" />
                </div>

                <h2 className="font-display text-xl sm:text-2xl font-bold">
                  Valide seu código no e-mail
                </h2>
                <p className="text-xs sm:text-sm text-emerald-50 mt-1">
                  Digite os 6 dígitos enviados para{' '}
                  <span className="font-semibold underline">{pendingEmail}</span>
                </p>

                {/* 6 Dashed Digit Slots matching Panel 3 */}
                <div
                  className="mt-5 flex items-center justify-center gap-2 sm:gap-2.5"
                  aria-label="Código de 6 dígitos"
                >
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const ch = otpDigits[idx] || '';
                    const isActive = otpDigits.length === idx;
                    return (
                      <div
                        key={idx}
                        className={`w-10 h-12 sm:w-11 sm:h-13 rounded-xl flex items-center justify-center font-mono text-xl font-extrabold border-b-4 transition-all ${
                          ch
                            ? 'bg-white text-emerald-800 border-emerald-200 shadow-sm'
                            : isActive
                              ? 'bg-white/25 text-white border-white'
                              : 'bg-white/15 text-white/70 border-white/50'
                        }`}
                      >
                        {ch || '–'}
                      </div>
                    );
                  })}
                </div>

                {/* MVP Simulated Email Delivery Banner so user can test immediately */}
                {mvpPreviewCode && (
                  <div className="mt-4 mx-auto max-w-sm rounded-xl bg-slate-950/25 border border-white/25 px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 text-left">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-lime-200 font-bold">
                        E-mail MVP recebido
                      </p>
                      <p className="text-white font-medium truncate">
                        Seu código EcoTech:{' '}
                        <span className="font-mono font-extrabold tracking-widest text-lime-300">
                          {mvpPreviewCode}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setOtpDigits(mvpPreviewCode);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white text-emerald-800 font-bold text-[11px] hover:bg-emerald-50 cursor-pointer shrink-0"
                    >
                      Preencher
                    </button>
                  </div>
                )}
              </div>

              <div className="p-5 sm:p-6 bg-slate-100 dark:bg-slate-800/80 flex-1 flex flex-col justify-between gap-4">
                {error && (
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/50 px-3 py-2 rounded-xl text-center">
                    {error}
                  </p>
                )}
                {message && !error && (
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/50 px-3 py-2 rounded-xl text-center">
                    {message}
                  </p>
                )}

                {/* Numeric Keypad matching Panel 3 */}
                <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto w-full">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleKeypadPress(d)}
                      className="h-12 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-display text-lg font-bold shadow-sm border border-slate-200/80 dark:border-slate-700 cursor-pointer transition-colors active:scale-95"
                    >
                      {d}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleKeypadBackspace}
                    aria-label="Apagar dígito"
                    className="h-12 rounded-xl bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300/80 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="h-12 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-display text-lg font-bold shadow-sm border border-slate-200/80 dark:border-slate-700 cursor-pointer transition-colors active:scale-95"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    disabled={otpDigits.length !== 6 || loading}
                    onClick={() => void submitVerifyCode(otpDigits)}
                    className="h-12 rounded-xl bg-[#0F9D58] hover:bg-[#0C854A] disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold text-sm shadow-sm cursor-pointer transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    {loading ? '...' : 'OK'}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-4 text-xs pt-1">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleResendCode}
                    className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reenviar código
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* PANEL 2 STYLE: Clean Botanical Card with Login / Cadastre-se */
            <div className="p-7 sm:p-10 flex flex-col justify-center">
              {/* Top EcoTech Logo Emblem */}
              <div className="flex flex-col items-center text-center mb-5">
                <img
                  src="/assets/aistudio/ecotech_2b509258.png"
                  alt="Emblema EcoTech"
                  className="w-20 h-20 rounded-2xl object-cover shadow-md border border-emerald-900/15 dark:border-white/15 bg-[#192820] mb-3"
                />
                <h1 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  {screen === 'login' && 'Acesse sua conta EcoTech'}
                  {screen === 'register' && 'Crie sua conta EcoTech'}
                  {screen === 'recover' && 'Recuperação de senha'}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {screen === 'recover'
                    ? 'Informe seu e-mail para receber as instruções.'
                    : 'Com validação segura por código no seu e-mail'}
                </p>
              </div>

              {/* Login / Cadastre-se Switcher */}
              {screen !== 'recover' && (
                <div
                  role="tablist"
                  aria-label="Modo de acesso"
                  className="grid grid-cols-2 p-1 rounded-full bg-slate-100 dark:bg-slate-800 mb-5"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={screen === 'login'}
                    onClick={() => {
                      setScreen('login');
                      setError(null);
                      setMessage(null);
                    }}
                    className={`py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                      screen === 'login'
                        ? 'bg-[#65C51C] text-slate-950 shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={screen === 'register'}
                    onClick={() => {
                      setScreen('register');
                      setError(null);
                      setMessage(null);
                    }}
                    className={`py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                      screen === 'register'
                        ? 'bg-[#65C51C] text-slate-950 shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Cadastre-se
                  </button>
                </div>
              )}

              {error && (
                <p className="mb-4 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2.5 rounded-xl">
                  {error}
                </p>
              )}

              {/* LOGIN FORM */}
              {screen === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      Seu e-mail
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-emerald-600 absolute left-4 top-3.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 rounded-full border border-emerald-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#65C51C]"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>

                  {loginMethod === 'password' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                        Senha
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-emerald-600 absolute left-4 top-3.5" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-11 pr-4 py-2.5 rounded-full border border-emerald-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#65C51C]"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-6 rounded-full bg-gradient-to-r from-[#65C51C] to-[#0F9D58] hover:brightness-95 text-white font-bold text-sm shadow-md transition-all cursor-pointer min-h-[44px] disabled:opacity-60"
                  >
                    {loading
                      ? 'Processando...'
                      : loginMethod === 'code'
                        ? 'Enviar código no e-mail'
                        : 'Entrar com senha'}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setLoginMethod((m) => (m === 'code' ? 'password' : 'code'))
                      }
                      className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      {loginMethod === 'code'
                        ? 'Entrar usando senha'
                        : 'Entrar com código no e-mail'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScreen('recover');
                        setError(null);
                      }}
                      className="text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                    >
                      Esqueci a senha
                    </button>
                  </div>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                    </div>
                    <div className="relative flex justify-center text-[11px]">
                      <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-medium">
                        Ou continuar com
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onLogin('rafael@ecotech.app', 'ecotech123', true)}
                    className="w-full py-2.5 px-5 rounded-full border border-emerald-200 dark:border-slate-700 hover:bg-emerald-50/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer min-h-[42px] flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#0F9D58]" />
                    Entrar rápido como Rafael (Conta Demo)
                  </button>
                </form>
              )}

              {/* REGISTER FORM */}
              {screen === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Nome completo
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-emerald-600 absolute left-4 top-3" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-11 pr-4 py-2 rounded-full border border-emerald-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#65C51C]"
                        placeholder="Seu nome"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      E-mail (para validação)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-emerald-600 absolute left-4 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-2 rounded-full border border-emerald-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#65C51C]"
                        placeholder="voce@email.com"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Cidade
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-emerald-600 absolute left-4 top-3" />
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full pl-11 pr-4 py-2 rounded-full border border-emerald-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#65C51C]"
                          placeholder="Palmas, TO"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Senha (mín. 6)
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-emerald-600 absolute left-4 top-3" />
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-11 pr-4 py-2 rounded-full border border-emerald-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#65C51C]"
                          placeholder="••••••"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-6 rounded-full bg-gradient-to-r from-[#65C51C] to-[#0F9D58] hover:brightness-95 text-white font-bold text-sm shadow-md transition-all cursor-pointer min-h-[44px] mt-1"
                  >
                    {loading ? 'Enviando código...' : 'Cadastrar e validar e-mail'}
                  </button>
                </form>
              )}

              {/* RECOVER PASSWORD FORM */}
              {screen === 'recover' && (
                <form onSubmit={handleRecoverSubmit} className="space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      setScreen('login');
                      setMessage(null);
                      setError(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Voltar ao login
                  </button>

                  {message && (
                    <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-3.5 py-2.5 rounded-xl">
                      {message}
                    </p>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      E-mail cadastrado
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full border border-emerald-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#65C51C]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-6 rounded-full bg-gradient-to-r from-[#65C51C] to-[#0F9D58] text-white font-bold text-sm cursor-pointer min-h-[44px]"
                  >
                    {loading ? 'Enviando...' : 'Enviar instruções'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
