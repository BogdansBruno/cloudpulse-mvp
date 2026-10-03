// components/np/font.ts — Inter (variable, 100–900) for the v3 screens: numbers use 800.
import { Inter } from 'next/font/google';

export const npInter = Inter({ subsets: ['latin', 'latin-ext', 'cyrillic'], display: 'swap' });
