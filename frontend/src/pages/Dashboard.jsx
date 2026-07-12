import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Dashboard() {
  const [departments, setDepartments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    api.get('/carbon/summary/by-department')
      .then((res) => setDepartments(res.data))
      .catch((err) => console.error(err));
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2>Department Carbon Summary</h2>
        <button onClick={logout}>Logout</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc' }}>
            <th style={{ textAlign: 'left', padding: 8 }}>Department</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Total Carbon (kg)</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((d) => (
            <tr key={d.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 8 }}>{d.name}</td>
              <td style={{ padding: 8 }}>{d.total_carbon_kg}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}