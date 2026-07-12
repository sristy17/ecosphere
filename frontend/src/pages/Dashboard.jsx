import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Dashboard() {
  const [departments, setDepartments] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [employeeId, setEmployeeId] = useState(1); 
  const navigate = useNavigate();

  const loadAll = () => {
    api.get('/carbon/summary/by-department').then((res) => setDepartments(res.data)).catch(console.error);
    api.get('/challenges').then((res) => setChallenges(res.data)).catch(console.error);
    api.get('/employees/leaderboard').then((res) => setLeaderboard(res.data)).catch(console.error);
  };

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login');
      return;
    }
    loadAll();
  }, [navigate]);

  const joinChallenge = async (id) => {
    try {
      await api.post(`/challenges/${id}/join`, { employee_id: employeeId });
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to join');
    }
  };

  const completeChallenge = async (id) => {
    try {
      await api.post(`/challenges/${id}/complete`, { employee_id: employeeId });
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to complete');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const sectionStyle = { marginTop: 40 };
  const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: 12 };
  const thStyle = { textAlign: 'left', padding: 8, borderBottom: '2px solid #ccc' };
  const tdStyle = { padding: 8, borderBottom: '1px solid #eee' };
  const btnStyle = { padding: '4px 10px', marginRight: 6, cursor: 'pointer' };

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>EcoSphere Dashboard</h1>
        <button onClick={logout}>Logout</button>
      </div>

      {/* Department Carbon Summary */}
      <div style={sectionStyle}>
        <h2>Department Carbon Summary</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Department</th>
              <th style={thStyle}>Total Carbon (kg)</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d.id}>
                <td style={tdStyle}>{d.name}</td>
                <td style={tdStyle}>{d.total_carbon_kg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Challenges */}
      <div style={sectionStyle}>
        <h2>Challenges</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Title</th>
              <th style={thStyle}>XP</th>
              <th style={thStyle}>Difficulty</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {challenges.map((c) => (
              <tr key={c.id}>
                <td style={tdStyle}>{c.title}</td>
                <td style={tdStyle}>{c.xp_reward}</td>
                <td style={tdStyle}>{c.difficulty}</td>
                <td style={tdStyle}>
                  <button style={btnStyle} onClick={() => joinChallenge(c.id)}>Join</button>
                  <button style={btnStyle} onClick={() => completeChallenge(c.id)}>Complete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leaderboard */}
      <div style={sectionStyle}>
        <h2>Leaderboard</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Total XP</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard
              .sort((a, b) => b.total_xp - a.total_xp)
              .map((l) => (
                <tr key={l.employee_id}>
                  <td style={tdStyle}>{l.name}</td>
                  <td style={tdStyle}>{l.total_xp}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
