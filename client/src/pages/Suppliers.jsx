import { useEffect, useState } from 'react';
import { get, post, put, del } from '../api.js';
import { C, ff } from '../theme.js';
import { t } from '../i18n.js';
import { Btn, Card, Modal, Input, Textarea, Empty, Spinner, useToast } from '../ui.jsx';
import { Header } from './Customers.jsx';

export default function Suppliers({ th, lang, worker }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');
  const toast = useToast();

  const load = () => {
    setLoading(true);
    get(`/suppliers?q=${encodeURIComponent(q)}`).then(r => { setList(Array.isArray(r) ? r : []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, [q]);

  const save = async (f) => {
    try {
      if (editing?.id) await put(`/suppliers/${editing.id}`, f);
      else await post('/suppliers', f);
      toast.push(t('saved', lang), C.G);
      setOpen(false); setEditing(null); load();
    } catch (e) { toast.push(e.message, C.R); }
  };

  const remove = async (s) => {
    if (!confirm(t('confirm_delete', lang))) return;
    await del(`/suppliers/${s.id}`); load();
  };

  return (
    <div>
      <Header th={th} lang={lang} title={t('suppliers', lang)} count={list.length}
        action={<Btn c={C.O} onClick={() => { setEditing(null); setOpen(true); }}>+ {t('supplier', lang)}</Btn>} />

      <input value={q} onChange={e => setQ(e.target.value)}
        placeholder={lang === 'ar' ? '🔍 ابحث بالاسم أو الهاتف أو البريد أو الرمز…' : '🔍 Search by name, phone, email, or code…'}
        style={{
          width: '100%', maxWidth: 520, padding: '10px 14px',
          borderRadius: 8, border: `1px solid ${th.borderS}`,
          background: th.inputBg, color: th.txt, fontSize: 13,
          outline: 'none', marginBottom: 14, fontFamily: ff(lang),
          direction: lang === 'ar' ? 'rtl' : 'ltr',
        }} />

      {loading && <Spinner />}
      {!loading && list.length === 0 && <Empty icon="🏭" title={t('no_results', lang)} th={th} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        {list.map(s => (
          <Card key={s.id} c={C.GL} th={th}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ fontSize: '22px' }}>🏭</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: th.txt }}>{s.name}</div>
                <div style={{ fontSize: '10.5px', color: th.sub, fontFamily: 'DM Mono' }}>{s.code}</div>
                {s.phone && <div style={{ fontSize: '11px', color: th.sub, marginTop: '4px' }}>📞 {s.phone}</div>}
                {s.email && <div style={{ fontSize: '11px', color: th.sub }}>✉ {s.email}</div>}
                {s.address && <div style={{ fontSize: '11px', color: th.sub }}>📍 {s.address}</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
              <Btn variant="ghost" c={C.B} style={{ flex: 1, padding: '5px 10px', fontSize: '11px' }} onClick={() => { setEditing(s); setOpen(true); }}>{t('edit', lang)}</Btn>
              <Btn variant="ghost" c={C.R} style={{ padding: '5px 10px', fontSize: '11px' }} onClick={() => remove(s)}>🗑</Btn>
            </div>
          </Card>
        ))}
      </div>

      <SupForm open={open} onClose={() => { setOpen(false); setEditing(null); }} initial={editing} onSave={save} th={th} lang={lang} />
    </div>
  );
}

function SupForm({ open, onClose, initial, onSave, th, lang }) {
  const [f, setF] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
  useEffect(() => { setF(initial || { name: '', phone: '', email: '', address: '', notes: '' }); }, [initial, open]);
  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? t('edit', lang) : t('supplier', lang)} th={th} lang={lang}>
      <Input th={th} lang={lang} label={t('name', lang)} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
      <Input th={th} lang={lang} label={t('phone', lang)} value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
      <Input th={th} lang={lang} label={t('email', lang)} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
      <Input th={th} lang={lang} label={t('address', lang)} value={f.address} onChange={e => setF({ ...f, address: e.target.value })} />
      <Textarea th={th} lang={lang} label={t('notes', lang)} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} />
      <div style={{ display: 'flex', gap: '8px', justifyContent: lang === 'ar' ? 'flex-start' : 'flex-end' }}>
        <Btn variant="ghost" c={C.B} onClick={onClose}>{t('cancel', lang)}</Btn>
        <Btn c={C.O} disabled={!f.name} onClick={() => onSave(f)}>{t('save', lang)}</Btn>
      </div>
    </Modal>
  );
}
