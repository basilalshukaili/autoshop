import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { C, ff, fd } from '../theme.js';
import { t, dt } from '../i18n.js';
import { Pill, Spinner, statusColor, statusIcon } from '../ui.jsx';

export default function TrackPage({ th, lang, setLang, theme, setTheme, settings }) {
  const { token } = useParams();
  const [wo, setWo] = useState(null);
  const [err, setErr] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [rated, setRated] = useState(false);

  useEffect(() => {
    fetch(`/api/track/${token}`).then(async r => {
      if (!r.ok) { setErr(true); return; }
      setWo(await r.json());
    }).catch(() => setErr(true));
  }, [token]);

  const submitRating = async () => {
    if (!rating) return;
    await fetch(`/api/work-orders/${wo.id}/rate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, feedback, token }),
    });
    setRated(true);
  };

  if (err) return (
    <div style={{ minHeight: '100vh', background: th.bg, color: th.txt, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ textAlign: 'center', fontFamily: ff(lang) }}>
        <div style={{ fontSize: '60px' }}>🚫</div>
        <div style={{ fontSize: '14px', color: th.sub }}>{lang === 'ar' ? 'الرابط غير صالح' : 'Invalid link'}</div>
      </div>
    </div>
  );

  if (!wo) return <div style={{ minHeight: '100vh', background: th.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>;

  const isReady = wo.status === 'ready' || wo.status === 'invoiced';

  return (
    <div style={{
      minHeight: '100vh', background: th.bg, color: th.txt,
      direction: lang === 'ar' ? 'rtl' : 'ltr', fontFamily: ff(lang),
      padding: '20px',
    }}>
      <div style={{
        position: 'absolute', top: '20px',
        [lang === 'ar' ? 'left' : 'right']: '20px',
        display: 'flex', gap: '8px',
      }}>
        <button onClick={() => setLang(x => x === 'en' ? 'ar' : 'en')} style={{
          background: th.card, border: `1px solid ${th.border}`, color: th.txt,
          padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: '12px', fontWeight: 600,
        }}>{lang === 'en' ? 'العربية' : 'English'}</button>
        <button onClick={() => setTheme(x => x === 'dark' ? 'light' : 'dark')} style={{
          background: th.card, border: `1px solid ${th.border}`, color: th.sub,
          padding: '7px 11px', borderRadius: 8, cursor: 'pointer', fontSize: '14px',
        }}>{theme === 'dark' ? '☀' : '☾'}</button>
      </div>

      <div style={{ maxWidth: '500px', margin: '40px auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '12px',
            background: 'linear-gradient(135deg,#818CF8,#4F46E5)', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', fontWeight: 800, letterSpacing: '-0.03em',
            boxShadow: '0 8px 24px rgba(99,102,241,.30)', marginBottom: '14px',
          }}>A</div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, fontFamily: fd(lang), color: th.txt, margin: 0 }}>
            {lang === 'ar' ? settings.shop_name_ar || 'أوتوشوب برو' : settings.shop_name || 'AutoShop Pro'}
          </h1>
          <div style={{ fontSize: '11px', color: th.sub }}>{settings.shop_phone}</div>
        </div>

        <div style={{
          background: th.surf, border: `2px solid ${statusColor(wo.status)}40`,
          borderRadius: '14px', padding: '24px', marginBottom: '16px',
          boxShadow: '0 8px 28px rgba(0,0,0,.2)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '60px' }}>{statusIcon(wo.status)}</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: statusColor(wo.status), marginTop: '8px', fontFamily: fd(lang) }}>
              {t(`status_${wo.status}`, lang) || wo.status}
            </div>
            {isReady && (
              <div style={{ fontSize: '13px', color: C.G, marginTop: '8px', fontFamily: ff(lang) }}>
                ✓ {lang === 'ar' ? 'سيارتك جاهزة للاستلام' : 'Your car is ready for pickup'}
              </div>
            )}
          </div>

          <Row label={lang === 'ar' ? 'رقم الأمر' : 'Job #'} value={wo.code} th={th} />
          <Row label={t('vehicle', lang)} value={`${wo.make} ${wo.model} ${wo.year}`} th={th} />
          <Row label={t('plate', lang)} value={wo.plate} th={th} />
          <Row label={t('customer', lang)} value={wo.customer_name} th={th} />
          {wo.technician_name && <Row label={t('technician', lang)} value={wo.technician_name} th={th} />}
          {wo.problem && <Row label={t('problem', lang)} value={wo.problem} th={th} />}
          <Row label={lang === 'ar' ? 'تاريخ الاستلام' : 'Opened'} value={dt(wo.opened_at, lang)} th={th} />
          {wo.closed_at && <Row label={lang === 'ar' ? 'تاريخ الإنجاز' : 'Closed'} value={dt(wo.closed_at, lang)} th={th} />}
        </div>

        {/* Rating */}
        {isReady && !rated && (
          <div style={{
            background: th.surf, border: `2px solid ${C.GL}40`,
            borderRadius: '14px', padding: '24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: th.txt, marginBottom: '12px', fontFamily: fd(lang) }}>
              ⭐ {lang === 'ar' ? 'كيف كانت تجربتك؟' : 'How was your experience?'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '14px' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setRating(n)} style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: '32px', filter: rating >= n ? 'none' : 'grayscale(1) opacity(.4)',
                  transition: 'all .12s',
                }}>⭐</button>
              ))}
            </div>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
              placeholder={lang === 'ar' ? 'ملاحظاتك (اختياري)' : 'Your feedback (optional)'}
              style={{
                width: '100%', padding: '10px', borderRadius: '7px',
                border: `1px solid ${th.borderS}`, background: th.inputBg, color: th.txt,
                fontSize: '12px', fontFamily: ff(lang), resize: 'vertical', minHeight: '60px',
                outline: 'none', direction: lang === 'ar' ? 'rtl' : 'ltr',
              }} />
            <button onClick={submitRating} disabled={!rating} style={{
              marginTop: '10px', background: rating ? C.GL : th.muted, color: '#fff',
              border: 'none', padding: '10px 24px', borderRadius: '7px', cursor: rating ? 'pointer' : 'not-allowed',
              fontSize: '13px', fontWeight: 700, fontFamily: ff(lang),
            }}>{lang === 'ar' ? 'إرسال' : 'Submit'}</button>
          </div>
        )}

        {rated && (
          <div style={{
            background: th.surf, border: `2px solid ${C.G}40`,
            borderRadius: '14px', padding: '24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '40px' }}>🙏</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: C.G, marginTop: '8px', fontFamily: fd(lang) }}>
              {lang === 'ar' ? 'شكراً لتقييمك!' : 'Thank you for your feedback!'}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '10px', color: th.muted, fontFamily: ff(lang) }}>
          {t('powered_by_basil', lang)} · +968 94639405
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, th }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', borderBottom: `1px solid ${th.border}`,
      fontSize: '12px',
    }}>
      <span style={{ color: th.sub }}>{label}</span>
      <span style={{ color: th.txt, fontWeight: 600, textAlign: 'end' }}>{value}</span>
    </div>
  );
}
