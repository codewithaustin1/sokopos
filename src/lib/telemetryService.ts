import { auth } from './firebase';
import {
  PlatformTrafficCollectPayload,
  PlatformTrafficEventType,
  PlatformTrafficOverviewResponse,
  TrafficDeviceType,
} from '../types/traffic';

const SESSION_ID_KEY = 'sokopos_anon_sid_v1';
const ATTRIBUTION_KEY = 'sokopos_utm_attribution_v1';
const SEEN_DAYS_KEY = 'sokopos_seen_traffic_days_v1';
const MILESTONE_DEDUPE_KEY = 'sokopos_milestone_dedupe_v1';

interface StoredAttribution {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  referralCode: string;
  referrerHost: string;
  capturedAt: string;
}

function isBrowserEnv(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function detectAutomatedBrowser(): boolean {
  if (!isBrowserEnv()) return true;
  try {
    if ((navigator as any).webdriver) return true;
    const ua = (navigator.userAgent || '').toLowerCase();
    const botMarkers = [
      'googlebot',
      'bingbot',
      'slurp',
      'duckduckbot',
      'baiduspider',
      'yandexbot',
      'ahrefsbot',
      'semrushbot',
      'petalbot',
      'mj12bot',
      'bytespider',
      'facebookexternalhit',
      'twitterbot',
      'linkedinbot',
      'whatsapp',
      'headlesschrome',
      'phantomjs',
      'playwright',
      'puppeteer',
      'lighthouse',
      'pagespeed',
      'crawler',
      'spider',
    ];
    return botMarkers.some((marker) => ua.includes(marker));
  } catch {
    return false;
  }
}

export function detectDeviceType(): TrafficDeviceType {
  if (!isBrowserEnv()) return 'desktop';
  const width = window.innerWidth || 1280;
  const ua = (navigator.userAgent || '').toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua) || (width >= 768 && width < 1024 && 'ontouchstart' in window)) {
    return 'tablet';
  }
  if (width < 768 || /mobi|android|iphone|ipod/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

export function getAnonymousSessionId(): string {
  if (!isBrowserEnv()) return 'ssr-session';
  try {
    let sid = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sid) {
      sid =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_ID_KEY, sid);
    }
    return sid;
  } catch {
    return `ephemeral-${Date.now().toString(36)}`;
  }
}

function resolveAttribution(): StoredAttribution {
  const empty: StoredAttribution = {
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    utmContent: '',
    referralCode: '',
    referrerHost: 'direct',
    capturedAt: new Date().toISOString(),
  };
  if (!isBrowserEnv()) return empty;

  try {
    const existingRaw = sessionStorage.getItem(ATTRIBUTION_KEY);
    const existing: StoredAttribution | null = existingRaw ? JSON.parse(existingRaw) : null;

    const params = new URLSearchParams(window.location.search || '');
    const utmSource = (params.get('utm_source') || '').trim().slice(0, 80);
    const utmMedium = (params.get('utm_medium') || '').trim().slice(0, 80);
    const utmCampaign = (params.get('utm_campaign') || '').trim().slice(0, 80);
    const utmContent = (params.get('utm_content') || '').trim().slice(0, 80);
    const referralCode = (params.get('ref') || '').trim().toUpperCase().slice(0, 40);

    let referrerHost = existing?.referrerHost || 'direct';
    if (document.referrer) {
      try {
        const refUrl = new URL(document.referrer);
        if (refUrl.hostname && refUrl.hostname !== window.location.hostname) {
          referrerHost = refUrl.hostname.replace(/^www\./, '').slice(0, 120);
        }
      } catch {
        // ignore malformed referrer
      }
    }

    const merged: StoredAttribution = {
      utmSource: utmSource || existing?.utmSource || '',
      utmMedium: utmMedium || existing?.utmMedium || '',
      utmCampaign: utmCampaign || existing?.utmCampaign || '',
      utmContent: utmContent || existing?.utmContent || '',
      referralCode: referralCode || existing?.referralCode || '',
      referrerHost,
      capturedAt: existing?.capturedAt || new Date().toISOString(),
    };

    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return empty;
  }
}

