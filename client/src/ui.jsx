import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { C, GRAD, MOTION, fm } from './theme.js';
import { t } from './i18n.js';

// ───── Atoms — refined: less glow, more precision ─────
export const Dot = ({ color = C.O, size = 7, pulse }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0,
    boxShadow: pulse ? `0 0 ${size * 1.6}px ${color}` : 'none',
    animation: pulse ? 'blink 2s ease infinite' : undefined,
  }} />
);

export const Tag = ({ c = C.O, children, size = 'sm' }) => (
  <span style={{
    background: `${c}14`,
    border: `1px solid ${c}30`,
    color: c,
    padding: size === 'sm' ? '3px 9px' : '5px 12px',
    borderRadius: 5,
    fontSize: size === 'sm' ? 10 : 11,
    letterSpacing: '.5px',
    fontFamily: fm,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    lineHeight: 1.5,
  }}>{children}</span>
);

export const Pill = ({ c = C.O, children, glow }) => (
  <span style={{
    background: `${c}18`,
    border: `1px solid ${c}38`,
    color: c,
    padding: '3px 10px',
    borderRadius: 999,
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: '.2px',
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    lineHeight: 1.5,
  }}>{children}</span>
);

// ───── Btn — refined: precise shadows, no glow ─────
export const Btn = ({ c = C.O, variant = 'fill', children, style, loading, disabled, ...rest }) => {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const isFill = variant === 'fill';
  const isOutline = variant === 'outline';

  // Hover-darkened version of the brand color for fill buttons
  const fillHover = isFill ? `${c}` : c;

  const base = {
    fill:    {
      background: hover && !disabled ? `${c}DD` : c,
      color: '#fff',
      border: `1px solid ${c}`,
    },
    ghost:   {
      background: hover ? `${c}1F` : `${c}12`,
      color: c,
      border: `1px solid ${c}30`,
    },
    outline: {
      background: hover ? `${c}10` : 'transparent',
      color: c,
      border: `1px solid ${c}50`,
    },
  }[variant];

  // Precise drop-shadow on hover, no colored glow halo
  const hoverShadow = isFill && hover && !disabled
    ? `0 4px 14px ${c}40, 0 2px 4px rgba(0,0,0,.10)`
    : 'none';

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      onMouseEnter={(e) => { setHover(true); rest.onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setHover(false); setPressed(false); rest.onMouseLeave?.(e); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        padding: '8px 16px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0',
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        transition: `all ${MOTION.fast}, transform 90ms cubic-bezier(.4,0,.2,1)`,
        transform: pressed && !disabled ? 'scale(.97)' : hover && !disabled ? 'translateY(-1px)' : 'none',
        boxShadow: hoverShadow,
        opacity: disabled ? .5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        ...base,
        ...style,
      }}>
      {loading && <span className="spin" style={{
        width: 12, height: 12, border: `2px solid ${isFill ? '#ffffff55' : `${c}40`}`,
        borderTopColor: isFill ? '#fff' : c, borderRadius: '50%', display: 'inline-block',
      }} />}
      {children}
    </button>
  );
};

// ───── Card — refined: neutral hover border, subtle lift ─────
export const Card = ({ children, c = C.O, th, style, onClick, lift = false }) => {
  const [hover, setHover] = useState(false);
  const isInteractive = lift || onClick;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        background: th.surf,
        backgroundImage: hover && isInteractive ? GRAD.surface : 'none',
        border: `1px solid ${hover && isInteractive ? th.borderS : th.border}`,
        borderRadius: 12,
        padding: 16,
        transition: `all ${MOTION.base}`,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: hover && isInteractive ? th.shadow2 : th.shadow1,
        transform: hover && isInteractive ? 'translateY(-1px)' : 'none',
        ...style,
      }}>
      {children}
    </div>
  );
};

