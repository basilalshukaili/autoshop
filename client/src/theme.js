// ───────── BRAND PALETTE ─────────
// Core accents, kept backward-compatible with existing C.O / C.B / etc usage.
export const C = {
  O:  '#F97316',  // brand orange (primary)
  B:  '#3B82F6',  // blue
  P:  '#8B5CF6',  // violet
  G:  '#10B981',  // emerald
  PK: '#EC4899',  // pink
  GL: '#F59E0B',  // amber
  T:  '#14B8A6',  // teal
  R:  '#EF4444',  // red
};

// Brand-direction gradients & atmospheric layers
export const GRAD = {
  brand:     'linear-gradient(135deg, #FB923C 0%, #EA580C 100%)',
  brandSoft: 'linear-gradient(135deg, rgba(251,146,60,.16) 0%, rgba(234,88,12,.04) 100%)',
  surface:   'linear-gradient(180deg, rgba(255,255,255,.04) 0%, rgba(255,255,255,0) 60%)',
  glow:      'radial-gradient(circle at top right, rgba(249,115,22,.18), transparent 60%)',
};

// 4-point spacing scale (use as numbers for inline styles)
export const S = { 0:0, 1:4, 2:8, 3:12, 4:16, 5:20, 6:24, 7:32, 8:40, 9:48, 10:56, 12:80 };

// Radius scale
export const R = { sm:6, md:10, lg:14, xl:20, '2xl':28, full:999 };

// Type scale (px)
export const FS = { xs:10, sm:11, base:12, md:13, lg:14, xl:16, '2xl':18, '3xl':22, '4xl':28, '5xl':36, '6xl':48 };

// Motion tokens
export const MOTION = {
  fast:   '120ms cubic-bezier(.4,0,.2,1)',
  base:   '200ms cubic-bezier(.4,0,.2,1)',
  slow:   '320ms cubic-bezier(.4,0,.2,1)',
  spring: '320ms cubic-bezier(.34,1.56,.64,1)',
};

// ───────── THEMES ─────────
export const TH = {
  dark: {
    bg:        '#070A12',
    bgPattern: `radial-gradient(ellipse 1200px 600px at 80% -10%, rgba(249,115,22,.07), transparent 55%),
                radial-gradient(ellipse 900px 500px at 0% 100%, rgba(59,130,246,.05), transparent 50%),
                #070A12`,
    surf:      '#0F1422',
    surfHi:    '#161B2E',

    card:      'rgba(255,255,255,.025)',
    cardHover: 'rgba(255,255,255,.045)',
    miniCard:  'rgba(255,255,255,.025)',

    border:    'rgba(255,255,255,.06)',
    borderS:   'rgba(255,255,255,.12)',
    borderHi:  'rgba(255,255,255,.20)',

    txt:       '#E5E7EB',
    sub:       '#94A3B8',
    muted:     '#475569',

    navBg:     '#0A0E1A',
    navBdr:    'rgba(255,255,255,.05)',

    inputBg:   '#161B2E',
    inputFocus:'rgba(249,115,22,.45)',

    pinBg:     '#0F1422',
    pinKey:    '#1E2540',
    switchBg:  '#070A12',

    hdrBg:     'linear-gradient(180deg, rgba(15,20,34,.85), rgba(7,10,18,.85))',

    shadow1:   '0 1px 2px rgba(0,0,0,.4)',
    shadow2:   '0 4px 14px rgba(0,0,0,.4)',
    shadow3:   '0 14px 40px rgba(0,0,0,.5), 0 2px 8px rgba(0,0,0,.35)',
    shadowGlow:'0 0 28px rgba(249,115,22,.3)',
    overlay:   'rgba(3,6,15,.72)',
  },
  light: {
    bg:        '#F7F8FB',
    bgPattern: `radial-gradient(ellipse 1000px 500px at 80% -10%, rgba(249,115,22,.05), transparent 55%),
                radial-gradient(ellipse 700px 400px at 0% 100%, rgba(59,130,246,.04), transparent 50%),
                #F7F8FB`,
    surf:      '#FFFFFF',
    surfHi:    '#FFFFFF',

    card:      'rgba(15,23,42,.02)',
    cardHover: 'rgba(15,23,42,.04)',
    miniCard:  'rgba(15,23,42,.025)',

    border:    'rgba(15,23,42,.07)',
    borderS:   'rgba(15,23,42,.13)',
    borderHi:  'rgba(15,23,42,.22)',

    txt:       '#0F172A',
    sub:       '#64748B',
    muted:     '#94A3B8',

    navBg:     '#FFFFFF',
    navBdr:    'rgba(15,23,42,.06)',

    inputBg:   '#F1F5F9',
    inputFocus:'rgba(249,115,22,.5)',

    pinBg:     '#FFFFFF',
    pinKey:    '#F1F5F9',
    switchBg:  '#F7F8FB',

    hdrBg:     'linear-gradient(180deg, rgba(255,255,255,.92), rgba(247,248,251,.85))',

    shadow1:   '0 1px 2px rgba(15,23,42,.05)',
    shadow2:   '0 4px 14px rgba(15,23,42,.07)',
    shadow3:   '0 18px 48px rgba(15,23,42,.12), 0 4px 12px rgba(15,23,42,.06)',
    shadowGlow:'0 0 28px rgba(249,115,22,.3)',
    overlay:   'rgba(15,23,42,.45)',
  },
};

// ───────── TYPOGRAPHY ─────────
export const ff = (lang) => lang === 'ar' ? "'Noto Kufi Arabic', sans-serif" : "'Inter', system-ui, -apple-system, sans-serif";
export const fd = (lang) => lang === 'ar' ? "'Noto Kufi Arabic', sans-serif" : "'Syne', sans-serif";
export const fm = "'JetBrains Mono', 'DM Mono', ui-monospace, monospace";
