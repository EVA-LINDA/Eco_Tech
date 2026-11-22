export type WasteCategoryId =
  | 'pilhas'
  | 'celulares'
  | 'computadores'
  | 'monitores'
  | 'eletrodomesticos'
  | 'lampadas';

export type AvatarSpeciesId =
  | 'raposa'
  | 'porquinho'
  | 'sapinho'
  | 'polvinho'
  | 'cachorrinho'
  | 'ursinho';

export type AvatarPropId =
  | 'fones'
  | 'caranguejo'
  | 'melancia'
  | 'broto'
  | 'bolsa'
  | 'passarinho'
  | 'oculos'
  | 'coroa';

export type AvatarAngle = 'front' | 'side' | 'celebrate';
export type AvatarExpression = 'happy' | 'curious' | 'proud';

export interface AvatarConfig {
  species: AvatarSpeciesId;
  primaryColor: string;
  outfitColor: string;
  backdropColor: string;
  angle: AvatarAngle;
  expression: AvatarExpression;
  equippedProps: AvatarPropId[];
}

export interface AvatarSpeciesMeta {
  id: AvatarSpeciesId;
  name: string;
  codename: string;
  subtitle: string;
  description: string;
  defaultPrimary: string;
  defaultOutfit: string;
  defaultBackdrop: string;
  costCoins: number;
  unlockRequirement?: string;
}

export interface AvatarPropMeta {
  id: AvatarPropId;
  name: string;
  category: 'Acessório' | 'Companheiro' | 'Eco Item';
  description: string;
  costCoins: number;
  milestoneHint?: string;
}

export interface CollectionPoint {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  hours: string;
  distanceKm: number;
  coinsPerKg: number;
  acceptedCategories: WasteCategoryId[];
  mapX: number;
  mapY: number;
  verifiedPartner: boolean;
  rating: number;
}

export interface DropOffRecord {
  id: string;
  pointId: string;
  pointName: string;
  category: WasteCategoryId;
  weightKg: number;
  coinsEarned: number;
  xpEarned: number;
  createdAt: string;
  code: string;
}

export interface CouponOffer {
  id: string;
  brand: string;
  shortCode: string;
  discountLabel: string;
  description: string;
  costCoins: number;
  category: string;
  accentBg: string;
  validDays: number;
}

export interface RedeemedCoupon {
  id: string;
  offerId: string;
  brand: string;
  discountLabel: string;
  promoCode: string;
  redeemedAt: string;
  expiresAt: string;
}

export interface QuizQuestion {
  id: string;
  level: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  coinsReward: number;
}

export interface FriendProfile {
  id: string;
  name: string;
  city: string;
  level: number;
  kgRecycled: number;
  avatar: AvatarConfig;
  isFriend: boolean;
  invitedToTeam: boolean;
}

export interface GroupChallengeState {
  teamName: string;
  teamCreated: boolean;
  missionTitle: string;
  missionGoal: number;
  missionProgress: number;
  rewardCoins: number;
  rewardClaimed: boolean;
  members: string[];
  contributions: {
    id: string;
    author: string;
    itemLabel: string;
    quantity: number;
    photoName?: string;
    createdAt: string;
  }[];
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  isAssistant?: boolean;
  text: string;
  createdAt: string;
  suggestedPointId?: string;
}

export interface ChatChannel {
  id: string;
  title: string;
  subtitle: string;
  type: 'assistant' | 'team' | 'friend';
  friendId?: string;
  unreadCount: number;
}

export interface NotificationItem {
  id: string;
  section: 'Hoje' | 'Esta semana' | 'Anteriores';
  title: string;
  body: string;
  timeLabel: string;
  read: boolean;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  useDeviceTheme?: boolean;
  language: 'pt-BR' | 'en-US';
  alwaysTranslate: boolean;
  fontSize: 'normal' | 'large';
  highContrast: boolean;
  reducedMotion: boolean;
  captions: boolean;
  dailyScreenLimitMin: number;
  screenBreakEnabled: boolean;
  privateAccount: boolean;
  syncAccount: boolean;
  allowFriendMessages: boolean;
  shareLocation: boolean;
  twoFactorEnabled: boolean;
  saveLoginInfo: boolean;
  securityAlerts: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  city: string;
  level: number;
  tier: 'Bronze' | 'Prata' | 'Ouro' | 'Esmeralda';
  xp: number;
  xpToNext: number;
  coins: number;
  deliveriesCount: number;
  kgRecycled: number;
  monthlyGoalKg: number;
  monthlyRecycledKg: number;
  accessCode: string;
  avatar: AvatarConfig;
  unlockedSpecies: AvatarSpeciesId[];
  unlockedProps: AvatarPropId[];
  joinedAt: string;
  totalToolMinutes: number;
  oneMonthCelebrated: boolean;
  platformDays?: number;
}

export interface AppState {
  authenticated: boolean;
  user: UserProfile;
  dropOffs: DropOffRecord[];
  redeemedCoupons: RedeemedCoupon[];
  completedQuizLevels: number[];
  quizScoreTotal: number;
  friends: FriendProfile[];
  groupChallenge: GroupChallengeState;
  channels: ChatChannel[];
  messages: ChatMessage[];
  notifications: NotificationItem[];
  settings: UserSettings;
  weeklyScreenMinutes: { day: string; minutes: number }[];
}

export type AppSection =
  | 'hub'
  | 'mapa'
  | 'avatar'
  | 'cupons'
  | 'quiz'
  | 'desafios'
  | 'chat'
  | 'config'
  | 'conta';
