import React, { useEffect, useState } from 'react';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import api from '../services/api';
import './ProfilePage.css';

function ProfilePage({ user, onUserUpdated }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
    });
  }, [user]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user?.id) {
      setError('Usuario nao identificado.');
      return;
    }

    if (!form.name.trim() || !form.email.trim()) {
      setError('Preencha nome e e-mail.');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      };
      const updated = await api.updateUser(user.id, payload);
      const nextUser = {
        ...user,
        name: updated?.name ?? payload.name,
        email: updated?.email ?? payload.email,
        phone: updated?.phone ?? payload.phone,
      };
      if (onUserUpdated) {
        onUserUpdated(nextUser);
      }
      setSuccess('Dados atualizados com sucesso.');
    } catch (err) {
      setError(err.message || 'Falha ao atualizar perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordError('Preencha senha atual e nova.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('A confirmacao nao confere.');
      return;
    }

    setIsSavingPassword(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      await api.updateMyPassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordSuccess('Senha atualizada com sucesso.');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setPasswordError(err.message || 'Falha ao atualizar senha.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="page">
        <div className="container">
          <Spinner text="Carregando perfil..." />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div className="page-title">PERFIL</div>
          <div className="page-sub">Atualize seus dados pessoais</div>
        </div>

        <div className="profile-meta">
          <span className="meta-chip">ID #{user.id}</span>
          <span className="meta-chip">{user.role}</span>
        </div>

        <div className="profile-grid">
          <div className="profile-card">
            <div className="profile-section-title">Dados pessoais</div>

            <Alert type="error" message={error} />
            <Alert type="success" message={success} />

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nome</label>
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Seu nome"
                />
              </div>

              <div className="form-group">
                <label>E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="seu@email.com"
                />
              </div>

              <div className="form-group">
                <label>Telefone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <button className="btn" type="submit" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'SALVAR ALTERACOES'}
              </button>
            </form>
          </div>

          <div className="profile-card">
            <div className="profile-section-title">Seguranca</div>
            <Alert type="error" message={passwordError} />
            <Alert type="success" message={passwordSuccess} />

            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label>Senha atual</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                  }
                  placeholder="********"
                  autoComplete="current-password"
                />
              </div>
              <div className="form-group">
                <label>Nova senha</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                  }
                  placeholder="********"
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label>Confirmar senha</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                  }
                  placeholder="********"
                  autoComplete="new-password"
                />
              </div>
              <button className="btn btn-ghost" type="submit" disabled={isSavingPassword}>
                {isSavingPassword ? 'Salvando...' : 'ALTERAR SENHA'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
