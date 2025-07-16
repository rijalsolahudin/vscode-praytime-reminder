import * as fs from 'fs';
import * as path from 'path';

export interface Background {
  url: string;
  author: string;
  source: string;
}

export function getRandomBackground(): Background {
  const backgroundsPath = path.resolve(__dirname, '../assets/backgrounds.json');
  let backgrounds: Background[] = [];
  try {
    backgrounds = JSON.parse(fs.readFileSync(backgroundsPath, 'utf-8'));
    console.log('Loaded backgrounds:', backgrounds);
  } catch (e) {
    console.error('Failed to load backgrounds:', e);
    backgrounds = [{ url: '', author: '', source: '' }];
  }
  return backgrounds[Math.floor(Math.random() * backgrounds.length)];
}
