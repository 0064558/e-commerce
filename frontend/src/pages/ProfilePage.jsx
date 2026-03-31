import React, { useEffect, useState } from 'react';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import api from '../services/api';
import './ProfilePage.css';

function ProfilePage({ user, onUserUpdated }) {
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
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    taxId: '',
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
      taxId: user.taxId || '',
    });
  }, [user]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user?.id) {
      setError('Usuário não identificado.');
      return;
    }

    if (!form.name.trim() || !form.email.trim()) {
      setError('Preencha nome e e-mail.');
      return;
    }
    if (!form.taxId.trim()) {
      setError('CPF obrigatório.');
      return;
    }
    if (!isValidCpf(form.taxId)) {
      setError('CPF inválido.');
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
        taxId: form.taxId.trim(),
      };
      const updated = await api.updateUser(user.id, payload);
      const nextUser = {
        ...user,
        name: updated?.name ?? payload.name,
        email: updated?.email ?? payload.email,
        phone: updated?.phone ?? payload.phone,
        taxId: updated?.taxId ?? payload.taxId,
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
      setPasswordError('A confirmação não confere.');
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
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, phone: formatPhone(event.target.value) }))
                  }
                  placeholder="(11) 99999-9999"
                  inputMode="numeric"
                  maxLength={15}
                />
              </div>

              <div className="form-group">
                <label>CPF</label>
                <input
                  value={form.taxId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, taxId: formatCpf(event.target.value) }))
                  }
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  maxLength={14}
                />
              </div>

              <button className="btn" type="submit" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'SALVAR ALTERAÇÕES'}
              </button>
            </form>
          </div>

          <div className="profile-card">
            <div className="profile-section-title">Segurança</div>
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
