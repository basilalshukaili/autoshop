// ───────── BRAND PALETTE ─────────
// Refined, professional palette inspired by Linear / Vercel / Stripe Dashboard.
// The primary "C.O" key is preserved for backward compatibility with existing components,
// but its value is now indigo (the new brand) rather than the old playful orange.
export const C = {
  O:  '#6366F1',  // INDIGO — primary brand (was orange)
  B:  '#0EA5E9',  // sky — info
  P:  '#475569',  // slate-600 — neutral executive accent (was violet)
  G:  '#10B981',  // emerald — success
  PK: '#EC4899',  // pink
  GL: '#D97706',  // amber — warning (deeper, less playful)
  T:  '#0D9488',  // teal
  R:  '#EF4444',  // red — danger
};

// Brand-direction gradients & atmospheric layers (now indigo-based, refined)
export const GRAD = {
  brand:     'linear-gradient(135deg, #475569 0%, #334155 100%)',
  brandSoft: 'linear-gradient(135deg, rgba(99,102,241,.12) 0%, rgba(79,70,229,.03) 100%)',
  surface:   'linear-gradient(180deg, rgba(255,255,255,.025) 0%, rgba(255,255,255,0) 60%)',
  glow:      'radial-gradient(circle at top right, rgba(99,102,241,.10), transparent 60%)',
};

// 4-point spacing scale (use as numbers for inline styles)
export const S = { 0:0, 1:4, 2:8, 3:12, 4:16, 5:20, 6:24, 7:32, 8:40, 9:48, 10:56, 12:80 };

// Radius scale
export const R = { sm:6, md:10, lg:14, xl:20, '2xl':28, full:999 };

// Type scale (px)
export const FS = { xs:10, sm:11, base:12, md:13, lg:14, xl:16, '2xl':18, '3xl':22, '4xl':28, '5xl':36, '6xl':48 };

// Motion tokens — slightly slower for a more deliberate, premium feel
export const MOTION = {
  fast:   '140ms cubic-bezier(.4,0,.2,1)',
  base:   '220ms cubic-bezier(.4,0,.2,1)',
  slow:   '360ms cubic-bezier(.4,0,.2,1)',
  spring: '320ms cubic-bezier(.34,1.56,.64,1)',
};

// ───────── THEMES ─────────
// Dark = sophisticated deep slate (no warm tints). Light = refined off-white.
export const TH = {
  dark: {
    bg:        '#0A0E1A',
    // Almost imperceptible cool gradient — no playful colored glows
    bgPattern: `radial-gradient(ellipse 1400px 800px at 100% 0%, rgba(99,102,241,.05), transparent 60%),
                radial-gradient(ellipse 1000px 600px at 0% 100%, rgba(14,165,233,.025), transparent 55%),
                #0A0E1A`,
    surf:      '#0F1424',
    surfHi:    '#161B2D',

    card:      'rgba(148,163,184,.025)',
    cardHover: 'rgba(148,163,184,.045)',
    miniCard:  'rgba(148,163,184,.025)',

    border:    'rgba(148,163,184,.10)',
    borderS:   'rgba(148,163,184,.16)',
    borderHi:  'rgba(148,163,184,.24)',

    txt:       '#E2E8F0',
    sub:       '#94A3B8',
    muted:     '#475569',

    navBg:     '#0B0F1B',
    navBdr:    'rgba(148,163,184,.08)',

    inputBg:   '#161B2D',
    inputFocus:'rgba(99,102,241,.5)',

    pinBg:     '#0F1424',
    pinKey:    '#1A2038',
    switchBg:  '#0A0E1A',

    hdrBg:     'linear-gradient(180deg, rgba(15,20,36,.88), rgba(10,14,26,.85))',

    // Refined drop shadows — precise, not glowing
    shadow1:   '0 1px 2px rgba(0,0,0,.4)',
    shadow2:   '0 2px 8px rgba(0,0,0,.30), 0 1px 2px rgba(0,0,0,.20)',
    shadow3:   '0 12px 32px rgba(0,0,0,.45), 0 2px 8px rgba(0,0,0,.30)',
    shadowGlow:'0 0 0 1px rgba(99,102,241,.30), 0 8px 24px rgba(99,102,241,.20)',
    overlay:   'rgba(2,6,15,.75)',
  },
  light: {
    bg:        '#FAFAFC',
    // Very subtle off-white tint, no colorful blobs
    bgPattern: `radial-gradient(ellipse 1200px 600px at 100% 0%, rgba(99,102,241,.035), transparent 55%),
                #FAFAFC`,
    surf:      '#FFFFFF',
    surfHi:    '#FFFFFF',

    card:      'rgba(15,23,42,.018)',
    cardHover: 'rgba(15,23,42,.035)',
    miniCard:  'rgba(15,23,42,.022)',

    border:    'rgba(15,23,42,.08)',
    borderS:   'rgba(15,23,42,.14)',
    borderHi:  'rgba(15,23,42,.22)',

    txt:       '#0F172A',
    sub:       '#475569',
    muted:     '#94A3B8',

    navBg:     '#FFFFFF',
    navBdr:    'rgba(15,23,42,.07)',

    inputBg:   '#F4F5F8',
    inputFocus:'rgba(99,102,241,.5)',

    pinBg:     '#FFFFFF',
    pinKey:    '#F1F5F9',
    switchBg:  '#FAFAFC',

    hdrBg:     'linear-gradient(180deg, rgba(255,255,255,.94), rgba(250,250,252,.88))',

    shadow1:   '0 1px 2px rgba(15,23,42,.05)',
    shadow2:   '0 2px 6px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04)',
    shadow3:   '0 12px 36px rgba(15,23,42,.08), 0 2px 8px rgba(15,23,42,.04)',
    shadowGlow:'0 0 0 1px rgba(99,102,241,.30), 0 8px 24px rgba(99,102,241,.18)',
    overlay:   'rgba(15,23,42,.45)',
  },
};

// ───────── TYPOGRAPHY ─────────
// Inter is the gold standard for professional UIs (used by Linear, Vercel, Stripe).
export const ff = (lang) => lang === 'ar' ? "'Noto Kufi Arabic', sans-serif" : "'Inter', system-ui, -apple-system, sans-serif";
export const fd = (lang) => lang === 'ar' ? "'Noto Kufi Arabic', sans-serif" : "'Inter', system-ui, -apple-system, sans-serif";
export const fm = "'JetBrains Mono', 'DM Mono', ui-monospace, monospace";
