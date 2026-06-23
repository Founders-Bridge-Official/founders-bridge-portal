import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function CompanyPicker() {
  const { companies, activeCompany, setActiveCompany, profile } = useAuth();
  const navigate = useNavigate();

  function handleSelect(company) {
    setActiveCompany(company);
    navigate('/dashboard');
  }

  return (
    <div className="login-wrapper">
      <div className="login-card company-picker">
        <h2>Welcome, {profile?.name ?? 'there'}</h2>
        <p className="login-subtitle">You're listed under {companies.length} companies. Which one would you like to manage today?</p>
        <div className="company-list">
          {companies.map(company => (
            <button key={company.id} className={`company-option ${activeCompany?.id === company.id ? 'selected' : ''}`} onClick={() => handleSelect(company)}>
              <div className="company-option-name">{company.name}</div>
              <div className="company-option-meta">
                <span className="badge">{company.type}</span>
                <span className="role">{company.role}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}