import { useEffect, useState } from 'react';
import { get, post } from '../api.js';
import { C, ff } from '../theme.js';
import { t, dt } from '../i18n.js';
import { Btn, Card, Pill, Empty, Spinner, useToast } from '../ui.jsx';
import { Header } from './Customers.jsx';

export default function Notifications({ th, lang, worker }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    get('/notifications').then(r => { setList(Array.isArray(r) ? r : []); setLoading(false); }).catch(e => { setLoading(false); toast.push(e.message, C.R); });
  };
  useEffect(() => { load(); }, []);

  const send = async (n) => {
    try {
      await post(`/notifications/${n.id}/send`);
      toast.push('✓ ' + (lang === 'ar' ? 'تم الإرسال' : 'Sent'), C.G);
      load();
    } catch (e) {
      toast.push(e.message || 'Send failed', C.R);
      load();
    }
  };

  return (
    <div>
      <Header th={th} lang={lang} title={t('notifications', lang)} count={list.length} />

      <div style={{ background: `${C.B}10`, border: `1px solid ${C.B}30`, borderRadius: '10px', padding: '14px 18px', marginBottom: '16px', fontSize: '11.5px', color: th.sub }}>
        ℹ {lang === 'ar'
          ? 'الإشعارات تُولَّد تلقائياً عند تحديث الحالة أو الدفع. اضغط "إرسال" لإعادة الإرسال يدوياً عبر واتساب.'
          : 'Notifications are sent automatically on status changes and payment. Click Send to re-send via WhatsApp.'}
      </div>

      {loading && <Spinner />}
      {!loading && list.length === 0 && <Empty icon="🔔" title={t('no_results', lang)} th={th} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {list.map(n => (
          <Card key={n.id} c={n.status === 'sent' ? C.G : C.B} th={th}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '20px' }}>📲</span>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontSize: '12px', color: th.txt, fontFamily: ff(lang) }}>{n.message}</div>
                <div style={{ fontSize: '10px', color: th.sub, fontFamily: 'DM Mono', marginTop: '4px' }}>
                  → {n.customer_name || '—'} · {n.customer_phone || '—'} · {dt(n.created_at, lang)}
                </div>
              </div>
              <Pill c={n.status === 'sent' ? C.G : C.GL}>{n.status}</Pill>
              {n.status !== 'sent' && (
                <Btn variant="ghost" c={C.G} onClick={() => send(n)}>📲 {t('send', lang)}</Btn>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
