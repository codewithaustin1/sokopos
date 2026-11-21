# Full-Platform Dark Mode Architecture for SokoPoS

Adding cohesive **Light**, **Dim Retail Dark**, and **System (Auto-Detect)** theming across every SokoPoS surface—covering the POS terminal, operational modals, and public landing, pricing, and legal pages—with instant zero-flash startup and cross-device preference persistence.

## User Review & Critical Decisions

> [!IMPORTANT]
> All core scoping, mode, placement, and persistence decisions have been confirmed during discovery and govern this design:

- **Full-Platform Coverage**: Dark mode applies uniformly across the authenticated POS workspace, every operational modal/drawer, and all public pages (Landing & Sign-In, Pricing, Legal/FAQ).
- **Three-State Theme Support (`Light` · `Dark` · `System`)**: Users can pick explicit Light, explicit Dim Retail Dark, or System auto-detect synced in real time with `prefers-color-scheme`.
- **Ubiquitous Switcher Access**: Theme controls are surfaced in top headers (POS header and public navigation bars), inside the mobile slide drawer, and as a visual 3-option selector in Settings → Appearance.
- **Dual-Layer Persistence**: Preferences save immediately in local device storage for flicker-free first paint and synchronize to the signed-in user's Firestore profile so the setting follows merchants across devices.
- **Physical Print Preservation**: Thermal receipt paper previews and A4/receipt `@media print` outputs remain crisp white paper with high-contrast black ink regardless of screen theme.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms SokoPoS into a true dual-theme retail platform engineered for both sun-lit storefront counters and low-glare evening/night shifts across counters, tablets, and mobile browsers.
- **Target Audience / Persona**: Store owners, cashiers, inventory clerks, and prospective merchants browsing SokoPoS marketing, pricing, and documentation pages.
- **Key Value**: Reduces cashier eye strain during night and bar/hospitality shifts, matches modern OS appearance expectations automatically, and maintains consistent readability across data-dense tables, charts, and modals.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Zero-Flash Initial Load**: Before the application renders, an inline boot check resolves the saved preference (`light`, `dark`, or `system` + OS media query), applies the root theme class, updates the browser `theme-color` meta tag, and styles the initial splash screen to match.
2. **Public Pages & Onboarding Switch**: Visitors on the landing page, pricing comparison, or legal/FAQ pages can toggle or cycle between Light, Dark, and System right from the top navigation bar or mobile slide drawer; the entire page (hero, auth receipt card, bento showcases, comparison tables, footer, and embedded modals) transitions smoothly within 200ms.
3. **In-Terminal Quick Switch & Settings Configuration**: Authenticated staff and owners can switch themes directly from the POS header bar, inside the mobile navigation drawer, or via the expanded 3-card preview in Settings → Appearance.
4. **Cross-Device Sync**: Switching themes while signed in updates device storage instantly and asynchronously merges `themePreference` onto the user's cloud profile so logging in on another register restores the preferred lighting mode.

### Visual Identity & Theme

- **Aesthetic Direction**: High-contrast utility clarity in Light mode paired with **Dim Retail Midnight Slate** in Dark mode—engineered to prevent harsh blue-white glare without sacrificing numeric legibility or barcode contrast.
- **Color Palette & Surface Hierarchy**:
  - **Light Mode**: Off-white canvas (`#f4f7f6` / `#f8fafc`), crisp `#ffffff` structural cards, `#e2e8f0` hairline borders, `#0e1a2b` primary ink, `#4c5a6b` muted ink, and `#28a745` primary action green (or active retail domain accent).
  - **Dim Retail Dark Mode**: Deep midnight canvas (`#090d16`), `#0f172a` structural cards and sidebars, `#162033` elevated hover/popovers, `#1e293b` / `#334155` hairline borders, `#f8fafc` primary ink with slight optical weight/tracking compensation, `#94a3b8` secondary ink, and calibrated `#28a745` / `#34d399` emerald accents.
  - **Semantic Status Tints**: Alert, warning, info, and success banners pair readable translucent dark backgrounds (`*/15` or `950/40`) with crisp border hairlines and high-contrast foreground text (`-300`/`-400`)—never relying on hue alone.
- **Typography & Tabular Numerals**: Preserves the configured `Bricolage Grotesque` display + `Figtree` body + `JetBrains Mono` data font stack with `tabular-nums` on all prices, totals, stock counts, and charts.
- **Component Styling & Accessibility**:
  - Declares `@custom-variant dark (&:where(.dark, .dark *));` for predictable Tailwind v4 class-driven dark mode.
  - Replaces brittle global `!important` inversion rules and hardcoded light hex colors with semantic CSS variables and explicit `dark:*` surface/text/border pairs so white buttons, badges, and gradients retain proper contrast.
  - Interactive theme controls use `>= 40px` desktop / `>= 44px` mobile touch targets and clear `focus-visible` outlines.

