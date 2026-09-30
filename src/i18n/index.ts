import { useCallback } from 'react';
import { displayName } from '../model/faces';
import type { Lang } from '../model/types';
import { useSettings } from '../store/settings';
import { en } from './en';
import { es, type I18nKey } from './es';

const DICTS: Record<Lang, Record<I18nKey, string>> = { es, en };

export type TFn = (key: I18nKey, params?: Record<string, string | number>) => string;

export function translate(lang: Lang, key: I18nKey, params?: Record<string, string | number>): string {
  let s = DICTS[lang][key] ?? es[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export function useT(): TFn {
  const lang = useSettings((s) => s.lang);
  return useCallback((key, params) => translate(lang, key, params), [lang]);
}

export function useLang(): Lang {
  return useSettings((s) => s.lang);
}

/** Display name of a die or set in the current language. */
export function useName() {
  const lang = useLang();
  return useCallback((item: { name: string; names?: Partial<Record<Lang, string>> }) => displayName(item, lang), [lang]);
}

export type { I18nKey };
