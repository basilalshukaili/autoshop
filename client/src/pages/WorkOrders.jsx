import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../api.js';
import { C, ff, fd, MOTION } from '../theme.js';
import { t, dateOnly } from '../i18n.js';
import { Btn, Card, Pill, Tag, Empty, Spinner, statusColor, statusIcon, priorityColor } from '../ui.jsx';
import { Header } from './Customers.jsx';

const COLUMNS = ['urgent', 'open', 'in_progress', 'waiting_parts', 'ready'];

export default function WorkOrders({ th, lang, worker }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('board'); // board | list
  const [q, setQ] = useState('');
  const nav = useNavigate();

  const matches = (w) => {
    if (!q.trim()) return true;
    const needle = q.toLowerCase().trim();
    return [w.code, w.plate, w.customer_name, w.customer_phone, w.make, w.model, w.problem, w.technician_name]
      .filter(Boolean).some(v => String(v).toLowerCase().includes(needle));
  };

  const load = () => {
    setLoading(true);
    get('/work-orders').then(r => { setList(Array.isArray(r) ? r : []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <Header th={th} lang={lang} title={t('work_orders', lang)} count={list.length}
        action={<>
          <ViewToggle view={view} setView={setView} th={th} />
          <Btn c={C.O} onClick={() => nav('/work-orders/new')}>+ {t('new_work_order', lang)}</Btn>
        </>} />

      <input value={q} onChange={e => setQ(e.target.value)}
        placeholder={lang === 'ar' ? '🔍 ابحث بالرمز أو اللوحة أو الاسم أو الهاتف أو المشكلة…' : '🔍 Search by code, plate, name, phone, problem…'}
        style={{
          width: '100%', maxWidth: 520, padding: '10px 14px',
          borderRadius: 8, border: `1px solid ${th.borderS}`,
          background: th.inputBg, color: th.txt, fontSize: 13,
          outline: 'none', marginBottom: 14, fontFamily: ff(lang),
          direction: lang === 'ar' ? 'rtl' : 'ltr',
        }} />

      {loading && <Spinner />}
      {!loading && list.length === 0 && (
        <Empty icon="🛠️" title={t('no_results', lang)}
          hint={lang === 'ar' ? 'ابدأ بإنشاء أول أمر عمل' : 'Get started by creating your first work order'}
          th={th}
          action={<Btn c={C.O} onClick={() => nav('/work-orders/new')}>+ {t('new_work_order', lang)}</Btn>} />
      )}

      {!loading && view === 'board' && (
        <div className="stagger kanban-board">
          {COLUMNS.map(s => {
            const items = list.filter(w => w.status === s).filter(matches);
            const col = statusColor(s);
            return (
              <div key={s} style={{ minWidth: 260 }}>
                {/* Column header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12,
                  padding: '8px 12px',
                  background: th.miniCard,
                  border: `1px solid ${col}25`,
                  borderRadius: 10,
                  borderTop: `2px solid ${col}`,
                }}>
                  <span style={{ fontSize: 16 }}>{statusIcon(s)}</span>
                  <span style={{
                    fontSize: 11, color: col, fontWeight: 800, letterSpacing: '1.5px',
                    fontFamily: "'JetBrains Mono', monospace", flex: 1,
                  }}>
                    {(t(`status_${s}`, lang) || s).toUpperCase()}
                  </span>
                  <span style={{
                    fontSize: 11, color: th.sub, fontWeight: 700,
                    background: th.surf, padding: '2px 8px', borderRadius: 999,
                    border: `1px solid ${th.border}`,
                  }}>{items.length}</span>
                </div>
                {/* Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map(w => <JobCard key={w.id} w={w} th={th} lang={lang} onClick={() => nav(`/work-orders/${w.id}`)} />)}
                  {items.length === 0 && (
                    <div style={{
                      fontSize: 11, color: th.muted, padding: '20px 16px',
                      textAlign: 'center',
                      border: `1px dashed ${th.border}`, borderRadius: 10,
                      background: th.miniCard,
                    }}>—</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && view === 'list' && (
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {list.filter(w => w.status !== 'invoiced').filter(matches).map(w => (
            <button key={w.id} onClick={() => nav(`/work-orders/${w.id}`)} className="lift" style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: th.surf,
              border: `1px solid ${statusColor(w.status)}25`,
              borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
              color: th.txt, textAlign: lang === 'ar' ? 'right' : 'left',
              flexDirection: lang === 'ar' ? 'row-reverse' : 'row',
              transition: `all ${MOTION.fast}`,
              boxShadow: th.shadow1,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${statusColor(w.status)}66`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = `${statusColor(w.status)}25`; }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${statusColor(w.status)}1A`,
                border: `1px solid ${statusColor(w.status)}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>{statusIcon(w.status)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13.5, fontWeight: 700, fontFamily: ff(lang),
                  letterSpacing: '-0.005em',
                }}>
                  {w.make} {w.model} · {w.customer_name}
                </div>
                <div style={{
                  fontSize: 11, color: th.sub,
                  fontFamily: "'JetBrains Mono', monospace", marginTop: 3,
                }}>
                  {w.code} · 🔢 {w.plate} {w.technician_name && `· 👤 ${w.technician_name}`} · {dateOnly(w.opened_at, lang)}
                </div>
                {w.problem && (
                  <div style={{
                    fontSize: 11, color: th.sub, marginTop: 4,
                    fontFamily: ff(lang), fontStyle: 'italic',
                  }}>"{w.problem}"</div>
                )}
              </div>
              {w.priority === 'urgent' && <Pill c={C.R} glow>{t('urgent', lang)}</Pill>}
              <Pill c={statusColor(w.status)}>{t(`status_${w.status}`, lang) || w.status}</Pill>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ViewToggle({ view, setView, th }) {
  return (
    <div style={{
      display: 'inline-flex', gap: 2, padding: 3,
      background: th.miniCard, borderRadius: 9,
      border: `1px solid ${th.border}`, marginRight: 8,
    }}>
      {[['board', '📋'], ['list', '≡']].map(([v, icon]) => (
        <button key={v} onClick={() => setView(v)} style={{
          background: view === v ? `${C.O}25` : 'transparent',
          border: 'none', borderRadius: 7,
          padding: '6px 12px', cursor: 'pointer',
          color: view === v ? C.O : th.sub,
          fontSize: 13, fontWeight: 700,
          transition: `all ${MOTION.fast}`,
        }}>{icon}</button>
      ))}
    </div>
  );
}

function JobCard({ w, th, lang, onClick }) {
  const col = statusColor(w.status);
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'block', width: '100%',
        textAlign: lang === 'ar' ? 'right' : 'left',
        background: th.surf,
        border: `1px solid ${hover ? col + '60' : col + '20'}`,
        borderRadius: 11, padding: '12px 14px',
        cursor: 'pointer', color: th.txt,
        transition: `all ${MOTION.fast}`,
        transform: hover ? 'translateY(-2px)' : 'none',
        boxShadow: hover ? `0 8px 22px rgba(0,0,0,.18), 0 0 0 1px ${col}33` : th.shadow1,
        position: 'relative', overflow: 'hidden',
      }}>
      {/* Top accent strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: col, opacity: hover ? 1 : .55,
        transition: `opacity ${MOTION.fast}`,
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginTop: 4 }}>
        <div style={{
          fontSize: 12, fontWeight: 800,
          fontFamily: "'JetBrains Mono', monospace",
          color: th.txt, letterSpacing: '.5px',
        }}>{w.code}</div>
        {w.priority === 'urgent' && (
          <span style={{
            fontSize: 9, color: C.R, fontWeight: 800,
            background: `${C.R}1A`, border: `1px solid ${C.R}40`,
            padding: '2px 7px', borderRadius: 4, letterSpacing: '.5px',
          }}>🔴 URG</span>
        )}
      </div>
      <div style={{
        fontSize: 13, color: th.txt, marginTop: 6,
        fontFamily: ff(lang), fontWeight: 600,
        letterSpacing: '-0.005em',
      }}>
        {w.make} {w.model}
      </div>
      <div style={{
        fontSize: 10.5, color: th.sub, marginTop: 3,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {w.plate} · {w.customer_name}
      </div>
      {w.problem && (
        <div style={{
          fontSize: 11, color: th.sub, marginTop: 8,
          fontFamily: ff(lang),
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontStyle: 'italic',
        }}>"{w.problem}"</div>
      )}
      {w.technician_name && (
        <div style={{
          fontSize: 10.5, color: w.technician_color || th.sub,
          marginTop: 8, fontFamily: ff(lang), fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span>👤</span>{w.technician_name}
        </div>
      )}
    </button>
  );
}
