import { useState, FormEvent } from 'react';
import { adminLogin } from '../services/api';
import './AdminLogin.css';

interface AdminLoginProps {
  onSuccess: () => void;
}

const AdminLogin = ({ onSuccess }: AdminLoginProps) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('Informe a senha para entrar.');
      return;
    }

    setLoading(true);

    try {
      const response = await adminLogin({ password: password.trim() });
      if (response.success) {
        onSuccess();
      } else {
        setError('Senha incorreta. Confira e tente de novo.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <img src="/logo-branco.svg" alt="Rainha das Sete" className="brand-logo" />
        <h2 className="admin-login-title">Área administrativa</h2>
        <p className="admin-login-subtitle">Digite a senha para entrar.</p>

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Senha
            </label>
            <input
              type="password"
              id="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              disabled={loading}
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="form-button"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;

