import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';

export default function Staff() {
  const [nowServing, setNowServing] = useState(null);
  const [waiting, setWaiting] = useState([]);
  const [resolved, setResolved] = useState([]);

  const fetchData = async () => {
    const { data: progress } = await supabase
      .from('tickets').select('*').eq('status', 'progress').limit(1).maybeSingle();
    const { data: waitingList } = await supabase
      .from('tickets').select('*').eq('status', 'waiting').order('created_at', { ascending: true });
    const { data: resolvedList } = await supabase
      .from('tickets').select('*').eq('status', 'resolved').order('created_at', { ascending: false }).limit(5);

    setNowServing(progress || null);
    setWaiting(waitingList || []);
    setResolved(resolvedList || []);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('staff-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const callNext = async () => {
    if (waiting.length === 0) return;
    const next = waiting[0];
    await supabase.from('tickets').update({ status: 'progress' }).eq('id', next.id);
  };

  const markResolved = async () => {
    if (!nowServing) return;
    await supabase.from('tickets').update({ status: 'resolved' }).eq('id', nowServing.id);
  };

  const sendBack = async () => {
    if (!nowServing) return;
    await supabase.from('tickets').update({ status: 'waiting' }).eq('id', nowServing.id);
  };

  return (
    <>
      <div className="topbar">
        <div className="logo">flydubai <span>IT Helpdesk</span></div>
        <div className="tabs">
          <Link className="tab" to="/register">Register</Link>
          <Link className="tab" to="/display">Display Screen</Link>
          <Link className="tab active" to="/staff">Staff Panel</Link>
          <Link className="tab" to="/admin">Admin</Link>
        </div>
      </div>
      <div className="container">
        {nowServing ? (
          <div className="call-banner">
            <div className="label">Currently Helping</div>
            <div className="tk">{nowServing.token}</div>
            <div style={{ marginTop: '10px', color: '#ccc' }}>
              <strong>{nowServing.full_name}</strong> · {nowServing.phone} · {nowServing.department}
              <div className="issue-tags"><span>{nowServing.issue_type}</span></div>
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#999' }}>{nowServing.details}</div>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="primary" style={{ width: 'auto', padding: '10px 24px' }} onClick={markResolved}>
                Mark Resolved
              </button>
              <button className="secondary" onClick={sendBack}>Send Back to Queue</button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center' }}>
            <button
              className="primary"
              onClick={callNext}
              disabled={waiting.length === 0}
              style={waiting.length === 0 ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
            >
              {waiting.length === 0 ? 'No One Waiting' : 'Call Next Token'}
            </button>
          </div>
        )}

        <div className="card">
          <h2>Waiting Queue ({waiting.length})</h2>
          {waiting.length === 0 ? (
            <div className="empty">Queue is empty</div>
          ) : (
            waiting.map((t) => (
              <div className="staff-row" key={t.id}>
                <div className="staff-info">
                  <div className="tk">{t.token}</div>
                  <div className="details">{t.full_name} · {t.phone} · {t.department}</div>
                  <div className="issue-tags"><span>{t.issue_type}</span></div>
                </div>
                <span className="badge waiting">Waiting</span>
              </div>
            ))
          )}
        </div>

        {resolved.length > 0 && (
          <div className="card">
            <h2>Recently Resolved</h2>
            {resolved.map((t) => (
              <div className="staff-row" key={t.id}>
                <div className="staff-info">
                  <div className="tk">{t.token}</div>
                  <div className="details">{t.full_name} · {t.issue_type}</div>
                </div>
                <span className="badge resolved">Resolved</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}