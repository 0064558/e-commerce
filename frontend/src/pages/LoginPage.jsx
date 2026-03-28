import React, { useState } from 'react';
import Alert from '../components/Alert';
import './LoginPage.css';
import api from '../services/api';

function LoginPage({ onLoginSuccess }) {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Preencha todos os campos.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await api.login(email, password);
      api.setToken(response.token);

      const userData = await api.getMe();
      onLoginSuccess(response.token, userData);
    } catch (err) {
      // Evita que um token setado parcialmente (ex.: falha no /me) afete novas tentativas de login
      api.setToken(null);
      if (err?.status === 401 || err?.status === 403) {
        setError('E-mail ou senha incorretos.');
      } else {
        setError(err.message || 'Falha ao entrar.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setError('');
    setRegisterError('');
    setRegisterSuccess('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!registerForm.name || !registerForm.email || !registerForm.phone || !registerForm.password) {
      setRegisterError('Preencha todos os campos.');
      return;
    }

    setRegisterError('');
    setRegisterSuccess('');
    setIsRegistering(true);

    try {
      await api.register({
        name: registerForm.name,
        email: registerForm.email,
        phone: registerForm.phone,
        password: registerForm.password,
        role: 'USER',
      });
      setRegisterSuccess('Usuário registrado com sucesso. Agora você pode entrar na aba “Entrar”.');
      setRegisterForm({
        name: '',
        email: '',
        phone: '',
        password: '',
      });
    } catch (err) {
      setRegisterError(err.message || 'Falha ao registrar usuário.');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-glow" />
      <div className="login-card">
        <div className="login-title">NEXUS</div>
        <div className="login-sub">E-COMMERCE PLATFORM</div>

        <div className="tab-row">
          <button
            className={`tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => handleTabChange('login')}
          >
            Entrar
          </button>
          <button
            className={`tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => handleTabChange('register')}
          >
            Registrar
          </button>
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <Alert type="error" message={error} />
            <div className="form-group">
              <label>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label>Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span
                    className="spinner"
                    style={{
                      width: 14,
                      height: 14,
                      borderWidth: 2,
                      verticalAlign: 'middle',
                      display: 'inline-block',
                      marginRight: '0.5rem',
                    }}
                  />{' '}
                  Acessando...
                </>
              ) : (
                'ACESSAR'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <Alert type="error" message={registerError} />
            <Alert type="success" message={registerSuccess} />

            <div className="form-group">
              <label>Nome</label>
              <input
                value={registerForm.name}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Seu nome"
                autoComplete="name"
              />
            </div>

            <div className="form-group">
              <label>E-mail</label>
              <input
                type="email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="seu@email.com"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label>Telefone</label>
              <input
                type="tel"
                value={registerForm.phone}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
                autoComplete="tel"
              />
            </div>

            <div className="form-group">
              <label>Senha</label>
              <input
                type="password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="btn" disabled={isRegistering}>
              {isRegistering ? (
                <>
                  <span
                    className="spinner"
                    style={{
                      width: 14,
                      height: 14,
                      borderWidth: 2,
                      verticalAlign: 'middle',
                      display: 'inline-block',
                      marginRight: '0.5rem',
                    }}
                  />{' '}
                  Registrando...
                </>
              ) : (
                'REGISTRAR'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
