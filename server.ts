import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  AVATAR_PROPS,
  AVATAR_SPECIES,
  COLLECTION_POINTS,
  COUPON_OFFERS,
  INITIAL_APP_STATE,
  QUIZ_QUESTIONS,
  WASTE_CATEGORIES,
} from './src/data/ecotechData';
import type {
  AppState,
  AvatarConfig,
  AvatarPropId,
  AvatarSpeciesId,
  WasteCategoryId,
} from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '.data');
const DB_FILE = path.join(DATA_DIR, 'ecotech-db.json');
const AUTH_FILE = path.join(DATA_DIR, 'ecotech-auth.json');

interface StoredCredential {
  name: string;
  city: string;
  passwordHash: string;
}

interface PendingEmailCode {
  code: string;
  expiresAt: number;
  attempts: number;
  flow: 'login' | 'register';
  name?: string;
  city?: string;
  passwordHash?: string;
}

const pendingEmailCodes = new Map<string, PendingEmailCode>();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function readCredentials(): Record<string, StoredCredential> {
  if (!fs.existsSync(AUTH_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) as Record<string, StoredCredential>;
  } catch {
    return {};
  }
}

function writeCredentials(creds: Record<string, StoredCredential>): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(AUTH_FILE, JSON.stringify(creds, null, 2), 'utf-8');
}

function withComputedDays(state: AppState): AppState {
  const joinedMs = new Date(state.user.joinedAt).getTime();
  state.user.platformDays = Math.max(0, Math.floor((Date.now() - joinedMs) / 86400000));
  return state;
}

function ensureDb(): AppState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_APP_STATE, null, 2), 'utf-8');
    return withComputedDays(structuredClone(INITIAL_APP_STATE));
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.user.joinedAt) {
      parsed.user.joinedAt = INITIAL_APP_STATE.user.joinedAt;
    }
    if (typeof parsed.user.totalToolMinutes !== 'number') {
      parsed.user.totalToolMinutes = INITIAL_APP_STATE.user.totalToolMinutes;
    }
    if (typeof parsed.user.oneMonthCelebrated !== 'boolean') {
      parsed.user.oneMonthCelebrated = false;
    }
    return withComputedDays(parsed);
  } catch {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_APP_STATE, null, 2), 'utf-8');
    return withComputedDays(structuredClone(INITIAL_APP_STATE));
  }
}

