import { useState } from 'react';
import { supabase } from '../supabaseClient.js';

function genTokenLabel(n) {
  return 'FD-' + String(n).padStart(3, '0');
}

export default function Register() {
  const [form, setForm] = useState({
    fullName: '', phone: '', department: '', issueType: 'IT', details: ''
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.fullName || !form.phone || !form.department || !form.details) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);

    const { count } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true });

    const tokenNumber = (count || 0) + 1;
    const tokenLabel = genTokenLabel(tokenNumber);

    const { data, error: insertError } = await supabase
      .from('tickets')
      .insert([{
        token: tokenLabel,
        full_name: form.fullName,
        phone: form.phone,
        department: form.department,
        issue_type: form.issueType,
        details: form.details,
        status: 'waiting'
      }])
      .select()
      .single();

    setLoading(false);

    if (insertError) {
      setError('Something went wrong. Please try again.');
      console.error(insertError);
      return;
    }

    const { count: aheadCount } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting')
      .lt('created_at', data.created_at);

    setResult({ token: tokenLabel, ahead: aheadCount || 0 });
  };

  return (
    <>
      <div className="topbar">
        <div className="logo">flydubai <span>IT Helpdesk</span></div>
      </div>
      <div className="container">
        {result ? (
          <div className="card token-result">
            <div style={{ color: '#999', letterSpacing: '2px', fontSize: '14px' }}>YOUR TOKEN</div>
            <div className="token-number">{result.token}</div>
            <div className="position">
              {result.ahead === 0 ? "You're next in line!" : `${result.ahead} people ahead of you`}
            </div>
            <div style={{ marginTop: '20px', color: '#777', fontSize: '13px' }}>
              Please watch the Display Screen for your token to be called.
            </div>
            <button className="primary" style={{ marginTop: '24px' }} onClick={() => {
              setResult(null);
              setForm({ fullName: '', phone: '', department: '', issueType: 'IT', details: '' });
            }}>
              Register Another
            </button>
          </div>
        ) : (
          <div className="card">
            <h2>Register an Issue</h2>
            {error && <div style={{ color: '#ff9b9b', marginBottom: '10px' }}>{error}</div>}

            <label>Full Name</label>
            <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="e.g. Ahmed Khan" />

            <label>Phone Number</label>
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="e.g. 0501234567" />

            <label>Department</label>
            <input name="department" value={form.department} onChange={handleChange} placeholder="e.g. Cabin Crew Scheduling" />

            <label>Issue Type</label>
            <select name="issueType" value={form.issueType} onChange={handleChange}>
              <option value="IT">IT</option>
              <option value="Outlook Issue">Outlook Issue</option>
              <option value="Hardware Issue">Hardware Issue</option>
              <option value="Laptop Issue">Laptop Issue</option>
              <option value="Other Issue">Other Issue</option>
            </select>

            <label>Complaint Details</label>
            <textarea name="details" value={form.details} onChange={handleChange} placeholder="Describe the issue..." />

            <button className="primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting...' : 'Get Token'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}