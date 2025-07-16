import * as fs from 'fs';
import * as path from 'path';

export interface Quote {
  arabic: string;
  translation: string;
  source: string;
}

export function getRandomQuote(): Quote {
  const quotesPath = path.resolve(__dirname, '../assets/quotes.json');
  let quotes: Quote[] = [];
  try {
    quotes = JSON.parse(fs.readFileSync(quotesPath, 'utf-8'));
    console.log('Loaded quotes:', quotes);
  } catch (e) {
    console.error('Failed to load quotes:', e);
    quotes = [{ arabic: '', translation: '', source: '' }];
  }
  return quotes[Math.floor(Math.random() * quotes.length)];
}
