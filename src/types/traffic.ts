export type PlatformTrafficEventType =
  | 'page_view'
  | 'pricing_view'
  | 'demo_start'
  | 'signin_start'
  | 'signup_complete'
  | 'pos_session_start'
  | 'pos_tab_view'
  | 'pos_checkout'
  | 'subaccount_verified'
  | 'subscription_modal_open'
  | 'subscription_checkout_start'
  | 'subscription_activated';

export type TrafficDeviceType = 'mobile' | 'tablet' | 'desktop';

export interface PlatformTrafficCollectPayload {
  eventType: PlatformTrafficEventType;
  sessionId: string;
  isNewSessionToday?: boolean;
  path?: string;
  pageName?: string;
  tabName?: string;
  businessId?: string;
  businessName?: string;
  planId?: string;
  isDemo?: boolean;
  channel?: string;
  amountKes?: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  referralCode?: string;
  referrerHost?: string;
  deviceType: TrafficDeviceType;
  isAutomated?: boolean;
}

export interface PlatformTrafficMilestone {
  id: string;
  dateKey: string;
  timestamp: string;
  eventType: PlatformTrafficEventType;
  sessionId: string;
  businessId?: string;
  businessName?: string;
  isDemo?: boolean;
  utmSource?: string;
  utmCampaign?: string;
  referrerHost?: string;
  deviceType: TrafficDeviceType;
  channel?: string;
  planId?: string;
  amountKes?: number;
  pageName?: string;
}

export interface TrafficDailyPoint {
  dateKey: string;
  label: string;
  pageViews: number;
  uniqueSessions: number;
  landingViews: number;
  pricingViews: number;
  demoStarts: number;
  signInStarts: number;
  signUpsCompleted: number;
  activeStoresCount: number;
  posSessions: number;
  posCheckouts: number;
  posGmvKes: number;
  subscriptionModalOpens: number;
  subscriptionCheckouts: number;
  subscriptionActivations: number;
  subscriptionRevenueKes: number;
  botHitsBlocked: number;
}

export interface TrafficFunnelStep {
  id: string;
  label: string;
  count: number;
  rateFromPrevious: number;
  rateFromLanding: number;
}

export interface TrafficBreakdownRow {
  label: string;
  count: number;
  sharePercent: number;
  secondaryValue?: number;
}

export interface TrafficTenantActivityRow {
  businessId: string;
  businessName: string;
  plan: string;
  status: string;
  paystackVerified: boolean;
  posSessions: number;
  posCheckouts: number;
  posGmvKes: number;
  lastSeenDate: string;
}

export interface PlatformTrafficOverviewResponse {
  rangeDays: number;
  excludeDemo: boolean;
  generatedAt: string;
  firestoreSynced: boolean;
  totals: {
    pageViews: number;
    uniqueSessions: number;
    landingViews: number;
    pricingViews: number;
    demoStarts: number;
    signInStarts: number;
    signUpsCompleted: number;
    signupConversionRate: number;
    posSessions: number;
    activeStoresInRange: number;
    totalRegisteredStores: number;
    paidStoresCount: number;
    verifiedSubaccountsCount: number;
    posCheckouts: number;
    posGmvKes: number;
    subscriptionModalOpens: number;
    subscriptionCheckouts: number;
    subscriptionActivations: number;
    subscriptionRevenueKes: number;
    botHitsBlocked: number;
  };
  dailySeries: TrafficDailyPoint[];
  funnel: TrafficFunnelStep[];
  utmSources: TrafficBreakdownRow[];
  utmCampaigns: TrafficBreakdownRow[];
  referrers: TrafficBreakdownRow[];
  devices: TrafficBreakdownRow[];
  topPages: TrafficBreakdownRow[];
  posTabs: TrafficBreakdownRow[];
  checkoutChannels: TrafficBreakdownRow[];
  topStores: TrafficTenantActivityRow[];
  recentEvents: PlatformTrafficMilestone[];
}
