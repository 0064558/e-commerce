import React, { useEffect, useState } from 'react';
import Alert from '../components/Alert';
import './LoginPage.css';
import api from '../services/api';

function LoginPage({ onLoginSuccess }) {
  const isValidCpf = (value) => {
    const digits = (value || '').replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i += 1) {
      sum += Number(digits.charAt(i)) * (10 - i);
    }
    let firstCheck = (sum * 10) % 11;
    if (firstCheck === 10) firstCheck = 0;
    if (firstCheck !== Number(digits.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i += 1) {
      sum += Number(digits.charAt(i)) * (11 - i);
    }
    let secondCheck = (sum * 10) % 11;
    if (secondCheck === 10) secondCheck = 0;
    return secondCheck === Number(digits.charAt(10));
  };

  const formatCpf = (value) => {
    const digits = (value || '').replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const formatPhone = (value) => {
    const digits = (value || '').replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginNotice, setLoginNotice] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    phone: '',
    taxId: '',
    password: '',
  });
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const notice = sessionStorage.getItem('login_notice');
    if (notice) {
      setLoginNotice(notice);
      sessionStorage.removeItem('login_notice');
    }
  }, []);

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
    setLoginNotice('');
    setError('');
    setRegisterError('');
    setRegisterSuccess('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!registerForm.name || !registerForm.email || !registerForm.phone || !registerForm.taxId || !registerForm.password) {
      setRegisterError('Preencha todos os campos.');
      return;
    }
    if (!isValidCpf(registerForm.taxId)) {
      setRegisterError('CPF inválido.');
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
        taxId: registerForm.taxId,
        password: registerForm.password,
        role: 'USER',
      });
      setRegisterSuccess('Usuário registrado com sucesso. Agora você pode entrar na aba “Entrar”.');
      setRegisterForm({
        name: '',
        email: '',
        phone: '',
        taxId: '',
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
            <Alert type="info" message={loginNotice} />
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
                onChange={(e) =>
                  setRegisterForm((prev) => ({ ...prev, phone: formatPhone(e.target.value) }))
                }
                placeholder="(11) 99999-9999"
                inputMode="numeric"
                maxLength={15}
                autoComplete="tel"
              />
            </div>

            <div className="form-group">
              <label>CPF</label>
              <input
                value={registerForm.taxId}
                onChange={(e) =>
                  setRegisterForm((prev) => ({ ...prev, taxId: formatCpf(e.target.value) }))
                }
                placeholder="000.000.000-00"
                inputMode="numeric"
                maxLength={14}
                autoComplete="off"
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
