import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';

export default function Display() {
  const [nowServing, setNowServing] = useState(null);
  const [waiting, setWaiting] = useState([]);

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

    setNowServing(progress || null);
    setWaiting(waitingList || []);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('display-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <>
      <div className="topbar">
        <div className="logo">flydubai <span>IT Helpdesk</span></div>
        <div className="tabs">
          <Link className="tab" to="/register">Register</Link>
          <Link className="tab active" to="/display">Display Screen</Link>
          <Link className="tab" to="/staff">Staff Panel</Link>
          <Link className="tab" to="/admin">Admin</Link>
        </div>
      </div>
      <div className="container">
        <div className="display-grid">
          <div className="now-serving">
            <div className="label">Now Serving</div>
            <div className="num">{nowServing ? nowServing.token : '—'}</div>
            <div className="meta">
              {nowServing ? `${nowServing.full_name} · ${nowServing.issue_type}` : 'Waiting for next call'}
            </div>
          </div>
          <div className="queue-list">
            <h3>Up Next ({waiting.length})</h3>
            {waiting.length === 0 ? (
              <div className="empty">No one waiting</div>
            ) : (
              waiting.map((t) => (
                <div className="queue-item" key={t.id}>
                  <span>{t.token}</span>
                  <span style={{ color: '#999', fontSize: '13px' }}>{t.issue_type}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="footer-note">Live updates via Supabase Realtime</div>
      </div>
    </>
  );
}