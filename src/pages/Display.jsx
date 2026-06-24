import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';

export default function Display() {
  const [nowServing, setNowServing] = useState(null);
  const [waiting, setWaiting] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [now, setNow] = useState(new Date());

  const fetchData = async () => {
    const { data: progress } = await supabase
      .from('tickets')
      .select('*')
      .eq('status', 'progress')
      .limit(1)
      .maybeSingle();

    const { data: waitingList } = await supabase
      .from('tickets')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: true });

    const { count: progressTotal } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'progress');

    const { count: resolvedTotal } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'resolved');

    setNowServing(progress || null);
    setWaiting(waitingList || []);
    setPendingCount(progressTotal || 0);
    setDoneCount(resolvedTotal || 0);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('display-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const tokenNum = (t) => t.token.replace('FD-', '').replace(/^0+/, '') || '0';

  return (
    <div style={{ minHeight: '100vh', background: '#eef1f5', fontFamily: "'Segoe UI', Arial, sans-serif", color: '#1e293b' }}>
      <div style={{
        background: '#fff', padding: '18px 32px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '50%', background: '#0a2a5e',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
          }}>✈️</div>
          <span style={{ fontWeight: 800, fontSize: '20px' }}>flydubai IT Booth</span>
        </div>
        <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '2px', color: '#0a2a5e' }}>
          TOKEN DISPLAY SYSTEM
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 800, fontSize: '22px' }}>{timeStr}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', letterSpacing: '1px' }}>{dateStr.toUpperCase()}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', minHeight: 'calc(100vh - 76px)' }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '40px'
        }}>
          <div style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '3px', color: '#64748b', marginBottom: '20px' }}>
            NOW SERVING
          </div>
          <div style={{ fontSize: '160px', fontWeight: 800, color: nowServing ? '#0a2a5e' : '#aab4c2', lineHeight: 1 }}>
            {nowServing ? String(tokenNum(nowServing)).padStart(2, '0') : '00'}
          </div>
          {nowServing ? (
            <>
              <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '14px', color: '#1e293b' }}>
                {nowServing.full_name}
              </div>
              <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>
                {nowServing.issue_type} · {nowServing.department}
              </div>
            </>
          ) : (
            <div style={{ fontSize: '18px', color: '#94a3b8', marginTop: '14px' }}>Waiting for next call...</div>
          )}

          <Link to="/register" style={{
            marginTop: '44px', background: '#E96A25', color: '#fff', fontWeight: 700,
            padding: '14px 32px', borderRadius: '10px', textDecoration: 'none', fontSize: '15px'
          }}>
            + Raise a Ticket
          </Link>
        </div>

        <div style={{ background: '#f8fafc', borderLeft: '1px solid #e2e8f0', padding: '32px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '2px', color: '#64748b', marginBottom: '16px' }}>
            ↗ UP NEXT
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
            {waiting.length === 0 ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>No one waiting</div>
            ) : (
              waiting.slice(0, 6).map((t, i) => (
                <div key={t.id} style={{
                  background: '#fff', borderRadius: '14px', padding: '20px 24px',
                  display: 'flex', alignItems: 'center', gap: '20px',
                  border: i === 0 ? '2px solid #0a2a5e' : '1px solid #e2e8f0'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#0a2a5e', minWidth: '50px' }}>
                    {tokenNum(t)}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#334155' }}>
                    {t.full_name}
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '24px',
            background: '#fff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#E96A25' }}>{waiting.length}</div>
              <div style={{ fontSize: '11px', letterSpacing: '1px', color: '#94a3b8', fontWeight: 700 }}>WAITING</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#7c3aed' }}>{pendingCount}</div>
              <div style={{ fontSize: '11px', letterSpacing: '1px', color: '#94a3b8', fontWeight: 700 }}>PENDING</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a' }}>{doneCount}</div>
              <div style={{ fontSize: '11px', letterSpacing: '1px', color: '#94a3b8', fontWeight: 700 }}>DONE</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}