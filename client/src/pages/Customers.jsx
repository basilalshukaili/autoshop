import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post, put, del } from '../api.js';
import { C, ff, fd } from '../theme.js';
import { t } from '../i18n.js';
import { Btn, Card, Modal, Input, Textarea, Select, Tag, Empty, Spinner, useToast, Pill } from '../ui.jsx';

export default function Customers({ th, lang, worker }) {
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();
  const toast = useToast();

  const load = () => {
    setLoading(true);
    get(`/customers?q=${encodeURIComponent(q)}`).then(r => { setList(r); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, [q]);

  const onSave = async (form) => {
    try {
      if (editing?.id) {
        await put(`/customers/${editing.id}`, form);
        toast.push(t('saved', lang), C.G);
      } else {
        const r = await post('/customers', form);
        toast.push(`✓ ${r.code}`, C.G);
      }
      setOpen(false); setEditing(null); load();
    } catch (e) {
      toast.push(e.message, C.R);
    }
  };

  const onDelete = async (c) => {
    if (!confirm(t('confirm_delete', lang))) return;
    await del(`/customers/${c.id}`);
    toast.push('🗑 ' + t('saved', lang), C.O);
    load();
  };

  return (
    <div>
      <Header th={th} lang={lang} title={t('customers', lang)} count={list.length}
        action={<Btn c={C.O} onClick={() => { setEditing(null); setOpen(true); }}>+ {t('add_customer', lang)}</Btn>} />

      <input value={q} onChange={e => setQ(e.target.value)}
        placeholder={`🔍 ${t('search', lang)}…`}
        style={{
          width: '100%', maxWidth: '420px', padding: '10px 14px',
          borderRadius: '8px', border: `1px solid ${th.borderS}`,
          background: th.inputBg, color: th.txt, fontSize: '13px',
          outline: 'none', marginBottom: '14px', fontFamily: ff(lang),
          direction: lang === 'ar' ? 'rtl' : 'ltr',
        }} />

      {loading && <Spinner />}
      {!loading && list.length === 0 && <Empty icon="👤" title={t('no_results', lang)} th={th} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        {list.map(c => (
          <Card key={c.id} c={C.B} th={th} onClick={() => nav(`/customers/${c.id}`)}
            style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: `${C.O}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
              }}>👤</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: th.txt, fontFamily: ff(lang) }}>{c.name}</div>
                <div style={{ fontSize: '10.5px', color: th.sub, fontFamily: 'DM Mono', marginTop: 2 }}>
                  {c.code} {c.phone && `· ${c.phone}`}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <Tag c={C.B}>{c.vehicle_count} {lang === 'ar' ? 'سيارة' : 'vehicles'}</Tag>
                  <Tag c={C.P}>{c.wo_count} {lang === 'ar' ? 'أمر' : 'jobs'}</Tag>
                  {c.language === 'ar' ? <Pill c={C.GL}>AR</Pill> : <Pill c={C.B}>EN</Pill>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
              <Btn variant="ghost" c={C.B} style={{ flex: 1, padding: '5px 10px', fontSize: '11px' }}
                onClick={(e) => { e.stopPropagation(); setEditing(c); setOpen(true); }}>{t('edit', lang)}</Btn>
              <Btn variant="ghost" c={C.R} style={{ padding: '5px 10px', fontSize: '11px' }}
                onClick={(e) => { e.stopPropagation(); onDelete(c); }}>🗑</Btn>
            </div>
          </Card>
        ))}
      </div>

      <CustomerForm open={open} onClose={() => { setOpen(false); setEditing(null); }} onSave={onSave} initial={editing} th={th} lang={lang} />
    </div>
  );
}

export function CustomerForm({ open, onClose, onSave, initial, th, lang }) {
  const blank = { name: '', phone: '+968 ', language: 'ar' };
  const [form, setForm] = useState(blank);
  useEffect(() => {
    setForm(initial ? { name: initial.name || '', phone: initial.phone || '+968 ', language: initial.language || 'ar' } : blank);
  }, [initial, open]);

  const setPhone = (v) => {
    // Always keep +968 prefix
    if (!v.startsWith('+968')) v = '+968 ' + v.replace(/^\+968\s*/, '');
    setForm({ ...form, phone: v });
  };

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? t('edit', lang) + ' ' + t('customer', lang) : t('add_customer', lang)} th={th} lang={lang}>
      <Input th={th} lang={lang} label={t('name', lang)} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
          fontSize: '12px', color: th.sub, fontFamily: 'DM Mono', pointerEvents: 'none', zIndex: 1,
          marginTop: '8px',
        }}>+968</div>
        <Input th={th} lang={lang} label={t('phone', lang)}
          value={form.phone.replace(/^\+968\s*/, '')}
          onChange={e => setPhone('+968 ' + e.target.value)}
          style={{ paddingLeft: '52px' }} />
      </div>
      <Select th={th} lang={lang} label={t('preferred_lang', lang)} value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}
        options={[{ value: 'ar', label: 'العربية' }, { value: 'en', label: 'English' }]} />
      <div style={{ display: 'flex', gap: '8px', justifyContent: lang === 'ar' ? 'flex-start' : 'flex-end', marginTop: '12px' }}>
        <Btn variant="ghost" c={C.B} onClick={onClose}>{t('cancel', lang)}</Btn>
        <Btn c={C.O} onClick={() => form.name && onSave(form)}>{t('save', lang)}</Btn>
      </div>
    </Modal>
  );
}

export function Header({ th, lang, title, count, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: '18px', flexWrap: 'wrap', gap: '12px',
    }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: th.txt, margin: 0, fontFamily: fd(lang) }}>
          {title} {count !== undefined && <span style={{ fontSize: '13px', color: th.sub, fontWeight: 400 }}>({count})</span>}
        </h1>
      </div>
      {action}
    </div>
  );
}