// ───── Inputs ─────
export const Input = ({ th, lang, label, error, hint, prefix, suffix, ...rest }) => {
  const [focused, setFocused] = useState(false);
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      {label && (
        <div style={{
          fontSize: 10, color: th.sub, marginBottom: 6,
          letterSpacing: '.9px', textTransform: 'uppercase', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>{label}</span>
          {hint && <span style={{ color: th.muted, textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>· {hint}</span>}
        </div>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && <div style={{ position: 'absolute', left: 12, color: th.sub, fontSize: 13, pointerEvents: 'none' }}>{prefix}</div>}
        <input
          {...rest}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
          style={{
            width: '100%',
            padding: prefix ? '10px 12px 10px 32px' : suffix ? '10px 32px 10px 12px' : '10px 12px',
            borderRadius: 8,
            border: `1px solid ${error ? C.R : focused ? C.O : th.borderS}`,
            background: th.inputBg,
            color: th.txt,
            fontSize: 13,
            outline: 'none',
            direction: lang === 'ar' ? 'rtl' : 'ltr',
            transition: `all ${MOTION.fast}`,
            boxShadow: focused ? `0 0 0 2px ${error ? C.R + '20' : C.O + '22'}` : 'none',
            ...rest.style,
          }} />
        {suffix && <div style={{ position: 'absolute', right: 12, color: th.sub, fontSize: 13, pointerEvents: 'none' }}>{suffix}</div>}
      </div>
      {error && <div style={{ fontSize: 10.5, color: C.R, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>⚠ {error}</div>}
    </label>
  );
};

export const Textarea = ({ th, lang, label, ...rest }) => {
  const [focused, setFocused] = useState(false);
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      {label && (
        <div style={{ fontSize: 10, color: th.sub, marginBottom: 6, letterSpacing: '.9px', textTransform: 'uppercase', fontWeight: 600 }}>
          {label}
        </div>
      )}
      <textarea
        {...rest}
        onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 8,
          minHeight: 84,
          border: `1px solid ${focused ? C.O : th.borderS}`,
          background: th.inputBg,
          color: th.txt,
          fontSize: 13,
          outline: 'none',
          direction: lang === 'ar' ? 'rtl' : 'ltr',
          resize: 'vertical',
          fontFamily: 'inherit',
          transition: `all ${MOTION.fast}`,
          boxShadow: focused ? `0 0 0 2px ${C.O}22` : 'none',
          ...rest.style,
        }} />
    </label>
  );
};

export const Select = ({ th, lang, label, options, ...rest }) => {
  const [focused, setFocused] = useState(false);
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      {label && (
        <div style={{ fontSize: 10, color: th.sub, marginBottom: 6, letterSpacing: '.9px', textTransform: 'uppercase', fontWeight: 600 }}>
          {label}
        </div>
      )}
      <select
        {...rest}
        onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 8,
          border: `1px solid ${focused ? C.O : th.borderS}`,
          background: th.inputBg,
          color: th.txt,
          fontSize: 13,
          outline: 'none',
          direction: lang === 'ar' ? 'rtl' : 'ltr',
          transition: `all ${MOTION.fast}`,
          boxShadow: focused ? `0 0 0 2px ${C.O}22` : 'none',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%2364748B' d='M5 7L1 3h8z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: lang === 'ar' ? 'left 12px center' : 'right 12px center',
          paddingRight: lang === 'ar' ? 12 : 32,
          paddingLeft: lang === 'ar' ? 32 : 12,
          ...rest.style,
        }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
};

// ───── SearchableSelect — typeahead combobox for long lists ─────
// options: [{ value, label, sub?, keywords? }]
// keywords is searched in addition to label/sub if provided.
export function SearchableSelect({ th, lang, label, value, onChange, options = [], placeholder, hint, disabled }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const [highlight, setHighlight] = useState(0);
  const triggerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = options.find(o => String(o.value) === String(value));

  const filtered = (() => {
    if (!q.trim()) return options;
    const needle = q.toLowerCase().trim();
    return options.filter(o => {
      const hay = (o.keywords || `${o.label || ''} ${o.sub || ''}`).toLowerCase();
      return hay.includes(needle);
    });
  })();

  // Reposition the dropdown to anchor below the trigger
  const reposition = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width });
  };

  useEffect(() => {
    if (!open) return;
    reposition();
    setHighlight(0);
    setTimeout(() => inputRef.current?.focus(), 30);
    const onScroll = () => reposition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      const dropdown = document.getElementById('ssel-dd');
      if (dropdown?.contains(e.target)) return;
      setOpen(false); setQ('');
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => { setHighlight(0); }, [q]);

  const choose = (o) => {
    onChange?.(o.value);
    setOpen(false); setQ('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); setQ(''); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, filtered.length - 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      const o = filtered[highlight];
      if (o) choose(o);
    }
  };

  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      {label && (
        <div style={{
          fontSize: 10, color: th.sub, marginBottom: 6,
          letterSpacing: '.9px', textTransform: 'uppercase', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>{label}</span>
          {hint && <span style={{ color: th.muted, textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>· {hint}</span>}
        </div>
      )}
      <button
        type="button"
        ref={triggerRef}
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 8,
          border: `1px solid ${open ? C.O : th.borderS}`,
          background: th.inputBg,
          color: selected ? th.txt : th.muted,
          fontSize: 13,
          textAlign: lang === 'ar' ? 'right' : 'left',
          direction: lang === 'ar' ? 'rtl' : 'ltr',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: `all ${MOTION.fast}`,
          boxShadow: open ? `0 0 0 2px ${C.O}22` : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8,
          opacity: disabled ? 0.5 : 1,
        }}>
        <span style={{
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {selected ? selected.label : (placeholder || `🔍 ${t('search', lang)}…`)}
        </span>
        <span style={{ fontSize: 10, color: th.sub }}>▼</span>
      </button>
      {open && createPortal(
        <div id="ssel-dd" style={{
          position: 'fixed', top: pos.top, left: pos.left, width: pos.width,
          background: th.surf, border: `1px solid ${th.borderS}`,
          borderRadius: 10, boxShadow: '0 18px 40px rgba(0,0,0,.35), 0 4px 12px rgba(0,0,0,.25)',
          zIndex: 600, padding: 8,
          direction: lang === 'ar' ? 'rtl' : 'ltr',
        }}>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={`🔍 ${t('search', lang)}…`}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 6,
              border: `1px solid ${th.borderS}`, background: th.inputBg,
              color: th.txt, fontSize: 12, outline: 'none', marginBottom: 6,
              fontFamily: 'inherit', boxSizing: 'border-box',
              direction: lang === 'ar' ? 'rtl' : 'ltr',
            }} />
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding: 14, fontSize: 12, color: th.muted, textAlign: 'center' }}>
                {t('no_results', lang)}
              </div>
            )}
            {filtered.map((o, i) => (
              <button
                key={o.value ?? `__opt_${i}`}
                type="button"
                onClick={() => choose(o)}
                onMouseEnter={() => setHighlight(i)}
                style={{
                  display: 'block', width: '100%',
                  textAlign: lang === 'ar' ? 'right' : 'left',
                  padding: '8px 10px', borderRadius: 6,
                  background: i === highlight ? `${C.O}18` : 'transparent',
                  border: i === highlight ? `1px solid ${C.O}40` : '1px solid transparent',
                  color: th.txt, cursor: 'pointer', marginBottom: 2,
                  fontFamily: 'inherit',
                }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{o.label}</div>
                {o.sub && <div style={{ fontSize: 10.5, color: th.sub, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{o.sub}</div>}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </label>
  );
}

// ───── Modal — no dark backdrop, just a floating card ─────
export const Modal = ({ open, onClose, title, children, th, lang, width = 600 }) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div onClick={onClose} className="fade" style={{
      position: 'fixed', inset: 0,
      background: 'rgba(3,7,18,.78)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 500,
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      padding: '24px 16px',
    }}>
      <div onClick={e => e.stopPropagation()} className="slide" style={{
        maxWidth: width,
        margin: '0 auto',
        background: th.surf,
        border: `1px solid ${th.borderS}`,
        borderRadius: 16,
        boxShadow: '0 30px 80px rgba(0,0,0,.55), 0 8px 24px rgba(0,0,0,.4)',
        direction: lang === 'ar' ? 'rtl' : 'ltr',
      }}>
        <div style={{
          padding: '16px 22px',
          borderBottom: `1px solid ${th.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: th.surf,
          borderRadius: '16px 16px 0 0',
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: th.txt, letterSpacing: '-0.018em' }}>{title}</div>
          <button onClick={onClose} aria-label="Close" style={{
            background: 'none', border: 'none', color: th.sub,
            fontSize: 22, lineHeight: 1, padding: '4px 10px', borderRadius: 6,
            transition: `all ${MOTION.fast}`, cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = th.txt; e.currentTarget.style.background = th.cardHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = th.sub; e.currentTarget.style.background = 'none'; }}>×</button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>,
    document.body
  );
};

// ───── Toast (context) ─────
const ToastCtx = createContext({ push: () => {} });
export function ToastProvider({ children, th, lang }) {
  const [toasts, setToasts] = useState([]);
  const push = (msg, color = C.G) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, color }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24,
        [lang === 'ar' ? 'left' : 'right']: 24,
        zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 10,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} className="toast" style={{
            pointerEvents: 'auto',
            background: th.surf,
            backdropFilter: 'blur(14px)',
            border: `1px solid ${t.color}55`,
            borderRadius: 12,
            padding: '12px 18px',
            color: th.txt, fontSize: 13, fontWeight: 500,
            minWidth: 240, maxWidth: 360,
            boxShadow: `${th.shadow2}, 0 0 0 1px ${t.color}22`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Dot color={t.color} size={8} pulse />
            <span style={{ flex: 1 }}>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// ───── Confirm dialog ─────
export const Confirm = ({ open, onClose, onConfirm, title, message, th, lang, danger }) => (
  <Modal open={open} onClose={onClose} title={title || t('confirm_delete', lang).slice(0, 40)} th={th} lang={lang} width={420}>
    <div style={{ fontSize: 13, color: th.sub, lineHeight: 1.6, marginBottom: 20 }}>{message}</div>
    <div style={{ display: 'flex', gap: 10, justifyContent: lang === 'ar' ? 'flex-start' : 'flex-end' }}>
      <Btn variant="ghost" c={th.sub === '#64748B' ? C.B : C.B} onClick={onClose}>{t('cancel', lang)}</Btn>
      <Btn c={danger ? C.R : C.O} onClick={onConfirm}>{t('yes', lang)}</Btn>
    </div>
  </Modal>
);

// ───── Empty state ─────
export const Empty = ({ icon = '○', title, hint, th, action }) => (
  <div className="fade" style={{
    textAlign: 'center', padding: '72px 24px', color: th.sub,
    border: `1px dashed ${th.border}`, borderRadius: 14,
    background: th.miniCard,
  }}>
    <div style={{
      width: 52, height: 52, margin: '0 auto 16px',
      borderRadius: '50%', background: th.card,
      border: `1px solid ${th.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 22, color: th.muted, opacity: .8,
    }}>{icon}</div>
    <div style={{ fontSize: 14.5, color: th.txt, fontWeight: 600, marginBottom: 6, letterSpacing: '-0.018em' }}>{title}</div>
    {hint && <div style={{ fontSize: 12, color: th.sub, maxWidth: 340, margin: '0 auto', lineHeight: 1.6 }}>{hint}</div>}
    {action && <div style={{ marginTop: 18 }}>{action}</div>}
  </div>
);

// ───── Loading ─────
export const Spinner = ({ c = C.O, size = 22 }) => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
    <div className="spin" style={{
      width: size, height: size,
      border: `2.5px solid ${c}25`, borderTopColor: c,
      borderRadius: '50%',
    }} />
  </div>
);

// ───── Skeleton ─────
export const Skeleton = ({ w = '100%', h = 16, r = 6, style }) => (
  <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />
);

// ───── KPI card — refined: bold neutral number with subtle accent ─────
export const KPI = ({ icon, label, value, sub, c = C.O, th, onClick, trend }) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        background: th.surf,
        border: `1px solid ${hover && onClick ? th.borderS : th.border}`,
        borderRadius: 12,
        padding: 18,
        cursor: onClick ? 'pointer' : 'default',
        transition: `all ${MOTION.base}`,
        overflow: 'hidden',
        boxShadow: hover && onClick ? th.shadow2 : th.shadow1,
        transform: hover && onClick ? 'translateY(-1px)' : 'none',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${c}14`,
          border: `1px solid ${c}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, color: c,
          transition: `all ${MOTION.base}`,
        }}>{icon}</div>
        {trend != null && trend !== 0 && (
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '.2px',
            color: trend > 0 ? C.G : C.R,
            background: trend > 0 ? `${C.G}14` : `${C.R}14`,
            border: `1px solid ${trend > 0 ? C.G : C.R}28`,
            padding: '2px 8px', borderRadius: 999,
          }}>{trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%</span>
        )}
      </div>
      <div style={{
        fontSize: 10, color: th.sub, letterSpacing: '1.4px',
        textTransform: 'uppercase', fontWeight: 600, marginBottom: 8,
      }}>{label}</div>
      <div style={{
        fontSize: 26, fontWeight: 700, color: th.txt,
        letterSpacing: '-0.028em', lineHeight: 1.05,
      }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: th.muted, marginTop: 6, fontWeight: 500 }}>{sub}</div>}
    </div>
  );
};

// ───── Status helpers ─────
export const statusColor = (s) => ({
  open: C.B, in_progress: C.GL, urgent: C.R, waiting_parts: C.P,
  ready: C.G, invoiced: C.T,
}[s] || C.O);

export const statusIcon = (s) => ({
  open: '🆕', in_progress: '🟡', urgent: '🔴', waiting_parts: '🟣',
  ready: '🟢', invoiced: '✅',
}[s] || '⚪');

export const priorityColor = (p) => ({
  urgent: C.R, normal: C.B, scheduled: C.GL,
}[p] || C.B);

// ───── Hook: useMediaQuery ─────
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

// ───── Hook: useAutoLock ─────
export function useAutoLock(seconds, onLock, enabled = true) {
  const timer = useRef(null);
  useEffect(() => {
    if (!enabled) return;
    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(onLock, seconds * 1000);
    };
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach(e => window.removeEventListener(e, reset));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [seconds, onLock, enabled]);
}