### Interactive Feedback & Motion

- Smooth 150–200ms color and background settling (`prefers-reduced-motion` respected).
- Subtle toast confirmation when manually switching themes via quick actions, plus live OS indicator in Settings when `System` mode is active.

---

## 3. Key Product Decisions & Trade-Offs

- **Semantic CSS Variables + Explicit `dark:*` Pairs Over Global `!important` Overrides**
  - *Chosen Approach*: Audit and pair surfaces across public views, POS views, charts, and modals using CSS custom properties for public marketing sections and native Tailwind `dark:*` utilities for application components, removing conflicting `!important` overrides where they cause contrast collisions.
  - *Why*: Global `.bg-white !important` inversions break contrast inside colored badges, glass overlays, and white-text buttons; explicit pairing guarantees WCAG AA legibility everywhere.
  - *Alternatives Considered*: Keeping and extending CSS `!important` overrides—rejected due to frequent specificity collisions and broken modal/button readability.
- **Per-User Profile Persistence (`themePreference`) Over Tenant-Wide Lock**
  - *Chosen Approach*: Persist `themePreference` (`light | dark | system`) locally per terminal and sync it to the authenticated user's profile document in Firestore (`users/{uid}`), defaulting new devices to `system` (or preserving any existing saved choice).
  - *Why*: A night-shift cashier or mobile manager should be able to prefer dark mode without forcing sunlit front-counter terminals into dark mode, while owners still get cross-device sync on their profile.
  - *Alternatives Considered*: Storing dark mode solely on the `Business` tenant document—rejected because mixed lighting across branches/counters makes personal + device preference much more practical.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```text
┌───────────────────────────────────────────────────────────────────────┐
│  Pre-React Boot Layer                                                 │
│  • Reads device themePreference ('light' | 'dark' | 'system')         │
│  • Evaluates prefers-color-scheme & sets html.dark + theme-color      │
└───────────────────────────────┬───────────────────────────────────────┘
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│  Central Theme Engine (Application Context)                           │
│  • State: themeMode ('light' | 'dark' | 'system') + OS listener       │
│  • Derived: isDarkMode (boolean), activeLabel                         │
│  • Sync: localStorage (instant) <──► Firestore User Profile (async)   │
└───────┬──────────────────────────┬───────────────────────────┬────────┘
        │                          │                           │
        ▼                          ▼                           ▼
┌───────────────────┐    ┌──────────────────────┐    ┌──────────────────┐
│ Reusable Switcher │    │ Public Surface Layer │    │ POS & Modal Layer│
│ • POS Top Header  │    │ • Landing & Auth     │    │ • Header/Sidebar │
│ • Public Navbars  │    │ • Pricing & Legal    │    │ • Register/Stock │
│ • Mobile Drawer   │    │ • Showcase & Footer  │    │ • Charts/Tables  │
│ • Settings Cards  │    │ • Brand Logo Theme   │    │ • Print Receipts │
└───────────────────┘    └──────────────────────┘    └──────────────────┘
```

### Data Model & Persistence Flow

- **Theme Preference Values**: `'light' | 'dark' | 'system'` (backward-compatible migration from existing boolean storage keys).
- **Firestore User Profile Sync**:
  - Extend the `User` entity schema and user-profile validation rules with optional `themePreference` (`'light' | 'dark' | 'system'`).
  - When a verified Firebase user signs in, fetch/merge their stored `themePreference` if present (updating only if the user hasn't overridden it locally in the active session), and persist subsequent theme changes via structured Firestore error handling.
- **Surface Refactoring Strategy**:
  1. **Core Theme Engine & Switcher UI**: Upgrade theme context, boot script, global stylesheet tokens, brand logo reactive theme handling, and a reusable `ThemeSwitcher` control placed in POS header, public navbars, and mobile slide drawer + 3-card Appearance tab in Settings.
  2. **Public Pages**: Convert landing/sign-in CSS variables, pricing page, legal/FAQ pages, footer, and landing showcase widgets to react seamlessly to `html.dark`.
  3. **POS Core, Data Visualizations & Modals**: Audit and fix hardcoded light/hex backgrounds, borders, inputs, dropdowns, Recharts axis/tooltip styling, and all operational modals (`PaymentModal`, inventory/supplier/customer/staff/shift/super-admin/settings modals), while keeping thermal receipt previews white.
