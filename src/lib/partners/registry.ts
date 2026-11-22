// src/lib/partners/registry.ts
// Registro central de conectores de financeiras

import { parcelexAdapter } from './parcelex';
import type { PartnerAdapter } from './types';

const ADAPTERS: Record<string, PartnerAdapter> = {
  parcelex: parcelexAdapter,
};

export function getAdapter(slug: string | null | undefined): PartnerAdapter | null {
  if (!slug) return null;
  return ADAPTERS[slug] ?? null;
}

export function listRegisteredSlugs(): string[] {
  return Object.keys(ADAPTERS);
}
