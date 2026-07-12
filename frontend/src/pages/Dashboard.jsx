import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend,
} from 'chart.js';
import api from '../api/axios';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const TABS = ['Dashboard', 'Environmental', 'Social', 'Governance', 'Gamification', 'Rewards', 'Settings', 'Reports'];

export default function Dashboard() {
  const [tab, setTab] = useState('Dashboard');
  const [me, setMe] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myBadges, setMyBadges] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [trend, setTrend] = useState([]);
  const [activities, setActivities] = useState([]);
  const [participation, setParticipation] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [acks, setAcks] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [balance, setBalance] = useState({ balance: 0, total_earned: 0, total_spent: 0 });
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [proofInputs, setProofInputs] = useState({});
  const [joinedChallengeIds, setJoinedChallengeIds] = useState(new Set());
  const [completedChallengeIds, setCompletedChallengeIds] = useState(new Set());
  const [audits, setAudits] = useState([]);
  const [complianceIssues, setComplianceIssues] = useState([]);
  const [newAudit, setNewAudit] = useState({ title: '', department_id: '', auditor: '', audit_date: '', findings: '' });
  const [newIssue, setNewIssue] = useState({ severity: 'medium', description: '', department_id: '', owner: '', due_date: '', audit_id: '' });
  const [categories, setCategories] = useState([]);
  const [esgConfig, setEsgConfig] = useState({ auto_emission_calculation: false, evidence_requirement: false, badge_auto_award: true });
  const [notifSettings, setNotifSettings] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [newDept, setNewDept] = useState({ name: '', code: '', parent_department_id: '', status: 'active' });
  const [newCategory, setNewCategory] = useState({ name: '', type: 'csr_activity' });
  const [reportFilters, setReportFilters] = useState({
  module: 'environmental', department_id: '', employee_id: '',
  challenge_id: '', esg_category: '', start_date: '', end_date: '',
  });
  const [reportPreview, setReportPreview] = useState(null); 
  const [reportLoading, setReportLoading] = useState(false);
  const navigate = useNavigate();
  const notifRef = useRef(null);

  const loadAll = async (employeeId) => {
    api.get('/carbon/summary/by-department').then((r) => setDepartments(r.data)).catch(console.error);
    api.get('/challenges').then((r) => setChallenges(r.data)).catch(console.error);
    api.get('/employees/leaderboard').then((r) => setLeaderboard(r.data)).catch(console.error);
    api.get('/badges').then((r) => setAllBadges(r.data)).catch(console.error);
    api.get('/carbon/trend').then((r) => setTrend(r.data)).catch(console.error);
    api.get('/social/activities').then((r) => setActivities(r.data)).catch(console.error);
    api.get('/social/participation').then((r) => setParticipation(r.data)).catch(console.error);
    api.get('/governance/policies').then((r) => setPolicies(r.data)).catch(console.error);
    api.get('/governance/acknowledgements').then((r) => setAcks(r.data)).catch(console.error);
    api.get('/rewards').then((r) => setRewards(r.data)).catch(console.error);
    api.get('/rewards/redemptions').then((r) => setRedemptions(r.data)).catch(console.error);
    api.get('/governance/audits').then((r) => setAudits(r.data)).catch(console.error);
    api.get('/governance/compliance-issues').then((r) => setComplianceIssues(r.data)).catch(console.error);
    api.get('/departments').then((r) => setAllDepartments(r.data)).catch(console.error);
    api.get('/categories').then((r) => setCategories(r.data)).catch(console.error);
    api.get('/settings/esg-configuration').then((r) => setEsgConfig(r.data)).catch(console.error);
    api.get('/settings/notification-settings').then((r) => setNotifSettings(r.data)).catch(console.error);
    if (employeeId) {
      api.get(`/badges/employee/${employeeId}`).then((r) => setMyBadges(r.data)).catch(console.error);
      api.get(`/rewards/balance/${employeeId}`).then((r) => setBalance(r.data)).catch(console.error);
      api.get(`/notifications/${employeeId}`).then((r) => setNotifications(r.data)).catch(console.error);
      api.get(`/challenges/participation`, { params: { employee_id: employeeId } })
        .then((r) => {
          const joined = new Set(r.data.map((p) => p.challenge_id));
          const completed = new Set(r.data.filter((p) => p.status === 'completed').map((p) => p.challenge_id));
          setJoinedChallengeIds(joined);
          setCompletedChallengeIds(completed);
        })
        .catch(console.error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    api.get('/employees/me')
      .then((res) => { setMe(res.data); loadAll(res.data.id); })
      .catch(() => loadAll(null));
  }, [navigate]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
  if (tab !== 'Reports') setReportPreview(null);
  }, [tab]);

  const setMyDepartment = async (department_id) => {
    if (!me) return;
    await api.put(`/employees/${me.id}`, { department_id });
    const res = await api.get('/employees/me');
    setMe(res.data);
    loadAll(res.data.id);
  };

  const joinChallenge = async (id) => {
    if (!me) return alert('No employee record linked yet');
    try {
      await api.post(`/challenges/${id}/join`, { employee_id: me.id });
      setJoinedChallengeIds((prev) => new Set(prev).add(id));
      loadAll(me.id);
    } catch (err) {
      if (err.response?.status === 409) {
        setJoinedChallengeIds((prev) => new Set(prev).add(id));
      } else {
        alert(err.response?.data?.error || 'Failed to join');
      }
    }
  };

  const completeChallenge = async (id) => {
    if (!me) return alert('No employee record linked yet');
    try {
      const res = await api.post(`/challenges/${id}/complete`, { employee_id: me.id });
      setCompletedChallengeIds((prev) => new Set(prev).add(id));
      if (res.data.new_badges?.length) {
        alert(`New badge: ${res.data.new_badges.map(b => b.name).join(', ')}`);
      } else {
        alert(`Challenge completed — ${res.data.participation?.xp_earned ?? ''} XP earned.`);
      }
      loadAll(me.id);
    } catch (err) { alert(err.response?.data?.error || 'Failed to complete'); }
  };

  const joinActivity = async (id) => {
    if (!me) return alert('No employee record linked yet');
    const proof_url = proofInputs[id] || null;
    try { await api.post(`/social/activities/${id}/join`, { employee_id: me.id, proof_url }); loadAll(me.id); }
    catch (err) { alert(err.response?.data?.error || 'Failed to join'); }
  };

  const approveParticipation = async (id) => {
    try { await api.post(`/social/participation/${id}/approve`); loadAll(me?.id); }
    catch (err) { alert(err.response?.data?.error || 'Failed to approve'); }
  };

  const rejectParticipation = async (id) => {
    try { await api.post(`/social/participation/${id}/reject`); loadAll(me?.id); }
    catch (err) { alert(err.response?.data?.error || 'Failed to reject'); }
  };

  const acknowledgePolicy = async (id) => {
    if (!me) return alert('No employee record linked yet');
    try { await api.post(`/governance/policies/${id}/acknowledge`, { employee_id: me.id }); loadAll(me.id); }
    catch (err) { alert(err.response?.data?.error || 'Failed to acknowledge'); }
  };

  const redeemReward = async (id) => {
    if (!me) return alert('No employee record linked yet');
    try {
      await api.post(`/rewards/${id}/redeem`, { employee_id: me.id });
      loadAll(me.id);
    } catch (err) { alert(err.response?.data?.error || 'Redemption failed'); }
  };

  const markNotifRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (err) { console.error(err); }
  };

  const resolveIssue = async (id) => {
    try {
      await api.put(`/governance/compliance-issues/${id}/status`, { status: 'resolved' });
      loadAll(me?.id);
    } catch (err) { alert(err.response?.data?.error || 'Failed to update issue'); }
  };

  const severityColor = (s) => ({ high: '#ef4444', medium: '#f59e0b', low: '#8b93a7' }[s?.toLowerCase()] || '#8b93a7');

  const createAudit = async () => {
    if (!newAudit.title) return alert('Title is required');
    try {
      await api.post('/governance/audits', newAudit);
      setNewAudit({ title: '', department_id: '', auditor: '', audit_date: '', findings: '' });
      loadAll(me?.id);
    } catch (err) { alert(err.response?.data?.error || 'Failed to create audit'); }
  };

  const createIssue = async () => {
    if (!newIssue.description || !newIssue.owner || !newIssue.due_date) {
      return alert('Description, owner, and due date are required');
    }
    try {
      const res = await api.post('/governance/compliance-issues', newIssue);
      if (!res.data.owner_notified) {
        alert(`Issue created, but "${newIssue.owner}" doesn't match any user's name — they won't get a notification. Check spelling or use their exact account name.`);
      }
      setNewIssue({ severity: 'medium', description: '', department_id: '', owner: '', due_date: '', audit_id: '' });
      loadAll(me?.id);
    } catch (err) { alert(err.response?.data?.error || 'Failed to create issue'); }
  };

  const createDepartment = async () => {
    if (!newDept.name) return alert('Name is required');
    try {
      await api.post('/departments', { ...newDept, parent_department_id: newDept.parent_department_id || null });
      setNewDept({ name: '', code: '', parent_department_id: '', status: 'active' });
      loadAll(me?.id);
    } catch (err) { alert(err.response?.data?.error || 'Failed to create department'); }
  };

  const updateDepartmentStatus = async (id, status) => {
    try { await api.put(`/departments/${id}`, { status }); loadAll(me?.id); }
    catch (err) { alert(err.response?.data?.error || 'Failed to update department'); }
  };

  const deleteDepartment = async (id) => {
    try { await api.delete(`/departments/${id}`); loadAll(me?.id); }
    catch (err) { alert(err.response?.data?.error || 'Failed to delete department'); }
  };

  const createCategory = async () => {
    if (!newCategory.name) return alert('Name is required');
    try {
      await api.post('/categories', newCategory);
      setNewCategory({ name: '', type: 'csr_activity' });
      loadAll(me?.id);
    } catch (err) { alert(err.response?.data?.error || 'Failed to create category'); }
  };

  const toggleCategoryStatus = async (cat) => {
    try {
      await api.put(`/categories/${cat.id}`, { status: cat.status === 'active' ? 'inactive' : 'active' });
      loadAll(me?.id);
    } catch (err) { alert(err.response?.data?.error || 'Failed to update category'); }
  };

  const deleteCategory = async (id) => {
    try { await api.delete(`/categories/${id}`); loadAll(me?.id); }
    catch (err) { alert(err.response?.data?.error || 'Failed to delete category'); }
  };

  const updateEsgConfig = async (key, value) => {
    try {
      const res = await api.put('/settings/esg-configuration', { [key]: value });
      setEsgConfig(res.data);
    } catch (err) { alert(err.response?.data?.error || 'Failed to update configuration'); }
  };

  const toggleNotificationSetting = async (type, enabled) => {
    try {
      await api.put(`/settings/notification-settings/${type}`, { enabled });
      setNotifSettings((prev) => prev.map((n) => (n.type === type ? { ...n, enabled } : n)));
    } catch (err) { alert(err.response?.data?.error || 'Failed to update notification setting'); }
  };

  const logout = () => { localStorage.removeItem('token'); navigate('/login'); };

  const section = { marginTop: 24, background: '#12151c', padding: 24, borderRadius: 12, border: '1px solid #1f232c' };
  const table = { width: '100%', borderCollapse: 'collapse', marginTop: 12 };
  const th = { textAlign: 'left', padding: 8, borderBottom: '2px solid #ccc' };
  const td = { padding: 8, borderBottom: '1px solid #eee' };
  const btn = { padding: '4px 10px', marginRight: 6, cursor: 'pointer' };
  const toggle = (on) => ({
    width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
    background: on ? '#2563eb' : '#1f232c', border: '1px solid #1f232c',
    position: 'relative', transition: 'background 0.15s', flexShrink: 0,
  });
  const toggleKnob = (on) => ({
    width: 16, height: 16, borderRadius: '50%', background: 'white',
    position: 'absolute', top: 2, left: on ? 20 : 2, transition: 'left 0.15s',
  });
  const earnedBadgeIds = new Set(myBadges.map((b) => b.id));
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const trendData = {
    labels: trend.map((t) => new Date(t.date).toLocaleDateString()),
    datasets: [{ label: 'Total carbon logged (kg)', data: trend.map((t) => parseFloat(t.carbon_kg)), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.2)', tension: 0.3 }],
  };

  const acknowledgedPolicyIds = new Set(acks.filter(a => a.employee_id === me?.id).map(a => a.policy_id));
  const joinedActivityIds = new Set(participation.filter(p => p.employee_id === me?.id).map(p => p.activity_id));

  const totalCarbon = departments.reduce((sum, d) => sum + parseFloat(d.total_carbon_kg), 0);
  const envScore = Math.max(0, 100 - Math.min(totalCarbon / 5, 100)).toFixed(0);
  const socialScore = activities.length ? Math.round((participation.length / (activities.length * 3)) * 100) : 0;
  const govScore = policies.length ? Math.round((acks.length / (policies.length * 3)) * 100) : 0;
  const overallScore = Math.round(envScore * 0.4 + Math.min(socialScore, 100) * 0.3 + Math.min(govScore, 100) * 0.3);

  const downloadReport = (endpoint, params, format) => {
  const query = new URLSearchParams({ ...params, format }).toString();
  window.open(`${api.defaults.baseURL}${endpoint}?${query}`, '_blank');
  };
  const previewReport = async (endpoint, params) => {
  setReportLoading(true);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); 
  try {
    const query = new URLSearchParams({ ...params, format: 'json' }).toString();
    const res = await api.get(`${endpoint}?${query}`, { signal: controller.signal });
    setReportPreview(res.data);
  } catch (err) {
    if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
      alert('Report timed out — the backend took too long to respond.');
    } else {
      alert(err.response?.data?.error || 'Failed to generate report');
    }
  } finally {
    clearTimeout(timeoutId);
    setReportLoading(false);
  }
};

  const runCustomReport = () => previewReport('/reports/custom', reportFilters);

  const downloadCustomReport = (format) => downloadReport('/reports/custom', reportFilters, format);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', fontFamily: 'sans-serif', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>EcoSphere Dashboard</h1>
        <div ref={notifRef} style={{ display: 'flex', gap: 12, alignItems: 'center', position: 'relative' }}>
          <button onClick={() => setShowNotifs((v) => !v)} style={{ position: 'relative' }}>
            🔔
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unreadCount}
              </span>
            )}
          </button>
          {showNotifs && (
            <div style={{ position: 'absolute', top: 36, right: 0, width: 320, background: '#12151c', border: '1px solid #1f232c', borderRadius: 8, padding: 12, zIndex: 10, maxHeight: 400, overflowY: 'auto' }}>
              <strong>Notifications</strong>
              {notifications.length === 0 && <p style={{ color: '#8b93a7', fontSize: 13 }}>None yet.</p>}
              {notifications.map((n) => (
                <div key={n.id} onClick={() => markNotifRead(n.id)} style={{ padding: 8, marginTop: 6, borderRadius: 6, background: n.is_read ? 'transparent' : '#1f232c', cursor: 'pointer', fontSize: 13 }}>
                  <div>{n.message}</div>
                  <div style={{ color: '#8b93a7', fontSize: 11, marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16, borderBottom: '1px solid #1f232c', paddingBottom: 8, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px',
              background: tab === t ? '#2563eb' : 'transparent',
              color: tab === t ? 'white' : '#8b93a7',
              border: tab === t ? 'none' : '1px solid #1f232c',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {me && !me.department_id && (
        <div style={section}>
          <p>Pick your department to get started:</p>
          {departments.map((d) => (
            <button key={d.id} style={btn} onClick={() => setMyDepartment(d.id)}>{d.name}</button>
          ))}
        </div>
      )}

      {tab === 'Dashboard' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 24 }}>
            {[
              ['Environmental', envScore, '#4CAF50'],
              ['Social', Math.min(socialScore, 100), '#2196F3'],
              ['Governance', Math.min(govScore, 100), '#9C27B0'],
              ['Overall ESG', overallScore, '#00BCD4'],
            ].map(([label, score, color]) => (
              <div key={label} style={{ ...section, marginTop: 0, borderTop: `3px solid ${color}` }}>
                <div style={{ color: '#8b93a7', fontSize: 13 }}>{label} Score</div>
                <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{score} / 100</div>
              </div>
            ))}
          </div>
          <div style={section}>
            {me ? (
              <>
                <h2>Welcome, {me.name}</h2>
                <p>Department: <strong>{me.department || 'Not set'}</strong></p>
              </>
            ) : (
              <p style={{ color: '#ef4444' }}>
                No employee record linked to your account yet — Social, Governance, Gamification, and Rewards actions won't work until this is fixed. See backend signup/employee linking.
              </p>
            )}
          </div>
        </>
      )}

      {tab === 'Environmental' && (
        <>
          <div style={section}>
            <h2>Department Carbon Summary</h2>
            <table style={table}>
              <thead><tr><th style={th}>Department</th><th style={th}>Total (kg)</th><th style={th}>Target (kg)</th><th style={th}>Progress</th></tr></thead>
              <tbody>
                {departments.map((d) => {
                  const total = parseFloat(d.total_carbon_kg);
                  const target = d.target_kg ? parseFloat(d.target_kg) : null;
                  const pct = target ? Math.min((total / target) * 100, 100) : null;
                  return (
                    <tr key={d.id}>
                      <td style={td}>{d.name}</td>
                      <td style={td}>{d.total_carbon_kg}</td>
                      <td style={td}>{target ?? '—'}</td>
                      <td style={td}>
                        {target ? (
                          <div style={{ background: '#1f232c', borderRadius: 4, overflow: 'hidden', width: 120 }}>
                            <div style={{ width: `${pct}%`, background: pct >= 100 ? '#ef4444' : '#2563eb', height: 10 }} />
                          </div>
                        ) : 'No target set'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={section}>
            <h2>Carbon Trend Over Time</h2>
            {trend.length > 0 ? <Line data={trendData} /> : <p>No data yet.</p>}
          </div>
        </>
      )}

      {tab === 'Social' && (
        <>
          <div style={section}>
            <h2>CSR Activities</h2>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
              {activities.map((a) => (
                <div key={a.id} style={{ border: '1px solid #1f232c', borderRadius: 8, padding: 16, width: 220 }}>
                  <strong>{a.title}</strong>
                  <p style={{ fontSize: 13, color: '#8b93a7' }}>{a.description}</p>
                  <input
                    type="text"
                    placeholder="Proof URL (optional)"
                    value={proofInputs[a.id] || ''}
                    onChange={(e) => setProofInputs({ ...proofInputs, [a.id]: e.target.value })}
                    style={{ width: '100%', marginBottom: 8, padding: 4, fontSize: 12 }}
                  />
                  <button style={btn} disabled={joinedActivityIds.has(a.id)} onClick={() => joinActivity(a.id)}>
                    {joinedActivityIds.has(a.id) ? 'Joined' : 'Join'}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div style={section}>
            <h2>Employee Participation: approval queue</h2>
            <table style={table}>
              <thead><tr><th style={th}>Employee</th><th style={th}>Activity</th><th style={th}>Proof</th><th style={th}>Status</th><th style={th}>Actions</th></tr></thead>
              <tbody>
                {participation.map((p) => (
                  <tr key={p.id}>
                    <td style={td}>{p.employee_name}</td>
                    <td style={td}>{p.activity_title}</td>
                    <td style={td}>{p.proof_url ? <a href={p.proof_url} target="_blank" rel="noreferrer">view</a> : <span style={{ color: '#ef4444' }}>none</span>}</td>
                    <td style={td}>{p.approval_status}</td>
                    <td style={td}>
                      {p.approval_status === 'pending' && (
                        <>
                          <button style={btn} onClick={() => approveParticipation(p.id)}>Approve</button>
                          <button style={btn} onClick={() => rejectParticipation(p.id)}>Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'Governance' && (
        <>
          <div style={section}>
            <h2>ESG Policies</h2>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
              {policies.map((p) => (
                <div key={p.id} style={{ border: '1px solid #1f232c', borderRadius: 8, padding: 16, width: 220 }}>
                  <strong>{p.title}</strong>
                  <p style={{ fontSize: 13, color: '#8b93a7' }}>{p.description}</p>
                  <button style={btn} disabled={acknowledgedPolicyIds.has(p.id)} onClick={() => acknowledgePolicy(p.id)}>
                    {acknowledgedPolicyIds.has(p.id) ? 'Acknowledged' : 'Acknowledge'}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div style={section}>
            <h2>Policy Acknowledgements</h2>
            <table style={table}>
              <thead><tr><th style={th}>Employee</th><th style={th}>Policy</th><th style={th}>Date</th></tr></thead>
              <tbody>
                {acks.map((a) => (
                  <tr key={a.id}><td style={td}>{a.employee_name}</td><td style={td}>{a.policy_title}</td><td style={td}>{new Date(a.acknowledged_at).toLocaleDateString()}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={section}>
            <h2>Audits</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <input placeholder="Title" value={newAudit.title} onChange={(e) => setNewAudit({ ...newAudit, title: e.target.value })} style={{ padding: 6 }} />
              <select value={newAudit.department_id} onChange={(e) => setNewAudit({ ...newAudit, department_id: e.target.value })} style={{ padding: 6 }}>
                <option value="">Department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <input placeholder="Auditor" value={newAudit.auditor} onChange={(e) => setNewAudit({ ...newAudit, auditor: e.target.value })} style={{ padding: 6 }} />
              <input type="date" value={newAudit.audit_date} onChange={(e) => setNewAudit({ ...newAudit, audit_date: e.target.value })} style={{ padding: 6 }} />
              <input placeholder="Findings" value={newAudit.findings} onChange={(e) => setNewAudit({ ...newAudit, findings: e.target.value })} style={{ padding: 6, flex: 1, minWidth: 160 }} />
              <button style={btn} onClick={createAudit}>+ New Audit</button>
            </div>
            <table style={table}>
              <thead><tr><th style={th}>Title</th><th style={th}>Department</th><th style={th}>Auditor</th><th style={th}>Date</th><th style={th}>Findings</th><th style={th}>Status</th></tr></thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id}>
                    <td style={td}>{a.title}</td>
                    <td style={td}>{a.department_name || '—'}</td>
                    <td style={td}>{a.auditor || '—'}</td>
                    <td style={td}>{a.audit_date ? new Date(a.audit_date).toLocaleDateString() : '—'}</td>
                    <td style={td}>{a.findings || '—'}</td>
                    <td style={td}>{a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={section}>
            <h2>Compliance Issues</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <select value={newIssue.severity} onChange={(e) => setNewIssue({ ...newIssue, severity: e.target.value })} style={{ padding: 6 }}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <input placeholder="Description" value={newIssue.description} onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })} style={{ padding: 6, flex: 1, minWidth: 160 }} />
              <select value={newIssue.department_id} onChange={(e) => setNewIssue({ ...newIssue, department_id: e.target.value })} style={{ padding: 6 }}>
                <option value="">Department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select value={newIssue.audit_id} onChange={(e) => setNewIssue({ ...newIssue, audit_id: e.target.value })} style={{ padding: 6 }}>
                <option value="">Linked audit (optional)</option>
                {audits.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
              <input placeholder="Owner (exact account name)" value={newIssue.owner} onChange={(e) => setNewIssue({ ...newIssue, owner: e.target.value })} style={{ padding: 6 }} />
              <input type="date" value={newIssue.due_date} onChange={(e) => setNewIssue({ ...newIssue, due_date: e.target.value })} style={{ padding: 6 }} />
              <button style={btn} onClick={createIssue}>+ New Issue</button>
            </div>
            <table style={table}>
              <thead><tr><th style={th}>Issue</th><th style={th}>Severity</th><th style={th}>Department</th><th style={th}>Owner</th><th style={th}>Due Date</th><th style={th}>Status</th><th style={th}>Actions</th></tr></thead>
              <tbody>
                {complianceIssues.map((c) => (
                  <tr key={c.id} style={c.is_overdue ? { background: 'rgba(239,68,68,0.08)' } : undefined}>
                    <td style={td}>{c.description}</td>
                    <td style={td}><span style={{ color: severityColor(c.severity), fontWeight: 600 }}>{c.severity}</span></td>
                    <td style={td}>{c.department_name || '—'}</td>
                    <td style={td}>{c.owner}</td>
                    <td style={td}>
                      {c.due_date ? new Date(c.due_date).toLocaleDateString() : '—'}
                      {c.is_overdue && <span style={{ color: '#ef4444', marginLeft: 6, fontSize: 11 }}>OVERDUE</span>}
                    </td>
                    <td style={td}>{c.status}</td>
                    <td style={td}>
                      {c.status === 'open' && (
                        <button style={btn} onClick={() => resolveIssue(c.id)}>Mark Resolved</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'Gamification' && (
        <>
          <div style={section}>
            <h2>Challenges</h2>
            <table style={table}>
              <thead><tr><th style={th}>Title</th><th style={th}>XP</th><th style={th}>Difficulty</th><th style={th}>Actions</th></tr></thead>
              <tbody>
                {challenges.map((c) => (
                  <tr key={c.id}>
                    <td style={td}>{c.title}</td><td style={td}>{c.xp_reward}</td><td style={td}>{c.difficulty}</td>
                    <td style={td}>
                      <button
                        style={btn}
                        disabled={joinedChallengeIds.has(c.id)}
                        onClick={() => joinChallenge(c.id)}
                      >
                        {joinedChallengeIds.has(c.id) ? 'Joined' : 'Join'}
                      </button>
                      <button
                        style={btn}
                        disabled={completedChallengeIds.has(c.id)}
                        onClick={() => completeChallenge(c.id)}
                      >
                        {completedChallengeIds.has(c.id) ? 'Completed ✓' : 'Complete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={section}>
            <h2>Badges</h2>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
              {allBadges.map((b) => {
                const earned = earnedBadgeIds.has(b.id);
                return (
                  <div key={b.id} style={{ textAlign: 'center', padding: 16, borderRadius: 8, background: earned ? '#1f232c' : '#0f1115', border: earned ? '1px solid #2563eb' : '1px solid #1f232c', opacity: earned ? 1 : 0.4, width: 140 }}>
                    <div style={{ fontSize: 32 }}>{b.icon || '🏅'}</div>
                    <div style={{ fontWeight: 600, marginTop: 6 }}>{b.name}</div>
                    <div style={{ fontSize: 12, color: '#8b93a7', marginTop: 4 }}>{b.description}</div>
                    <div style={{ fontSize: 11, color: '#8b93a7', marginTop: 6 }}>{b.xp_required} XP</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={section}>
            <h2>Leaderboard</h2>
            <table style={table}>
              <thead><tr><th style={th}>Name</th><th style={th}>Total XP</th></tr></thead>
              <tbody>
                {leaderboard.sort((a, b) => b.total_xp - a.total_xp).map((l) => (
                  <tr key={l.employee_id}><td style={td}>{l.name}</td><td style={td}>{l.total_xp}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'Rewards' && (
        <>
          <div style={section}>
            <h2>Your Points Balance: {balance.balance}</h2>
            <p style={{ color: '#8b93a7', fontSize: 13 }}>Earned: {balance.total_earned} · Redeemed: {balance.total_spent}</p>
          </div>
          <div style={section}>
            <h2>Reward Catalog</h2>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
              {rewards.map((r) => {
                const canAfford = balance.balance >= r.points_required && r.stock > 0;
                return (
                  <div key={r.id} style={{ border: '1px solid #1f232c', borderRadius: 8, padding: 16, width: 220 }}>
                    <strong>{r.name}</strong>
                    <p style={{ fontSize: 13, color: '#8b93a7' }}>{r.description}</p>
                    <p style={{ fontSize: 13 }}>{r.points_required} pts · {r.stock} left</p>
                    <button style={btn} disabled={!canAfford} onClick={() => redeemReward(r.id)}>
                      {r.stock <= 0 ? 'Out of stock' : canAfford ? 'Redeem' : 'Not enough points'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={section}>
            <h2>Redemption History</h2>
            <table style={table}>
              <thead><tr><th style={th}>Employee</th><th style={th}>Reward</th><th style={th}>Points</th><th style={th}>Date</th></tr></thead>
              <tbody>
                {redemptions.map((r) => (
                  <tr key={r.id}><td style={td}>{r.employee_name}</td><td style={td}>{r.reward_name}</td><td style={td}>{r.points_spent}</td><td style={td}>{new Date(r.redeemed_at).toLocaleDateString()}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'Settings' && (
        <>
          <div style={section}>
            <h2>Departments</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <input placeholder="Name" value={newDept.name} onChange={(e) => setNewDept({ ...newDept, name: e.target.value })} style={{ padding: 6 }} />
              <input placeholder="Code" value={newDept.code} onChange={(e) => setNewDept({ ...newDept, code: e.target.value })} style={{ padding: 6, width: 80 }} />
              <select value={newDept.parent_department_id} onChange={(e) => setNewDept({ ...newDept, parent_department_id: e.target.value })} style={{ padding: 6 }}>
                <option value="">No parent</option>
                {allDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button style={btn} onClick={createDepartment}>+ New Department</button>
            </div>
            <table style={table}>
              <thead><tr><th style={th}>Name</th><th style={th}>Code</th><th style={th}>Parent</th><th style={th}>Employees</th><th style={th}>Status</th><th style={th}>Actions</th></tr></thead>
              <tbody>
                {allDepartments.map((d) => (
                  <tr key={d.id}>
                    <td style={td}>{d.name}</td>
                    <td style={td}>{d.code || '—'}</td>
                    <td style={td}>{d.parent_department_name || '—'}</td>
                    <td style={td}>{d.employee_count}</td>
                    <td style={td}>{d.status}</td>
                    <td style={td}>
                      <button style={btn} onClick={() => updateDepartmentStatus(d.id, d.status === 'active' ? 'inactive' : 'active')}>
                        {d.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button style={btn} onClick={() => deleteDepartment(d.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={section}>
            <h2>Categories</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input placeholder="Name" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} style={{ padding: 6 }} />
              <select value={newCategory.type} onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value })} style={{ padding: 6 }}>
                <option value="csr_activity">CSR Activity</option>
                <option value="challenge">Challenge</option>
              </select>
              <button style={btn} onClick={createCategory}>+ New Category</button>
            </div>
            <table style={table}>
              <thead><tr><th style={th}>Name</th><th style={th}>Type</th><th style={th}>Status</th><th style={th}>Actions</th></tr></thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td style={td}>{c.name}</td>
                    <td style={td}>{c.type === 'csr_activity' ? 'CSR Activity' : 'Challenge'}</td>
                    <td style={td}>{c.status}</td>
                    <td style={td}>
                      <button style={btn} onClick={() => toggleCategoryStatus(c)}>{c.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                      <button style={btn} onClick={() => deleteCategory(c.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={section}>
            <h2>ESG Configuration</h2>
            {[
              ['auto_emission_calculation', 'Enable auto emission calculation', 'Carbon Transactions are calculated automatically from Purchase/Manufacturing/Expense/Fleet records instead of manual entry.'],
              ['evidence_requirement', 'Require evidence for all CSR activities', 'CSR participation cannot be approved without an attached proof file.'],
              ['badge_auto_award', 'Auto-award badges on challenge completion', 'Badges are assigned automatically the moment XP or completed-challenge thresholds are met.'],
            ].map(([key, label, desc]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: '1px solid #1f232c' }}>
                <div onClick={() => updateEsgConfig(key, !esgConfig[key])} style={toggle(esgConfig[key])}>
                  <div style={toggleKnob(esgConfig[key])} />
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 12, color: '#8b93a7' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={section}>
            <h2>Notification Settings</h2>
            {notifSettings.map((n) => (
              <div key={n.type} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0', borderBottom: '1px solid #1f232c' }}>
                <div onClick={() => toggleNotificationSetting(n.type, !n.enabled)} style={toggle(n.enabled)}>
                  <div style={toggleKnob(n.enabled)} />
                </div>
                <div style={{ fontWeight: 600 }}>{n.type.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'Reports' && (
        <>
          <div style={section}>
            <h2>Standard Reports</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 12 }}>
              {[
                { key: 'environmental', title: 'Environmental Report', desc: 'Emissions, goals, department breakdown', endpoint: '/reports/environmental' },
                { key: 'social', title: 'Social Report', desc: 'CSR participation by department', endpoint: '/reports/social' },
                { key: 'governance', title: 'Governance Report', desc: 'Policies, audits, compliance summary', endpoint: '/reports/governance' },
                { key: 'esg-summary', title: 'ESG Summary', desc: 'Executive overview: department comparison', endpoint: '/reports/esg-summary' },
              ].map((r) => (
                <div key={r.key} style={{ border: '1px solid #1f232c', borderRadius: 8, padding: 16 }}>
                  <strong>{r.title}</strong>
                  <p style={{ fontSize: 13, color: '#8b93a7' }}>{r.desc}</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button style={btn} onClick={() => previewReport(r.endpoint, {})}>Preview</button>
                    <button style={btn} onClick={() => downloadReport(r.endpoint, {}, 'pdf')}>PDF</button>
                    <button style={btn} onClick={() => downloadReport(r.endpoint, {}, 'excel')}>Excel</button>
                    <button style={btn} onClick={() => downloadReport(r.endpoint, {}, 'csv')}>CSV</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={section}>
            <h2>Custom Report Builder</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <select
                  value={reportFilters.module}
                  onChange={(e) => {
                    setReportFilters({ ...reportFilters, module: e.target.value });
                    setReportPreview(null);
                  }}
                  style={{ padding: 6 }}
                >
                <option value="environmental">Environmental</option>
                <option value="social">Social</option>
                <option value="governance">Governance</option>
                <option value="gamification">Gamification</option>
              </select>
              <select value={reportFilters.department_id} onChange={(e) => setReportFilters({ ...reportFilters, department_id: e.target.value })} style={{ padding: 6 }}>
                <option value="">All Departments</option>
                {allDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select value={reportFilters.employee_id} onChange={(e) => setReportFilters({ ...reportFilters, employee_id: e.target.value })} style={{ padding: 6 }}>
                <option value="">All Employees</option>
                {leaderboard.map((l) => <option key={l.employee_id} value={l.employee_id}>{l.name}</option>)}
              </select>
              <select value={reportFilters.challenge_id} onChange={(e) => setReportFilters({ ...reportFilters, challenge_id: e.target.value })} style={{ padding: 6 }}>
                <option value="">All Challenges</option>
                {challenges.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <input type="date" value={reportFilters.start_date} onChange={(e) => setReportFilters({ ...reportFilters, start_date: e.target.value })} style={{ padding: 6 }} />
              <input type="date" value={reportFilters.end_date} onChange={(e) => setReportFilters({ ...reportFilters, end_date: e.target.value })} style={{ padding: 6 }} />
              <button style={btn} onClick={runCustomReport} disabled={reportLoading}>
                {reportLoading ? 'Running…' : '▶ Run Report'}
              </button>
              <button style={btn} onClick={() => downloadCustomReport('pdf')}>Export: PDF</button>
              <button style={btn} onClick={() => downloadCustomReport('excel')}>Export: Excel</button>
              <button style={btn} onClick={() => downloadCustomReport('csv')}>Export: CSV</button>
            </div>

            {reportPreview && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ marginBottom: 2 }}>{reportPreview.title}</h3>
                {reportPreview.subtitle && <p style={{ fontSize: 13, color: '#8b93a7' }}>{reportPreview.subtitle}</p>}
                <table style={table}>
                  <thead>
                    <tr>
                      {reportPreview.columns.map((c) => <th key={c.key} style={th}>{c.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {reportPreview.rows.length === 0 && (
                      <tr><td style={td} colSpan={reportPreview.columns.length}>No data for these filters.</td></tr>
                    )}
                    {reportPreview.rows.map((row, i) => (
                      <tr key={i}>
                        {reportPreview.columns.map((c) => <td key={c.key} style={td}>{String(row[c.key] ?? '—')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}