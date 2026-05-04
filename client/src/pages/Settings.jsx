import { useEffect, useState } from 'react';
import { get, post } from '../api.js';
import { C, ff, fd } from '../theme.js';
import { t } from '../i18n.js';
import { Btn, Card, Input, Textarea, useToast } from '../ui.jsx';
import { Header } from './Customers.jsx';

export default function Settings({ th, lang, worker }) {
  const [s, setS] = useState({});
  const toast = useToast();
  useEffect(() => { get('/settings').then(setS); }, []);

  const save = async () => {
    try {
      await post('/settings', s);
      toast.push('✓ ' + t('saved', lang), C.G);
    } catch (e) { toast.push(e.message, C.R); }
  };

  return (
    <div>
      <Header th={th} lang={lang} title={t('settings', lang)} action={<Btn c={C.O} onClick={save}>{t('save', lang)}</Btn>} />

      <Card c={C.O} th={th} style={{ marginBottom: '14px' }}>
        <SectionHead th={th} lang={lang} icon="🏪" title={t('shop_info', lang)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <Input th={th} lang={lang} label={t('shop_name', lang) + ' (EN)'} value={s.shop_name || ''} onChange={e => setS({ ...s, shop_name: e.target.value })} />
          <Input th={th} lang={lang} label={t('shop_name', lang) + ' (AR)'} value={s.shop_name_ar || ''} onChange={e => setS({ ...s, shop_name_ar: e.target.value })} />
          <Input th={th} lang={lang} label={t('address', lang) + ' (EN)'} value={s.shop_address || ''} onChange={e => setS({ ...s, shop_address: e.target.value })} />
          <Input th={th} lang={lang} label={t('address', lang) + ' (AR)'} value={s.shop_address_ar || ''} onChange={e => setS({ ...s, shop_address_ar: e.target.value })} />
          <Input th={th} lang={lang} label={t('phone', lang)} value={s.shop_phone || ''} onChange={e => setS({ ...s, shop_phone: e.target.value })} />
          <Input th={th} lang={lang} label={t('email', lang)} value={s.shop_email || ''} onChange={e => setS({ ...s, shop_email: e.target.value })} />
        </div>
      </Card>

      <Card c={C.T} th={th} style={{ marginBottom: '14px' }}>
        <SectionHead th={th} lang={lang} icon="💬" title="WhatsApp & AI" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <Input th={th} lang={lang} label="Gemini API Key (OCR)" hint="AIza..." value={s.gemini_api_key || ''} onChange={e => setS({ ...s, gemini_api_key: e.target.value })} />
          <Input th={th} lang={lang} label={lang === 'ar' ? 'رقم تنبيه المسؤول' : 'Admin Alert Phone'} hint="+968…" value={s.admin_alert_phone || ''} onChange={e => setS({ ...s, admin_alert_phone: e.target.value })} />
        </div>
        <div style={{ fontSize: '11px', color: th.sub, marginBottom: '8px' }}>
          {lang === 'ar' ? 'قوالب رسائل واتساب — تختار حسب لغة العميل. متغيرات: {name} {wo_code} {invoice_code} {total} {problem}' : 'WhatsApp templates — picked by customer language. Variables: {name} {wo_code} {invoice_code} {total} {problem}'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: C.O, marginBottom: '6px', letterSpacing: '1px' }}>🇴🇲 العربية</div>
            <Textarea th={th} lang="ar" label="استلام أمر العمل" value={s.wa_msg_new_wo || ''} onChange={e => setS({ ...s, wa_msg_new_wo: e.target.value })} />
            <Textarea th={th} lang="ar" label="قيد الإصلاح" value={s.wa_msg_in_progress || ''} onChange={e => setS({ ...s, wa_msg_in_progress: e.target.value })} />
            <Textarea th={th} lang="ar" label="بانتظار قطع غيار" value={s.wa_msg_waiting_parts || ''} onChange={e => setS({ ...s, wa_msg_waiting_parts: e.target.value })} />
            <Textarea th={th} lang="ar" label="عاجل" value={s.wa_msg_urgent || ''} onChange={e => setS({ ...s, wa_msg_urgent: e.target.value })} />
            <Textarea th={th} lang="ar" label="جاهز للاستلام" value={s.wa_msg_ready || ''} onChange={e => setS({ ...s, wa_msg_ready: e.target.value })} />
            <Textarea th={th} lang="ar" label="الفاتورة" value={s.wa_msg_invoice || ''} onChange={e => setS({ ...s, wa_msg_invoice: e.target.value })} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: C.B, marginBottom: '6px', letterSpacing: '1px' }}>🇬🇧 ENGLISH</div>
            <Textarea th={th} lang="en" label="New Work Order" value={s.wa_msg_new_wo_en || ''} onChange={e => setS({ ...s, wa_msg_new_wo_en: e.target.value })} />
            <Textarea th={th} lang="en" label="In-Progress" value={s.wa_msg_in_progress_en || ''} onChange={e => setS({ ...s, wa_msg_in_progress_en: e.target.value })} />
            <Textarea th={th} lang="en" label="Waiting for Parts" value={s.wa_msg_waiting_parts_en || ''} onChange={e => setS({ ...s, wa_msg_waiting_parts_en: e.target.value })} />
            <Textarea th={th} lang="en" label="Urgent" value={s.wa_msg_urgent_en || ''} onChange={e => setS({ ...s, wa_msg_urgent_en: e.target.value })} />
            <Textarea th={th} lang="en" label="Ready for Pickup" value={s.wa_msg_ready_en || ''} onChange={e => setS({ ...s, wa_msg_ready_en: e.target.value })} />
            <Textarea th={th} lang="en" label="Invoice" value={s.wa_msg_invoice_en || ''} onChange={e => setS({ ...s, wa_msg_invoice_en: e.target.value })} />
          </div>
        </div>
      </Card>

      <Card c={C.G} th={th} style={{ marginBottom: '14px' }}>
        <SectionHead th={th} lang={lang} icon="💰" title={lang === 'ar' ? 'الضريبة والعملة' : 'Tax & Currency'} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <Input th={th} lang={lang} label={t('vat_rate', lang)} hint="(0.05 = 5%)" type="number" step="0.001" value={s.vat_rate || ''} onChange={e => setS({ ...s, vat_rate: e.target.value })} />
          <Input th={th} lang={lang} label={t('vat_number', lang)} value={s.vat_number || ''} onChange={e => setS({ ...s, vat_number: e.target.value })} />
          <Input th={th} lang={lang} label={t('currency', lang)} value={s.currency || 'OMR'} onChange={e => setS({ ...s, currency: e.target.value })} />
        </div>
        <Input th={th} lang={lang} label={t('labor_rate_default', lang)} type="number" step="0.001" value={s.labor_rate || ''} onChange={e => setS({ ...s, labor_rate: e.target.value })} />
        <Input th={th} lang={lang} label={t('idle_lock', lang)} type="number" value={s.idle_lock_seconds || ''} onChange={e => setS({ ...s, idle_lock_seconds: e.target.value })} />
      </Card>

      <Card c={C.B} th={th}>
        <SectionHead th={th} lang={lang} icon="👨‍💻" title={t('developer', lang)} />
        <div style={{ background: `${C.O}10`, border: `1px solid ${C.O}25`, borderRadius: '8px', padding: '14px 16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: th.txt, marginBottom: '6px' }}>Basil Al Shukaili</div>
          <div style={{ fontSize: '12px', color: th.sub, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <a href="mailto:basilalshukaili@gmail.com" style={{ color: C.B, textDecoration: 'none' }}>📧 basilalshukaili@gmail.com</a>
            <a href="https://wa.me/96894639405" target="_blank" rel="noopener noreferrer" style={{ color: C.G, textDecoration: 'none' }}>📱 +968 94639405</a>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SectionHead({ th, lang, icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
      <span style={{ fontSize: '17px' }}>{icon}</span>
      <span style={{ fontSize: '13px', fontWeight: 800, color: th.txt, fontFamily: fd(lang) }}>{title}</span>
    </div>
  );
}
