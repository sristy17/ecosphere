import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import api from '../api/axios';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function Dashboard() {
  const [me, setMe] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myBadges, setMyBadges] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [trend, setTrend] = useState([]);
  const navigate = useNavigate();

  const loadAll = async (employeeId) => {
    api.get('/carbon/summary/by-department').then((res) => setDepartments(res.data)).catch(console.error);
    api.get('/challenges').then((res) => setChallenges(res.data)).catch(console.error);
    api.get('/employees/leaderboard').then((res) => setLeaderboard(res.data)).catch(console.error);
    api.get('/badges').then((res) => setAllBadges(res.data)).catch(console.error);
    api.get('/carbon/trend').then((res) => setTrend(res.data)).catch(console.error);
    if (employeeId) {
      api.get(`/badges/employee/${employeeId}`).then((res) => setMyBadges(res.data)).catch(console.error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    api.get('/employees/me')
      .then((res) => {
        setMe(res.data);
        loadAll(res.data.id);
      })
      .catch(() => {
        // No employee record or not linked yet — still load general data
        loadAll(null);
      });
  }, [navigate]);

  const setMyDepartment = async (department_id) => {
    if (!me) return;
    try {
      await api.put(`/employees/${me.id}`, { department_id });
      const res = await api.get('/employees/me');
      setMe(res.data);
      loadAll(res.data.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update department');
    }
  };

  const joinChallenge = async (id) => {
    if (!me) return alert('No employee record linked yet');
    try {
      await api.post(`/challenges/${id}/join`, { employee_id: me.id });
      loadAll(me.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to join');
    }
  };

  const completeChallenge = async (id) => {
    if (!me) return alert('No employee record linked yet');
    try {
      const res = await api.post(`/challenges/${id}/complete`, { employee_id: me.id });
      if (res.data.new_badges?.length) {
        alert(`🎉 New badge${res.data.new_badges.length > 1 ? 's' : ''} unlocked: ${res.data.new_badges.map(b => b.name).join(', ')}`);
      }
      loadAll(me.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to complete');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const section = { marginTop: 32, background: '#12151c', padding: 24, borderRadius: 12, border: '1px solid #1f232c' };
  const table = { width: '100%', borderCollapse: 'collapse', marginTop: 12 };
  const th = { textAlign: 'left', padding: 8, borderBottom: '2px solid #ccc' };
  const td = { padding: 8, borderBottom: '1px solid #eee' };
  const btn = { padding: '4px 10px', marginRight: 6, cursor: 'pointer' };

  const earnedBadgeIds = new Set(myBadges.map((b) => b.id));

  const trendData = {
    labels: trend.map((t) => new Date(t.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Total carbon logged (kg)',
        data: trend.map((t) => parseFloat(t.carbon_kg)),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.2)',
        tension: 0.3,
      },
    ],
  };

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>EcoSphere Dashboard</h1>
        <button onClick={logout}>Logout</button>
      </div>

      {/* My info / department picker */}
      {me && (
        <div style={section}>
          <h2>Welcome, {me.name}</h2>
          <p>Department: <strong>{me.department || 'Not set'}</strong></p>
          {!me.department_id && (
            <div>
              <p>Pick your department:</p>
              {departments.map((d) => (
                <button key={d.id} style={btn} onClick={() => setMyDepartment(d.id)}>{d.name}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Department Carbon Summary with progress bars */}
      <div style={section}>
        <h2>Department Carbon Summary</h2>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Department</th>
              <th style={th}>Total (kg)</th>
              <th style={th}>Target (kg)</th>
              <th style={th}>Progress</th>
            </tr>
          </thead>
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
                        <div style={{
                          width: `${pct}%`,
                          background: pct >= 100 ? '#ef4444' : '#2563eb',
                          height: 10,
                        }} />
                      </div>
                    ) : 'No target set'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Carbon trend chart */}
      <div style={section}>
        <h2>Carbon Trend Over Time</h2>
        {trend.length > 0 ? <Line data={trendData} /> : <p>No data yet.</p>}
      </div>

      {/* Challenges */}
      <div style={section}>
        <h2>Challenges</h2>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Title</th>
              <th style={th}>XP</th>
              <th style={th}>Difficulty</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {challenges.map((c) => (
              <tr key={c.id}>
                <td style={td}>{c.title}</td>
                <td style={td}>{c.xp_reward}</td>
                <td style={td}>{c.difficulty}</td>
                <td style={td}>
                  <button style={btn} onClick={() => joinChallenge(c.id)}>Join</button>
                  <button style={btn} onClick={() => completeChallenge(c.id)}>Complete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Badges */}
      <div style={section}>
        <h2>Badges</h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
          {allBadges.map((b) => {
            const earned = earnedBadgeIds.has(b.id);
            return (
              <div key={b.id} style={{
                textAlign: 'center',
                padding: 16,
                borderRadius: 8,
                background: earned ? '#1f232c' : '#0f1115',
                border: earned ? '1px solid #2563eb' : '1px solid #1f232c',
                opacity: earned ? 1 : 0.4,
                width: 140,
              }}>
                <div style={{ fontSize: 32 }}>{b.icon || '🏅'}</div>
                <div style={{ fontWeight: 600, marginTop: 6 }}>{b.name}</div>
                <div style={{ fontSize: 12, color: '#8b93a7', marginTop: 4 }}>{b.description}</div>
                <div style={{ fontSize: 11, color: '#8b93a7', marginTop: 6 }}>{b.xp_required} XP</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard */}
      <div style={section}>
        <h2>Leaderboard</h2>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Total XP</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard
              .sort((a, b) => b.total_xp - a.total_xp)
              .map((l) => (
                <tr key={l.employee_id}>
                  <td style={td}>{l.name}</td>
                  <td style={td}>{l.total_xp}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
