import { useEffect, useState } from 'react';
import { get } from '../api.js';
import { C, ff } from '../theme.js';
import { t, dt } from '../i18n.js';
import { Spinner, Empty, Pill } from '../ui.jsx';
import { Header } from './Customers.jsx';

export default function AuditLog({ th, lang, worker }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { get('/audit-log').then(r => { setList(Array.isArray(r) ? r : []); setLoading(false); }).catch(() => setLoading(false)); }, []);

  return (
    <div>
      <Header th={th} lang={lang} title={t('audit_log', lang)} count={list.length} />
      {loading && <Spinner />}
      {!loading && list.length === 0 && <Empty icon="📜" title={t('no_results', lang)} th={th} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {list.map(a => (
          <div key={a.id} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 12px', background: th.card, border: `1px solid ${th.border}`,
            borderRadius: '6px', fontSize: '11px',
          }}>
            <span style={{ color: a.worker_color || C.O, fontWeight: 700, minWidth: '90px' }}>{a.worker_name || '—'}</span>
            <Pill c={C.B}>{a.action}</Pill>
            <span style={{ color: th.sub, fontFamily: 'DM Mono', minWidth: '120px' }}>{a.entity}#{a.entity_id}</span>
            <span style={{ flex: 1, color: th.muted, fontFamily: 'DM Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.details}</span>
            <span style={{ color: th.muted, fontFamily: 'DM Mono', fontSize: '10px' }}>{dt(a.created_at, lang)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