function saveDb(state: AppState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function computeTier(level: number): 'Bronze' | 'Prata' | 'Ouro' | 'Esmeralda' {
  if (level >= 30) return 'Esmeralda';
  if (level >= 20) return 'Ouro';
  if (level >= 10) return 'Prata';
  return 'Bronze';
}

function applyXpAndLevel(state: AppState, xpGained: number): void {
  const prevLevel = state.user.level;
  const prevTier = state.user.tier;
  state.user.xp += xpGained;
  while (state.user.xp >= state.user.xpToNext) {
    state.user.xp -= state.user.xpToNext;
    state.user.level += 1;
    state.user.xpToNext = Math.round(state.user.xpToNext * 1.12);
    state.user.tier = computeTier(state.user.level);
  }
  if (state.user.level > prevLevel) {
    const tierMsg = state.user.tier !== prevTier ? ` Você alcançou o elo ${state.user.tier}!` : '';
    state.notifications.unshift({
      id: `not-${Date.now()}-lvl-${state.user.level}`,
      section: 'Hoje',
      title: `Conquista: Nível ${state.user.level} alcançado!`,
      body: `Você evoluiu do nível ${prevLevel} para o nível ${state.user.level}.${tierMsg}`,
      timeLabel: 'Agora',
      read: false,
    });
  }
}

function checkMilestoneUnlocks(state: AppState): string[] {
  const unlockedMessages: string[] = [];

  if (state.user.deliveriesCount >= 3 && !state.user.unlockedSpecies.includes('sapinho')) {
    state.user.unlockedSpecies.push('sapinho');
    unlockedMessages.push('Avatar Sapinho Guagua desbloqueado por entregas!');
  }
  if (state.user.kgRecycled >= 10 && !state.user.unlockedSpecies.includes('polvinho')) {
    state.user.unlockedSpecies.push('polvinho');
    unlockedMessages.push('Avatar Polvinho Pearl desbloqueado por 10 kg reciclados!');
  }
  if (state.completedQuizLevels.includes(3) && !state.user.unlockedSpecies.includes('cachorrinho')) {
    state.user.unlockedSpecies.push('cachorrinho');
    unlockedMessages.push('Avatar Cachorrinho Seven desbloqueado pelo Quiz Nível 3!');
  }
  if (state.user.deliveriesCount >= 15 && !state.user.unlockedProps.includes('coroa')) {
    state.user.unlockedProps.push('coroa');
    unlockedMessages.push('Prop Coroa Guardião desbloqueada por 15 entregas!');
  }
  if (state.groupChallenge.rewardClaimed && !state.user.unlockedSpecies.includes('ursinho')) {
    state.user.unlockedSpecies.push('ursinho');
    unlockedMessages.push('Avatar Ursinho Polar desbloqueado pela Missão em Grupo!');
  }

  for (const msg of unlockedMessages) {
    state.notifications.unshift({
      id: `not-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      section: 'Hoje',
      title: 'Nova recompensa de Avatar!',
      body: msg,
      timeLabel: 'Agora',
      read: false,
    });
  }

  return unlockedMessages;
}

function buildSmartFallbackReply(prompt: string, state: AppState): { text: string; suggestedPointId?: string } {
  const lower = prompt.toLowerCase();

  const keywordMap: { keywords: string[]; category: WasteCategoryId; tip: string }[] = [
    {
      keywords: ['pilha', 'bateria', 'litio', 'lítio', 'power bank', 'carregador'],
      category: 'pilhas',
      tip: 'Guarde pilhas e baterias com os polos protegidos por fita isolante antes de levar ao ponto.',
    },
    {
      keywords: ['celular', 'smartphone', 'telefone', 'tablet', 'fone', 'ipad'],
      category: 'celulares',
      tip: 'Faça backup e restaure as configurações de fábrica antes do descarte.',
    },
    {
      keywords: ['notebook', 'computador', 'pc', 'teclado', 'mouse', 'cabo', 'placa', 'hdmi', 'usb'],
      category: 'computadores',
      tip: 'Cabos, periféricos e placas-mãe rendem +55 moedas bônus por descarte!',
    },
    {
      keywords: ['monitor', 'tv', 'televisão', 'televisao', 'tela', 'projetor'],
      category: 'monitores',
      tip: 'Monitores e TVs não devem ser quebrados; entregue inteiros para evitar liberação de substâncias.',
    },
    {
      keywords: ['microondas', 'micro-ondas', 'liquidificador', 'cafeteira', 'geladeira', 'secador', 'eletro'],
      category: 'eletrodomesticos',
      tip: 'Eletrodomésticos têm alto aproveitamento de cobre, aço e plásticos recicláveis.',
    },
    {
      keywords: ['lampada', 'lâmpada', 'led', 'fluorescente', 'reator'],
      category: 'lampadas',
      tip: 'Embale lâmpadas em papelão ou caixa original para transporte seguro até o ecoponto.',
    },
  ];

  for (const entry of keywordMap) {
    if (entry.keywords.some((k) => lower.includes(k))) {
      const catMeta = WASTE_CATEGORIES.find((c) => c.id === entry.category)!;
      return {
        suggestedPointId: entry.category,
        text: `Para ${catMeta.label}, abra o Mapa de Coleta em Palmas - TO e filtre por "${catMeta.label}" para ver os pontos reais mais próximos de você, traçar rota e ganhar +${catMeta.coinsBonus} moedas de bônus específico! Dica: ${entry.tip}`,
      };
    }
  }

  if (lower.includes('avatar') || lower.includes('boneco') || lower.includes('personagem')) {
    return {
      text: `Você tem ${state.user.coins} EcoCoins! No Estúdio de Avatar você pode personalizar cores, ângulos e equipar acessórios como Fones Studio, Caranguejo Amigo e Chapéu Melancia, além de desbloquear novos personagens como o Sapinho Guagua (250 moedas ou 3 entregas) e o Polvinho Pearl.`,
    };
  }

  if (lower.includes('cupom') || lower.includes('desconto') || lower.includes('moeda') || lower.includes('ponto')) {
    return {
      text: `Seu saldo atual é de ${state.user.coins} EcoCoins. Na aba Recompensas você pode trocar a partir de 300 moedas por cupons de desconto na Americanas, KaBuM!, Amazon, Mercado Livre, Magalu e EcoStore Tech!`,
    };
  }

  return {
    text: `Estou conectado ao mapa EcoTech! Me diga qual aparelho você quer descartar (ex: "bateria", "celular", "monitor", "cabos", "lâmpada") ou pergunte sobre cupons e avatares que eu te ajudo agora.`,
  };
}

async function generateAssistantReply(prompt: string, state: AppState): Promise<{ text: string; suggestedPointId?: string }> {
  const fallback = buildSmartFallbackReply(prompt, state);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return fallback;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const pointsSummary = COLLECTION_POINTS.map(
      (p) => `${p.id}: ${p.name} (${p.address}, ${p.distanceKm}km, aceita: ${p.acceptedCategories.join(', ')}, ${p.coinsPerKg} moedas/kg)`
    ).join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Você é o EcoBot, assistente integrado do aplicativo EcoTech de coleta gamificada de lixo eletrônico no Brasil.
Responda em português do Brasil, de forma objetiva, amigável e prática (máximo 3 frases curtas).
Saldo do usuário (${state.user.name}): ${state.user.coins} moedas, Nível ${state.user.level}, ${state.user.kgRecycled} kg reciclados.
Pontos de coleta disponíveis:\n${pointsSummary}

Pergunta do usuário: "${prompt}"`,
    });

    const text = response.text?.trim();
    if (!text) return fallback;
    return {
      text,
      suggestedPointId: fallback.suggestedPointId,
    };
  } catch {
    return fallback;
  }
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/maps-config', (_req, res) => {
    const apiKey =
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      '';
    res.json({ apiKey });
  });

  app.get('/api/state', (_req, res) => {
    const state = ensureDb();
    res.json(state);
  });

  app.post('/api/auth/send-code', (req, res) => {
    const { email, flow, name, city, password } = req.body as {
      email?: string;
      flow?: 'login' | 'register';
      name?: string;
      city?: string;
      password?: string;
    };

    const normalizedEmail = (email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Informe um endereço de e-mail válido.' });
    }

    const resolvedFlow: 'login' | 'register' = flow === 'register' ? 'register' : 'login';
    let passwordHash: string | undefined;

    if (resolvedFlow === 'register') {
      if (!name || name.trim().length < 2) {
        return res.status(400).json({ error: 'Informe seu nome completo para cadastrar.' });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Crie uma senha com pelo menos 6 caracteres.' });
      }
      passwordHash = hashPassword(password);
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    pendingEmailCodes.set(normalizedEmail, {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
      flow: resolvedFlow,
      name: name?.trim(),
      city: city?.trim() || 'Palmas, TO',
      passwordHash,
    });

    return res.json({
      ok: true,
      email: normalizedEmail,
      expiresInSeconds: 600,
      mvpPreviewCode: code,
    });
  });

  app.post('/api/auth/verify-code', (req, res) => {
    const { email, code } = req.body as { email?: string; code?: string };
    const normalizedEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();

    if (!/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({ error: 'Digite os 6 dígitos do código enviado.' });
    }

    const pending = pendingEmailCodes.get(normalizedEmail);
    if (!pending || pending.expiresAt < Date.now()) {
      pendingEmailCodes.delete(normalizedEmail);
      return res.status(400).json({
        error: 'Código expirado ou não encontrado. Solicite um novo código.',
      });
    }

    pending.attempts += 1;
    if (pending.attempts > 5) {
      pendingEmailCodes.delete(normalizedEmail);
      return res.status(429).json({
        error: 'Limite de tentativas excedido. Solicite um novo código.',
      });
    }

    const a = Buffer.from(cleanCode, 'utf8');
    const b = Buffer.from(pending.code, 'utf8');
    const matches = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!matches) {
      return res.status(400).json({
        error: 'Código incorreto. Confira os 6 dígitos enviados ao seu e-mail.',
      });
    }

    pendingEmailCodes.delete(normalizedEmail);
    const state = ensureDb();
    state.authenticated = true;

    if (pending.flow === 'register' && pending.name) {
      const creds = readCredentials();
      if (pending.passwordHash) {
        creds[normalizedEmail] = {
          name: pending.name,
          city: pending.city || 'Palmas, TO',
          passwordHash: pending.passwordHash,
        };
        writeCredentials(creds);
      }
      state.user.name = pending.name;
      state.user.email = normalizedEmail;
      state.user.city = pending.city || 'Palmas, TO';
      state.user.accessCode = `ECOTECH-${pending.name.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      state.user.joinedAt = new Date().toISOString();
      state.user.totalToolMinutes = 1;
      state.user.oneMonthCelebrated = false;
      state.notifications.unshift({
        id: `not-${Date.now()}-welcome`,
        section: 'Hoje',
        title: 'E-mail validado com sucesso!',
        body: `Bem-vindo(a) ao EcoTech, ${pending.name}! Comece reciclando eletrônicos em Palmas.`,
        timeLabel: 'Agora',
        read: false,
      });
    } else {
      const creds = readCredentials();
      const stored = creds[normalizedEmail];
      if (stored) {
        state.user.name = stored.name;
        state.user.city = stored.city;
        state.user.email = normalizedEmail;
      } else if (state.user.email.toLowerCase() !== normalizedEmail) {
        const displayName = normalizedEmail.split('@')[0].replace(/[._-]/g, ' ');
        state.user.email = normalizedEmail;
        if (!state.user.name) {
          state.user.name = displayName;
        }
      }
    }

    saveDb(state);
    return res.json({ ok: true, state: withComputedDays(state) });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password, demo } = req.body as {
      email?: string;
      password?: string;
      demo?: boolean;
    };
    const state = ensureDb();
    if (demo) {
      state.authenticated = true;
      saveDb(state);
      return res.json(withComputedDays(state));
    }
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail || normalizedEmail.length < 3) {
      return res.status(400).json({ error: 'Informe um e-mail válido para entrar.' });
    }
    const creds = readCredentials();
    const stored = creds[normalizedEmail];
    if (stored) {
      if (!password || !verifyPassword(password, stored.passwordHash)) {
        return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      }
      state.user.name = stored.name;
      state.user.city = stored.city;
    }
    state.authenticated = true;
    state.user.email = normalizedEmail;
    saveDb(state);
    return res.json(withComputedDays(state));
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, email, city, password } = req.body as {
      name?: string;
      email?: string;
      city?: string;
      password?: string;
    };
    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'Nome e e-mail são obrigatórios.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (password && password.length >= 6) {
      const creds = readCredentials();
      creds[normalizedEmail] = {
        name: name.trim(),
        city: city?.trim() || 'Palmas, TO',
        passwordHash: hashPassword(password),
      };
      writeCredentials(creds);
    }
    const state = ensureDb();
    state.authenticated = true;
    state.user.name = name.trim();
    state.user.email = normalizedEmail;
    state.user.city = city?.trim() || 'Palmas, TO';
    state.user.accessCode = `ECOTECH-${name.trim().slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    state.user.joinedAt = new Date().toISOString();
    state.user.totalToolMinutes = 1;
    state.user.oneMonthCelebrated = false;
    saveDb(state);
    return res.json(withComputedDays(state));
  });

  app.post('/api/auth/logout', (_req, res) => {
    const state = ensureDb();
    state.authenticated = false;
    saveDb(state);
    res.json(state);
  });

  app.post('/api/auth/recover', (req, res) => {
    const { email } = req.body as { email?: string };
    if (!email?.trim()) {
      return res.status(400).json({ error: 'Informe seu e-mail cadastrado.' });
    }
    return res.json({
      ok: true,
      message: `Instruções de recuperação enviadas para ${email.trim()}.`,
    });
  });

  app.post('/api/dropoffs', (req, res) => {
    const { pointId, pointName, pointNeighborhood, category, weightKg } = req.body as {
      pointId: string;
      pointName?: string;
      pointNeighborhood?: string;
      category: WasteCategoryId;
      weightKg: number;
    };
    const state = ensureDb();
    const knownPoint = COLLECTION_POINTS.find((p) => p.id === pointId);
    const cat = WASTE_CATEGORIES.find((c) => c.id === category);
    const parsedWeight = Number(weightKg);

    if (!pointId || !cat || !Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      return res.status(400).json({ error: 'Dados de descarte inválidos.' });
    }

    const resolvedName = knownPoint?.name || pointName?.trim() || 'Ponto EcoTech Palmas';
    const resolvedNeighborhood = knownPoint?.neighborhood || pointNeighborhood?.trim() || 'Palmas - TO';
    const coinsPerKg = knownPoint?.coinsPerKg || 42;

    const coinsEarned = Math.round(parsedWeight * coinsPerKg + cat.coinsBonus);
    const xpEarned = Math.round(parsedWeight * 35 + 40);

    const record = {
      id: `drp-${Date.now()}`,
      pointId,
      pointName: resolvedName,
      category,
      weightKg: Number(parsedWeight.toFixed(2)),
      coinsEarned,
      xpEarned,
      createdAt: new Date().toISOString(),
      code: `ECO-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    state.dropOffs.unshift(record);
    state.user.coins += coinsEarned;
    state.user.deliveriesCount += 1;
    state.user.kgRecycled = Number((state.user.kgRecycled + parsedWeight).toFixed(2));
    state.user.monthlyRecycledKg = Number((state.user.monthlyRecycledKg + parsedWeight).toFixed(2));
    applyXpAndLevel(state, xpEarned);

    const unlocks = checkMilestoneUnlocks(state);
    state.notifications.unshift({
      id: `not-${Date.now()}`,
      section: 'Hoje',
      title: `+${coinsEarned} EcoCoins pelo descarte em ${resolvedNeighborhood}`,
      body: `${parsedWeight.toFixed(1)} kg de ${cat.label} registrados com código ${record.code}.`,
      timeLabel: 'Agora',
      read: false,
    });

    saveDb(state);
    res.json({ state, record, unlocks });
  });

  app.post('/api/quiz/complete', (req, res) => {
    const { level, correctCount, totalQuestions } = req.body as {
      level: number;
      correctCount: number;
      totalQuestions: number;
    };
    const state = ensureDb();
    const questionMeta = QUIZ_QUESTIONS.find((q) => q.level === level);
    const baseCoins = questionMeta ? questionMeta.coinsReward : 45;
    const isFirstTime = !state.completedQuizLevels.includes(level);
    const coinsEarned = correctCount > 0 ? (isFirstTime ? baseCoins : Math.round(baseCoins * 0.4)) : 10;
    const xpEarned = correctCount * 35 + 15;

    if (isFirstTime && correctCount > 0) {
      state.completedQuizLevels.push(level);
      state.notifications.unshift({
        id: `not-${Date.now()}-quiz-${level}`,
        section: 'Hoje',
        title: `Conquista: Quiz Nível ${level} concluído!`,
        body: `Você acertou ${correctCount}/${totalQuestions} perguntas e ganhou +${coinsEarned} EcoCoins.`,
        timeLabel: 'Agora',
        read: false,
      });
    }
    state.quizScoreTotal += coinsEarned;
    state.user.coins += coinsEarned;
    applyXpAndLevel(state, xpEarned);
    const unlocks = checkMilestoneUnlocks(state);

    saveDb(state);
    res.json({ state, coinsEarned, xpEarned, totalQuestions, unlocks });
  });

  app.post('/api/rewards/redeem-coupon', (req, res) => {
    const { offerId } = req.body as { offerId: string };
    const state = ensureDb();
    const offer = COUPON_OFFERS.find((o) => o.id === offerId);
    if (!offer) {
      return res.status(404).json({ error: 'Cupom não encontrado.' });
    }
    if (state.user.coins < offer.costCoins) {
      return res.status(400).json({
        error: `Moedas insuficientes. Faltam ${offer.costCoins - state.user.coins} EcoCoins.`,
      });
    }

    state.user.coins -= offer.costCoins;
    const expires = new Date(Date.now() + offer.validDays * 86400 * 1000).toISOString();
    const redeemed = {
      id: `rcp-${Date.now()}`,
      offerId: offer.id,
      brand: offer.brand,
      discountLabel: offer.discountLabel,
      promoCode: `ECOTECH-${offer.brand.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      redeemedAt: new Date().toISOString(),
      expiresAt: expires,
    };
    state.redeemedCoupons.unshift(redeemed);
    state.notifications.unshift({
      id: `not-${Date.now()}`,
      section: 'Hoje',
      title: `Cupom ${offer.brand} resgatado!`,
      body: `Use o código ${redeemed.promoCode} para ${offer.discountLabel}.`,
      timeLabel: 'Agora',
      read: false,
    });

    saveDb(state);
    res.json({ state, redeemed });
  });

  app.post('/api/avatar/unlock', (req, res) => {
    const { type, id } = req.body as { type: 'species' | 'prop'; id: string };
    const state = ensureDb();

    if (type === 'species') {
      const spId = id as AvatarSpeciesId;
      const meta = AVATAR_SPECIES.find((s) => s.id === spId);
      if (!meta) return res.status(404).json({ error: 'Personagem não encontrado.' });
      if (state.user.unlockedSpecies.includes(spId)) {
        return res.json({ state });
      }
      if (state.user.coins < meta.costCoins) {
        return res.status(400).json({
          error: `Faltam ${meta.costCoins - state.user.coins} moedas para desbloquear ${meta.name}.`,
        });
      }
      state.user.coins -= meta.costCoins;
      state.user.unlockedSpecies.push(spId);
      state.user.avatar = {
        ...state.user.avatar,
        species: spId,
        primaryColor: meta.defaultPrimary,
        outfitColor: meta.defaultOutfit,
        backdropColor: meta.defaultBackdrop,
      };
      state.notifications.unshift({
        id: `not-${Date.now()}-sp-${spId}`,
        section: 'Hoje',
        title: `Recompensa desbloqueada: ${meta.name}!`,
        body: `Seu novo avatar ${meta.name} foi liberado e equipado no Estúdio.`,
        timeLabel: 'Agora',
        read: false,
      });
      saveDb(state);
      return res.json({ state });
    }

    const propId = id as AvatarPropId;
    const propMeta = AVATAR_PROPS.find((p) => p.id === propId);
    if (!propMeta) return res.status(404).json({ error: 'Acessório não encontrado.' });
    if (state.user.unlockedProps.includes(propId)) {
      return res.json({ state });
    }
    if (state.user.coins < propMeta.costCoins) {
      return res.status(400).json({
        error: `Faltam ${propMeta.costCoins - state.user.coins} moedas para desbloquear ${propMeta.name}.`,
      });
    }
    state.user.coins -= propMeta.costCoins;
    state.user.unlockedProps.push(propId);
    if (!state.user.avatar.equippedProps.includes(propId)) {
      state.user.avatar.equippedProps.push(propId);
    }
    state.notifications.unshift({
      id: `not-${Date.now()}-prop-${propId}`,
      section: 'Hoje',
      title: `Acessório desbloqueado: ${propMeta.name}!`,
      body: `Novo item "${propMeta.name}" equipado ao seu avatar EcoTech.`,
      timeLabel: 'Agora',
      read: false,
    });
    saveDb(state);
    return res.json({ state });
  });

  app.post('/api/avatar/save', (req, res) => {
    const { avatar } = req.body as { avatar: AvatarConfig };
    const state = ensureDb();
    if (!state.user.unlockedSpecies.includes(avatar.species)) {
      return res.status(403).json({ error: 'Personagem ainda não desbloqueado.' });
    }
    const validProps = avatar.equippedProps.filter((p) => state.user.unlockedProps.includes(p));
    state.user.avatar = {
      ...avatar,
      equippedProps: validProps,
    };
    saveDb(state);
    res.json({ state });
  });

  app.post('/api/challenges/team', (req, res) => {
    const { teamName, invitedIds } = req.body as { teamName: string; invitedIds?: string[] };
    const state = ensureDb();
    if (!teamName?.trim()) {
      return res.status(400).json({ error: 'Escolha um nome criativo para a equipe.' });
    }
    state.groupChallenge.teamName = teamName.trim();
    state.groupChallenge.teamCreated = true;
    const members = [state.user.name];
    state.friends.forEach((f) => {
      if (invitedIds?.includes(f.id) || f.invitedToTeam) {
        f.invitedToTeam = true;
        members.push(f.name);
      }
    });
    state.groupChallenge.members = Array.from(new Set(members));
    const teamChannel = state.channels.find((c) => c.id === 'ch-team');
    if (teamChannel) {
      teamChannel.title = `Time ${state.groupChallenge.teamName}`;
      teamChannel.subtitle = `${state.groupChallenge.members.length} membros · Missão ${state.groupChallenge.missionProgress}/${state.groupChallenge.missionGoal} itens`;
    }
    saveDb(state);
    res.json({ state });
  });

  app.post('/api/challenges/contribute', (req, res) => {
    const { itemLabel, quantity, photoName } = req.body as {
      itemLabel: string;
      quantity: number;
      photoName?: string;
    };
    const state = ensureDb();
    const qty = Math.max(1, Math.min(30, Number(quantity) || 1));
    if (!itemLabel?.trim()) {
      return res.status(400).json({ error: 'Descreva os itens reciclados para enviar.' });
    }

    state.groupChallenge.contributions.unshift({
      id: `ctr-${Date.now()}`,
      author: state.user.name,
      itemLabel: itemLabel.trim(),
      quantity: qty,
      photoName: photoName || 'registro-ecotech.jpg',
      createdAt: new Date().toISOString(),
    });
    state.groupChallenge.missionProgress = Math.min(
      state.groupChallenge.missionGoal,
      state.groupChallenge.missionProgress + qty
    );

    const coinsEarned = qty * 6;
    state.user.coins += coinsEarned;
    applyXpAndLevel(state, qty * 10);

    let missionJustCompleted = false;
    if (
      state.groupChallenge.missionProgress >= state.groupChallenge.missionGoal &&
      !state.groupChallenge.rewardClaimed
    ) {
      state.groupChallenge.rewardClaimed = true;
      state.user.coins += state.groupChallenge.rewardCoins;
      missionJustCompleted = true;
      state.notifications.unshift({
        id: `not-${Date.now()}-mission`,
        section: 'Hoje',
        title: 'Conquista em grupo: Missão concluída!',
        body: `O time ${state.groupChallenge.teamName} atingiu ${state.groupChallenge.missionGoal} itens reciclados (+${state.groupChallenge.rewardCoins} EcoCoins).`,
        timeLabel: 'Agora',
        read: false,
      });
    }

    const teamChannel = state.channels.find((c) => c.id === 'ch-team');
    if (teamChannel) {
      teamChannel.subtitle = `${state.groupChallenge.members.length} membros · Missão ${state.groupChallenge.missionProgress}/${state.groupChallenge.missionGoal} itens`;
    }

    state.messages.push({
      id: `msg-${Date.now()}`,
      channelId: 'ch-team',
      senderId: state.user.id,
      senderName: state.user.name,
      text: `Enviei +${qty} itens (${itemLabel.trim()}) para a missão do time! Progresso: ${state.groupChallenge.missionProgress}/${state.groupChallenge.missionGoal}.`,
      createdAt: new Date().toISOString(),
    });

    const unlocks = checkMilestoneUnlocks(state);
    saveDb(state);
    res.json({ state, coinsEarned, missionJustCompleted, unlocks });
  });

  app.post('/api/friends/toggle', (req, res) => {
    const { friendId, action } = req.body as { friendId: string; action: 'add' | 'invite' };
    const state = ensureDb();
    const friend = state.friends.find((f) => f.id === friendId);
    if (!friend) return res.status(404).json({ error: 'Usuário não encontrado.' });

    if (action === 'add') {
      friend.isFriend = !friend.isFriend;
      if (friend.isFriend && !state.channels.some((c) => c.friendId === friend.id)) {
        state.channels.push({
          id: `ch-${friend.id}`,
          title: friend.name,
          subtitle: `Nível ${friend.level} · ${friend.city}`,
          type: 'friend',
          friendId: friend.id,
          unreadCount: 0,
        });
      }
    } else if (action === 'invite') {
      friend.invitedToTeam = !friend.invitedToTeam;
      if (friend.invitedToTeam && !state.groupChallenge.members.includes(friend.name)) {
        state.groupChallenge.members.push(friend.name);
      } else if (!friend.invitedToTeam) {
        state.groupChallenge.members = state.groupChallenge.members.filter((m) => m !== friend.name);
      }
    }

    saveDb(state);
    res.json({ state });
  });

  app.post('/api/chat/message', async (req, res) => {
    const { channelId, text } = req.body as { channelId: string; text: string };
    const state = ensureDb();
    if (!text?.trim()) {
      return res.status(400).json({ error: 'Mensagem vazia.' });
    }

    const userMsg = {
      id: `msg-${Date.now()}`,
      channelId,
      senderId: state.user.id,
      senderName: state.user.name,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    state.messages.push(userMsg);

    const channel = state.channels.find((c) => c.id === channelId);
    if (channel) {
      channel.unreadCount = 0;
    }

    if (channelId === 'ch-assistant') {
      const reply = await generateAssistantReply(text.trim(), state);
      state.messages.push({
        id: `msg-${Date.now() + 1}`,
        channelId,
        senderId: 'bot-ecotech',
        senderName: 'EcoBot',
        isAssistant: true,
        text: reply.text,
        suggestedPointId: reply.suggestedPointId,
        createdAt: new Date().toISOString(),
      });
    } else if (channel?.type === 'friend' || channel?.type === 'team') {
      const responderName =
        channel.type === 'friend' ? channel.title : 'Júlia Nogueira';
      const responderId =
        channel.type === 'friend' && channel.friendId ? channel.friendId : 'fr-julia';
      const friendReply =
        text.toLowerCase().includes('onde') || text.toLowerCase().includes('ponto')
          ? 'Eu costumo levar no Ecoponto Paulista ou na Vila Mariana! Dá bastante bônus em moedas.'
          : text.toLowerCase().includes('avatar')
            ? 'Adorei seu avatar! Continua reciclando para liberar os acessórios novos no Estúdio.'
            : 'Boa! Vamos combinar a próxima entrega de eletrônicos da semana juntos.';

      state.messages.push({
        id: `msg-${Date.now() + 2}`,
        channelId,
        senderId: responderId,
        senderName: responderName,
        text: friendReply,
        createdAt: new Date().toISOString(),
      });
    }

    saveDb(state);
    res.json({ state });
  });

  app.post('/api/settings', (req, res) => {
    const { settings } = req.body as { settings: Partial<AppState['settings']> };
    const state = ensureDb();
    state.settings = {
      ...state.settings,
      ...settings,
    };
    saveDb(state);
    res.json({ state });
  });

  app.post('/api/usage/tick', (req, res) => {
    const { minutes } = req.body as { minutes?: number };
    const inc = Math.max(1, Math.min(10, Math.round(Number(minutes) || 1)));
    const state = ensureDb();
    state.user.totalToolMinutes = (state.user.totalToolMinutes || 0) + inc;
    const dayIdxMap = [6, 0, 1, 2, 3, 4, 5]; // JS getDay(): 0=Sun -> index 6 ('Dom')
    const idx = dayIdxMap[new Date().getDay()];
    if (state.weeklyScreenMinutes[idx]) {
      state.weeklyScreenMinutes[idx].minutes += inc;
    }
    saveDb(state);
    res.json({ state });
  });

  app.post('/api/usage/celebrate-month', (_req, res) => {
    const state = ensureDb();
    const joinedMs = new Date(state.user.joinedAt).getTime();
    const days = Math.max(0, Math.floor((Date.now() - joinedMs) / 86400000));
    if (days >= 30 && !state.user.oneMonthCelebrated) {
      state.user.oneMonthCelebrated = true;
      state.user.coins += 50;
      state.notifications.unshift({
        id: `not-${Date.now()}-1month`,
        section: 'Hoje',
        title: 'Conquista: 1 mês usando o EcoTech!',
        body: `Você completou ${days} dias na plataforma e ganhou +50 EcoCoins comemorativos!`,
        timeLabel: 'Agora',
        read: false,
      });
      saveDb(state);
    }
    res.json({ state, days });
  });

  app.post('/api/notifications/read', (req, res) => {
    const { id } = req.body as { id?: string };
    const state = ensureDb();
    if (!id) {
      return res.status(400).json({ error: 'ID da notificação é obrigatório.' });
    }
    state.notifications = state.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    saveDb(state);
    res.json({ state });
  });

  app.post('/api/notifications/read-all', (_req, res) => {
    const state = ensureDb();
    state.notifications = state.notifications.map((n) => ({ ...n, read: true }));
    saveDb(state);
    res.json({ state });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EcoTech server running on http://0.0.0.0:${PORT}`);
  });
}

createServer();
