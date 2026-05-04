import { useState, useEffect } from 'react';
import { post, get } from './api.js';
import { C, ff, fd, GRAD, MOTION } from './theme.js';
import { t } from './i18n.js';

export default function Login({ th, lang, theme, setLang, setTheme, onLogin }) {
  const [workers, setWorkers] = useState([]);
  const [screen, setScreen] = useState('avatars');
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    get('/workers').then(setWorkers).catch(() => setError('Cannot reach server'));
  }, []);

  const tap = w => { setSelected(w); setPin(''); setError(''); setScreen('pin'); };

  const tapKey = async (k) => {
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) {
      try {
        const r = await post('/login', { worker_id: selected.id, pin: next });
        localStorage.setItem('autoshop_token', r.token);
        localStorage.setItem('autoshop_worker', JSON.stringify(r.worker));
        if (r.worker.theme) setTheme(r.worker.theme);
        if (r.worker.lang) setLang(r.worker.lang);
        setScreen('success');
        setTimeout(() => onLogin(r.worker, r.token), 800);
      } catch (e) {
        setShake(true);
        setTimeout(() => { setShake(false); setPin(''); }, 480);
        setError(t('wrong_pin', lang));
      }
    }
  };

  // Keyboard support on PIN screen — accepts 0-9 and Backspace/Delete only
  useEffect(() => {
    if (screen !== 'pin') return;
    const onKey = (e) => {
      // Ignore modifier combos (Ctrl/Alt/Meta) and key repeats from holding
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key >= '0' && e.key <= '9' && e.key.length === 1) {
        e.preventDefault();
        tapKey(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        setPin(p => p.slice(0, -1));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setScreen('avatars'); setPin(''); setError('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, pin, selected]);

  return (
    <div style={{
      minHeight: '100vh',
      background: th.bgPattern,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', padding: 20, position: 'relative',
      direction: lang === 'ar' ? 'rtl' : 'ltr', overflow: 'hidden',
    }}>
      {/* Subtle atmospheric depth — single restrained accent */}
      <div className="blob" style={{
        width: 480, height: 480, top: '-15%', right: '-10%',
        background: 'radial-gradient(circle, rgba(99,102,241,.18), transparent 70%)',
        opacity: .45,
      }} />
      <div className="blob" style={{
        width: 380, height: 380, bottom: '-15%', left: '-8%',
        background: 'radial-gradient(circle, rgba(99,102,241,.10), transparent 70%)',
        opacity: .35,
        animationDelay: '6s',
      }} />

      {/* Top bar with toggles */}
      <div style={{
        position: 'absolute', top: 22,
        [lang === 'ar' ? 'left' : 'right']: 22,
        display: 'flex', gap: 8, zIndex: 2,
      }}>
        <button onClick={() => setLang(x => x === 'en' ? 'ar' : 'en')} style={{
          background: th.card, border: `1px solid ${th.borderS}`, color: th.txt,
          padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
          fontFamily: ff(lang), transition: `all ${MOTION.fast}`,
          backdropFilter: 'blur(10px)',
        }}>{lang === 'en' ? 'العربية' : 'English'}</button>
        <button onClick={() => setTheme(x => x === 'dark' ? 'light' : 'dark')} style={{
          background: th.card, border: `1px solid ${th.borderS}`, color: th.txt,
          padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 14,
          width: 36, height: 36,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(10px)', transition: `all ${MOTION.fast}`,
        }}>{theme === 'dark' ? '☀' : '☾'}</button>
      </div>

      {/* Logo + title — refined, no oversized icon */}
      <div className="fade" style={{ textAlign: 'center', marginBottom: 38, position: 'relative', zIndex: 2 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: GRAD.brand, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em',
          margin: '0 auto 20px',
          boxShadow: '0 12px 32px rgba(99,102,241,.40), 0 4px 14px rgba(99,102,241,.25), inset 0 1px 0 rgba(255,255,255,.20)',
        }}>A</div>
        <h1 style={{
          fontSize: 28, fontWeight: 700, color: th.txt,
          fontFamily: fd(lang), margin: 0,
          letterSpacing: lang === 'ar' ? 0 : '-0.028em',
        }}>{t('app_title', lang)}</h1>
        <div style={{
          fontSize: 10.5, color: th.muted, fontFamily: ff(lang),
          marginTop: 8, letterSpacing: '2.4px', textTransform: 'uppercase',
          fontWeight: 600,
        }}>
          {t('app_subtitle', lang)}
        </div>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 360,
        background: th.surf,
        border: `1px solid ${th.borderS}`,
        borderRadius: 24, overflow: 'hidden',
        boxShadow: th.shadow3,
        position: 'relative', zIndex: 2,
      }}>
        {screen === 'avatars' && (
          <div className="slide" style={{ padding: '30px 22px' }}>
            <div style={{ textAlign: 'center', marginBottom: 22 }}>
              <div style={{
                fontSize: 15, color: th.txt, fontWeight: 800,
                fontFamily: ff(lang), marginBottom: 4, letterSpacing: '-0.01em',
              }}>{t('who_are_you', lang)}</div>
              <div style={{ fontSize: 11.5, color: th.muted, fontFamily: ff(lang) }}>
                {t('tap_avatar', lang)}
              </div>
            </div>
            {error && (
              <div style={{
                fontSize: 11, color: C.R, textAlign: 'center', marginBottom: 14,
                background: `${C.R}10`, border: `1px solid ${C.R}30`,
                borderRadius: 8, padding: '8px 12px',
              }}>{error}</div>
            )}
            <div className="stagger" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {workers.map(w => (
                <button key={w.id} onClick={() => tap(w)} style={{
                  background: th.card, border: `1.5px solid ${th.border}`,
                  borderRadius: 14, padding: '16px 10px',
                  cursor: 'pointer', textAlign: 'center',
                  transition: `all ${MOTION.base}`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = w.color;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 10px 24px ${w.color}33, 0 0 0 1px ${w.color}40`;
                  e.currentTarget.style.background = `${w.color}08`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = th.border;
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.background = th.card;
                }}>
                  <div style={{
                    fontSize: 34, marginBottom: 8,
                    width: 56, height: 56, borderRadius: 14,
                    background: `${w.color}18`,
                    margin: '0 auto 10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{w.avatar}</div>
                  <div style={{
                    fontSize: 12.5, color: th.txt, fontWeight: 700,
                    fontFamily: ff(lang), letterSpacing: '-0.005em',
                  }}>{lang === 'ar' ? w.name_ar : w.name}</div>
                  <div style={{
                    fontSize: 10, color: w.color, fontFamily: ff(lang),
                    marginTop: 3, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '1px',
                  }}>{lang === 'ar' ? w.role_ar : w.role}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {screen === 'pin' && selected && (
          <div className={shake ? 'shake' : 'slide'} style={{ padding: '24px 22px' }}>
            <button onClick={() => { setScreen('avatars'); setPin(''); setError(''); }} style={{
              background: 'none', border: 'none', color: th.sub, cursor: 'pointer',
              fontSize: 18, padding: '4px 8px', borderRadius: 6,
              transition: `all ${MOTION.fast}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = th.txt; e.currentTarget.style.background = th.cardHover; }}
            onMouseLeave={e => { e.currentTarget.style.color = th.sub; e.currentTarget.style.background = 'none'; }}
            >{lang === 'ar' ? '→' : '←'}</button>
            <div style={{ textAlign: 'center', marginBottom: 18, marginTop: 8 }}>
              <div style={{
                fontSize: 36, marginBottom: 8,
                width: 64, height: 64, borderRadius: 16,
                background: `${selected.color}18`,
                margin: '0 auto 10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 8px 22px ${selected.color}25`,
              }}>{selected.avatar}</div>
              <div style={{
                fontSize: 15, fontWeight: 800, color: th.txt,
                fontFamily: ff(lang), letterSpacing: '-0.01em',
              }}>{lang === 'ar' ? selected.name_ar : selected.name}</div>
              <div style={{
                fontSize: 11, color: selected.color, fontFamily: ff(lang),
                marginBottom: 16, marginTop: 2, fontWeight: 600,
                letterSpacing: '1.2px', textTransform: 'uppercase',
              }}>{t('enter_pin', lang)}</div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{
                    width: 13, height: 13, borderRadius: '50%',
                    background: i < pin.length ? selected.color : 'transparent',
                    border: `1.5px solid ${i < pin.length ? selected.color : th.borderS}`,
                    transition: `all ${MOTION.spring}`,
                    boxShadow: i < pin.length ? `0 0 12px ${selected.color}cc` : 'none',
                    transform: i < pin.length ? 'scale(1.15)' : 'scale(1)',
                  }} />
                ))}
              </div>
              {error && (
                <div style={{
                  fontSize: 11, color: C.R, marginTop: 12,
                  background: `${C.R}10`, border: `1px solid ${C.R}30`,
                  borderRadius: 8, padding: '6px 12px', display: 'inline-block',
                }}>{error}</div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) => (
                <button key={i} onClick={() => k === '⌫' ? setPin(p => p.slice(0, -1)) : k && tapKey(k)} style={{
                  padding: '15px', borderRadius: 12,
                  fontSize: 19, fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  cursor: k || k === '0' ? 'pointer' : 'default',
                  background: k || k === '0' ? th.pinKey : 'transparent',
                  border: `1px solid ${k || k === '0' ? th.border : 'transparent'}`,
                  color: k === '⌫' ? C.R : th.txt,
                  opacity: !k && k !== '0' ? 0 : 1,
                  transition: `all ${MOTION.fast}`,
                }}
                onMouseEnter={e => {
                  if (!k && k !== '0') return;
                  e.currentTarget.style.background = `${selected.color}20`;
                  e.currentTarget.style.borderColor = `${selected.color}45`;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  if (!k && k !== '0') return;
                  e.currentTarget.style.background = th.pinKey;
                  e.currentTarget.style.borderColor = th.border;
                  e.currentTarget.style.transform = 'none';
                }}>{k}</button>
              ))}
            </div>
          </div>
        )}

        {screen === 'success' && selected && (
          <div className="slide" style={{ padding: '54px 22px', textAlign: 'center' }}>
            <div className="glowPulse" style={{
              width: 72, height: 72, borderRadius: '50%',
              background: GRAD.brand,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 38, margin: '0 auto 16px',
              boxShadow: `0 0 36px ${selected.color}88`,
            }}>✓</div>
            <div style={{
              fontSize: 17, fontWeight: 800, color: selected.color,
              fontFamily: fd(lang), marginBottom: 5, letterSpacing: '-0.01em',
            }}>{t('welcome', lang)}, {lang === 'ar' ? selected.name_ar : selected.name}</div>
            <div style={{ fontSize: 11.5, color: th.sub, fontFamily: ff(lang) }}>
              {t('switched_ok', lang)} ✓
            </div>
          </div>
        )}
      </div>

      {/* Powered by Basil */}
      <div style={{
        position: 'absolute', bottom: 24,
        textAlign: 'center', width: '100%', zIndex: 2,
      }}>
        <div style={{
          display: 'inline-block',
          fontSize: 10, fontWeight: 600, color: th.muted,
          fontFamily: ff(lang),
          letterSpacing: '1.6px', textTransform: 'uppercase',
        }}>
          {t('powered_by_basil', lang)}
        </div>
      </div>
    </div>
  );
}
