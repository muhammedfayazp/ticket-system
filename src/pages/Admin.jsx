import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('all');

  const fetchTickets = async () => {
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });
    setTickets(data || []);
  };

  useEffect(() => {
    if (!authed) return;
    fetchTickets();
    const channel = supabase
      .channel('admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchTickets)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [authed]);

  const handleLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthed(true);
    } else {
      setLoginError('Incorrect password.');
    }
  };

  const resetQueue = async () => {
    if (!confirm('This will delete ALL tickets permanently. Continue?')) return;
    await supabase.from('tickets').delete().neq('id', '');
    fetchTickets();
  };

  const deleteTicket = async (id, token) => {
    if (!confirm(`Delete ticket ${token}?`)) return;
    await supabase.from('tickets').delete().eq('id', id);
    fetchTickets();
  };

  if (!authed) {
    return (
      <>
        <div className="topbar">
          <div className="logo">flydubai <span>IT Helpdesk</span></div>
        </div>
        <div className="container">
          <div className="card login-box">
            <h2>Admin Login</h2>
            {loginError && <div style={{ color: '#ff9b9b', marginBottom: '10px' }}>{loginError}</div>}
            <label>Password</label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Enter admin password"
            />
            <button className="primary" onClick={handleLogin}>Login</button>
          </div>
        </div>
      </>
    );
  }

  const totalCount = tickets.length;
  const waitingCount = tickets.filter((t) => t.status === 'waiting').length;
  const progressCount = tickets.filter((t) => t.status === 'progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;
  const filtered = filter === 'all' ? tickets : tickets.filter((t) => t.status === filter);

  return (
    <>
      <div className="topbar">
        <div className="logo">flydubai <span>IT Helpdesk</span></div>
      </div>
      <div className="container">
        <div className="stats-grid">
          <div className="stat-box"><div className="num">{totalCount}</div><div className="lbl">Total Tickets</div></div>
          <div className="stat-box"><div className="num">{waitingCount}</div><div className="lbl">Waiting</div></div>
          <div className="stat-box"><div className="num">{progressCount}</div><div className="lbl">In Progress</div></div>
          <div className="stat-box"><div className="num">{resolvedCount}</div><div className="lbl">Resolved</div></div>
        </div>

        <div className="card">
          <div className="admin-row">
            <div>
              <strong>Queue Controls</strong>
              <div style={{ fontSize: '13px', color: '#999', marginTop: '4px' }}>
                Reset clears all tickets permanently.
              </div>
            </div>
            <button className="danger" onClick={resetQueue}>Reset Entire Queue</button>
          </div>
        </div>

        <div className="card">
          <h2>All Tickets</h2>
          <div className="filter-row">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="waiting">Waiting</option>
              <option value="progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          {filtered.length === 0 ? (
            <div className="empty">No tickets found</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Token</th><th>Name</th><th>Phone</th><th>Department</th>
                  <th>Issue</th><th>Status</th><th>Created</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td><strong style={{ color: 'var(--fd-orange)' }}>{t.token}</strong></td>
                    <td>{t.full_name}</td>
                    <td>{t.phone}</td>
                    <td>{t.department}</td>
                    <td>{t.issue_type}</td>
                    <td><span className={`badge ${t.status}`}>{t.status}</span></td>
                    <td style={{ color: '#999', fontSize: '12px' }}>
                      {new Date(t.created_at).toLocaleString()}
                    </td>
                    <td>
                      <button className="danger" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={() => deleteTicket(t.id, t.token)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}