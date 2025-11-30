export type ViewMode = 'list' | 'grid' | 'calendar';
export type AppView = 'home' | 'editor' | 'stats' | 'settings' | 'favorites';

export interface Entry {
  id: string;
  title: string;
  content: string;
  date: number; // timestamp
  updatedAt: number;
  mood: string; // emoji
  tags: string[];
  category: string;
  isFavorite: boolean;
  isPrivate: boolean;
  images: string[]; // Base64 strings
  audio?: string; // Base64 string
  drawing?: string; // Base64 string
  location?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  securityEnabled: boolean;
  pin: string | null;
  biometricsEnabled: boolean;
  dailyReminder: boolean;
  reminderTime: string;
  viewMode: ViewMode;
}

export const MOODS = [
  { emoji: '😄', label: 'Feliz', value: 5 },
  { emoji: '😌', label: 'Calmo', value: 4 },
  { emoji: '😐', label: 'Neutro', value: 3 },
  { emoji: '😔', label: 'Triste', value: 2 },
  { emoji: '😠', label: 'Irritado', value: 1 },
];

export const CATEGORIES = ['Pessoal', 'Trabalho', 'Estudos', 'Viagem', 'Sonhos', 'Saúde'];
