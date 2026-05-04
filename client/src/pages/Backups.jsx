import { useEffect, useState, useRef } from 'react';
import { get, post, del } from '../api.js';
import { C, ff } from '../theme.js';
import { t, dt } from '../i18n.js';
import { Btn, Card, Pill, Tag, Modal, Spinner, Empty, useToast } from '../ui.jsx';
import { Header } from './Customers.jsx';

export default function Backups({ th, lang, worker }) {
  const [accounts, setAccounts] = useState([]);
  const [log, setLog] = useState([]);
  const [localList, setLocalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [linking, setLinking] = useState(false);
  const [showPwd, setShowPwd] = useState(null);
  const popupRef = useRef(null);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [a, l, b] = await Promise.all([
        get('/backup/accounts').catch(() => []),
        get('/backup/log').catch(() => []),
        get('/backups').catch(() => []),
      ]);
      setAccounts(Array.isArray(a) ? a : []);
      setLog(Array.isArray(l) ? l : []);
      setLocalList(Array.isArray(b) ? b : []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Listen for the OAuth popup signal
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'autoshop-backup-linked') {
        setLinking(false);
        toast.push(`✓ ${lang === 'ar' ? 'تم ربط' : 'Linked'} ${e.data.email}`, C.G);
        load();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [lang]);

  const link = async () => {
    try {
      const { url } = await get('/backup/auth-url');
      setLinking(true);
      const w = 520, h = 640;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top = window.screenY + (window.outerHeight - h) / 2;
      popupRef.current = window.open(url, 'autoshop-oauth', `width=${w},height=${h},left=${left},top=${top}`);
      // Poll in case postMessage is blocked
      const id = setInterval(() => {
        if (popupRef.current?.closed) {
          clearInterval(id);
          setLinking(false);
          load();
        }
      }, 1000);
    } catch (e) { toast.push(e.message, C.R); setLinking(false); }
  };

  const activate = async (a) => {
    try {
      await post(`/backup/accounts/${a.id}/activate`);
      toast.push(`✓ ${a.email} ${lang === 'ar' ? 'مُفعّل' : 'is active'}`, C.G);
      load();
    } catch (e) { toast.push(e.message, C.R); }
  };

  const runNow = async (a) => {
    try {
      setBusy(true);
      await post(`/backup/accounts/${a.id}/run`);
      toast.push(`⏳ ${lang === 'ar' ? 'بدأ النسخ الاحتياطي' : 'Backup started in background'}`, C.B);
      // Refresh the log periodically while it runs
      let tries = 0;
      const id = setInterval(() => {
        load();
        if (++tries > 30) clearInterval(id);
      }, 4000);
    } catch (e) { toast.push(e.message, C.R); }
    finally { setBusy(false); }
  };

  const unlink = async (a) => {
    if (!confirm((lang === 'ar' ? 'إلغاء ربط ' : 'Unlink ') + a.email + '?')) return;
    try {
      const r = await del(`/backup/accounts/${a.id}`);
      if (r.password) setShowPwd({ email: a.email, password: r.password, oneTime: true });
      else load();
    } catch (e) { toast.push(e.message, C.R); }
  };

  const reveal = async (a) => {
    try {
      const { password } = await get(`/backup/accounts/${a.id}/password`);
      setShowPwd({ email: a.email, password, oneTime: false });
    } catch (e) { toast.push(e.message, C.R); }
  };

  const fmtBytes = (n) => !n ? '—' : n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;
  const ago = (ts) => {
    if (!ts) return lang === 'ar' ? 'لم تبدأ' : 'never';
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return lang === 'ar' ? 'الآن' : 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <Header th={th} lang={lang} title={t('backups', lang)} count={accounts.length}
        action={<Btn c={C.O} onClick={link} loading={linking}>☁️ {lang === 'ar' ? '+ ربط حساب جوجل درايف' : '+ Link Google Drive'}</Btn>} />

      <div style={{ background: `${C.B}10`, border: `1px solid ${C.B}30`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 11.5, color: th.sub }}>
        ℹ {lang === 'ar'
          ? 'النسخ الاحتياطي المدمج (restic + rclone) — تشفير، إزالة التكرار، تشغيل تلقائي يومي. أول مرة يُنشئ النظام مفاتيح restic ويُنزّل الأدوات تلقائياً.'
          : 'Cloud backup uses restic + rclone — block-level dedup, encrypted, runs daily automatically. First run downloads tools and creates the encrypted repo.'}
      </div>

      {/* Cloud accounts */}
      <SectionTitle th={th} lang={lang} icon="☁️" title={lang === 'ar' ? 'حسابات جوجل درايف' : 'Google Drive accounts'} />
      {accounts.length === 0 ? (
        <Empty icon="☁️" title={lang === 'ar' ? 'لا توجد حسابات مرتبطة' : 'No accounts linked yet'} th={th} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {accounts.map(a => (
            <Card key={a.id} c={a.is_active ? C.G : C.B} th={th}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 22 }}>{a.is_active ? '✅' : '☁️'}</span>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: th.txt, fontFamily: ff(lang), display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {a.email}
                    {a.is_active && <Pill c={C.G}>{lang === 'ar' ? 'نشط' : 'ACTIVE'}</Pill>}
                  </div>
                  <div style={{ fontSize: 11, color: th.sub, fontFamily: "'JetBrains Mono', monospace", marginTop: 3 }}>
                    {lang === 'ar' ? 'آخر نسخة' : 'Last backup'}: {ago(a.last_backup_at)}
                    {a.last_backup_status && ` · ${a.last_backup_status}`}
                    {a.bytes_total > 0 && ` · ${fmtBytes(a.bytes_total)} ${lang === 'ar' ? 'إجمالي' : 'total'}`}
                  </div>
                  {a.last_backup_error && (
                    <div style={{ fontSize: 11, color: C.R, marginTop: 4 }}>⚠ {a.last_backup_error}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {!a.is_active && <Btn variant="ghost" c={C.G} onClick={() => activate(a)} style={{ padding: '6px 12px', fontSize: 11 }}>{lang === 'ar' ? '✓ تفعيل' : '✓ Make Active'}</Btn>}
                  <Btn c={C.O} onClick={() => runNow(a)} disabled={busy} style={{ padding: '6px 12px', fontSize: 11 }}>💾 {lang === 'ar' ? 'نسخ الآن' : 'Backup Now'}</Btn>
                  <Btn variant="ghost" c={C.B} onClick={() => reveal(a)} style={{ padding: '6px 12px', fontSize: 11 }}>🔑 {lang === 'ar' ? 'كلمة المرور' : 'Password'}</Btn>
                  <Btn variant="ghost" c={C.R} onClick={() => unlink(a)} style={{ padding: '6px 12px', fontSize: 11 }}>🔌 {lang === 'ar' ? 'إلغاء' : 'Unlink'}</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Backup history */}
      {log.length > 0 && (
        <>
          <SectionTitle th={th} lang={lang} icon="📜" title={lang === 'ar' ? 'سجل النسخ الاحتياطي' : 'Backup history'} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 24 }}>
            {log.slice(0, 10).map(e => (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', background: th.miniCard,
                border: `1px solid ${e.status === 'success' ? C.G + '30' : e.status === 'error' ? C.R + '30' : th.border}`,
                borderRadius: 8, fontSize: 11,
              }}>
                <span style={{ fontSize: 14 }}>
                  {e.status === 'success' ? '✅' : e.status === 'error' ? '❌' : '⏳'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: th.txt, fontWeight: 600 }}>{e.email || '—'}</div>
                  <div style={{ color: th.muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                    {dt(e.started_at, lang)} {e.snapshot_id && `· ${e.snapshot_id.slice(0, 8)}`}
                    {e.bytes_added != null && ` · +${fmtBytes(e.bytes_added)}`}
                  </div>
                  {e.error && <div style={{ color: C.R, fontSize: 10, marginTop: 2 }}>{e.error.slice(0, 200)}</div>}
                </div>
                <Tag c={e.status === 'success' ? C.G : e.status === 'error' ? C.R : C.B}>{e.status}</Tag>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Legacy local backups */}
      {localList.length > 0 && (
        <>
          <SectionTitle th={th} lang={lang} icon="💾" title={lang === 'ar' ? 'نسخ محلية (قديمة)' : 'Local backups (legacy)'} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {localList.slice(0, 8).map(b => (
              <div key={b.name} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', background: th.miniCard,
                border: `1px solid ${th.border}`, borderRadius: 8, fontSize: 11,
              }}>
                <span style={{ fontSize: 14 }}>💾</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: th.txt, fontFamily: "'JetBrains Mono', monospace" }}>{b.name}</div>
                  <div style={{ color: th.muted, fontSize: 10 }}>{dt(b.created, lang)}</div>
                </div>
                <div style={{ color: th.sub, fontFamily: "'JetBrains Mono', monospace" }}>{fmtBytes(b.size)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal open={!!showPwd} onClose={() => setShowPwd(null)}
        title={(lang === 'ar' ? 'كلمة مرور النسخ الاحتياطي — ' : 'Backup repo password — ') + (showPwd?.email || '')}
        th={th} lang={lang} width={520}>
        <div style={{ background: `${C.O}15`, border: `1px solid ${C.O}40`, borderRadius: 10, padding: 14, fontSize: 12, color: th.txt, marginBottom: 14 }}>
          ⚠️ {lang === 'ar'
            ? 'هذه كلمة المرور تُستخدم لاستعادة بياناتك من جوجل درايف. احفظها في مكان آمن. بدونها لا يمكن فك تشفير النسخ الاحتياطية.'
            : 'This password is required to restore your data from Google Drive. Save it somewhere safe. Without it the backups cannot be decrypted.'}
        </div>
        {showPwd?.oneTime && (
          <div style={{ background: `${C.R}15`, border: `1px solid ${C.R}40`, borderRadius: 10, padding: 12, fontSize: 11, color: C.R, marginBottom: 14 }}>
            🚨 {lang === 'ar' ? 'هذه آخر فرصة لرؤية كلمة المرور — لن تتمكن من استرجاعها مرة أخرى' : 'Last chance — you will not be able to retrieve this password again.'}
          </div>
        )}
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 14,
          background: th.inputBg, border: `1px solid ${th.borderS}`,
          borderRadius: 8, padding: '12px 16px', wordBreak: 'break-all', userSelect: 'all',
        }}>
          {showPwd?.password}
        </div>
        <Btn c={C.B} onClick={() => { navigator.clipboard.writeText(showPwd.password); toast.push('✓ Copied', C.G); }} style={{ marginTop: 12 }}>
          📋 {lang === 'ar' ? 'نسخ' : 'Copy'}
        </Btn>
      </Modal>
    </div>
  );
}

function SectionTitle({ th, lang, icon, title }) {
  return (
    <div style={{
      fontSize: 11, color: th.muted, letterSpacing: '2px', fontWeight: 700,
      textTransform: 'uppercase', marginBottom: 12, marginTop: 6,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span>{title}</span>
    </div>
  );
}