function checkAndMarkSessionDay(): boolean {
  if (!isBrowserEnv()) return false;
  const todayKey = new Date().toISOString().slice(0, 10);
  try {
    const raw = sessionStorage.getItem(SEEN_DAYS_KEY);
    const seen: string[] = raw ? JSON.parse(raw) : [];
    if (seen.includes(todayKey)) {
      return false;
    }
    const next = [...seen.slice(-6), todayKey];
    sessionStorage.setItem(SEEN_DAYS_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

function shouldDedupeSessionMilestone(dedupeKey: string, ttlMs: number): boolean {
  if (!isBrowserEnv() || !dedupeKey) return false;
  try {
    const raw = sessionStorage.getItem(MILESTONE_DEDUPE_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    const last = map[dedupeKey];
    if (typeof last === 'number' && now - last < ttlMs) {
      return true;
    }
    map[dedupeKey] = now;
    // Keep bounded map size in sessionStorage
    const entries = Object.entries(map).slice(-40);
    sessionStorage.setItem(MILESTONE_DEDUPE_KEY, JSON.stringify(Object.fromEntries(entries)));
    return false;
  } catch {
    return false;
  }
}

export interface TrackPlatformEventOptions {
  path?: string;
  pageName?: string;
  tabName?: string;
  businessId?: string;
  businessName?: string;
  planId?: string;
  isDemo?: boolean;
  channel?: string;
  amountKes?: number;
  dedupeKey?: string;
  dedupeTtlMs?: number;
}

export function trackPlatformEvent(
  eventType: PlatformTrafficEventType,
  options: TrackPlatformEventOptions = {}
): void {
  if (!isBrowserEnv()) return;

  if (options.dedupeKey && shouldDedupeSessionMilestone(options.dedupeKey, options.dedupeTtlMs ?? 60_000)) {
    return;
  }

  try {
    const sessionId = getAnonymousSessionId();
    const isNewSessionToday = checkAndMarkSessionDay();
    const attr = resolveAttribution();
    const isAutomated = detectAutomatedBrowser();

    const payload: PlatformTrafficCollectPayload = {
      eventType,
      sessionId,
      isNewSessionToday,
      path: options.path ?? window.location.pathname,
      pageName: options.pageName,
      tabName: options.tabName,
      businessId: options.businessId,
      businessName: options.businessName,
      planId: options.planId,
      isDemo: options.isDemo,
      channel: options.channel,
      amountKes: options.amountKes,
      utmSource: attr.utmSource || undefined,
      utmMedium: attr.utmMedium || undefined,
      utmCampaign: attr.utmCampaign || undefined,
      utmContent: attr.utmContent || undefined,
      referralCode: attr.referralCode || undefined,
      referrerHost: attr.referrerHost,
      deviceType: detectDeviceType(),
      isAutomated,
    };

    const bodyStr = JSON.stringify(payload);

    // Prefer sendBeacon for unauthenticated/navigation events when available
    const currentUser = auth.currentUser;
    if (!currentUser && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([bodyStr], { type: 'application/json' });
      const sent = navigator.sendBeacon('/api/telemetry/collect', blob);
      if (sent) return;
    }

    // Non-blocking background fetch (keepalive survives tab navigation)
    (async () => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (currentUser) {
          const token = await currentUser.getIdToken().catch(() => '');
          if (token) headers.Authorization = `Bearer ${token}`;
        }
        await fetch('/api/telemetry/collect', {
          method: 'POST',
          headers,
          body: bodyStr,
          keepalive: true,
        });
      } catch {
        // Telemetry must never interrupt POS operations or public browsing
      }
    })();
  } catch {
    // Non-fatal
  }
}

export async function fetchPlatformTrafficOverview(
  rangeDays: 7 | 30 | 90 = 30,
  excludeDemo = true
): Promise<PlatformTrafficOverviewResponse> {
  const user = auth.currentUser;
  const idToken = user ? await user.getIdToken().catch(() => '') : '';

  const resp = await fetch(
    `/api/telemetry/overview?days=${rangeDays}&excludeDemo=${excludeDemo ? 'true' : 'false'}`,
    {
      method: 'GET',
      headers: {
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
    }
  );

  const data = await resp.json().catch(() => null);
  if (!resp.ok || !data) {
    throw new Error(data?.error || `Failed to load traffic overview (${resp.status})`);
  }

  return data as PlatformTrafficOverviewResponse;
}
