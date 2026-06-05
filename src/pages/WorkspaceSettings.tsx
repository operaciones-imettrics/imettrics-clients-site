import React, { useState, useEffect } from 'react';
import { useClientContext } from "../contexts/ClientContext";
import { TextInput, Table, ActionIcon, Loader } from '@mantine/core';
import { UserPlus, Trash2, ShieldCheck, Users, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

interface UserAccess {
  id: string;
  email: string;
  role: string;
}

export const WorkspaceSettings: React.FC = () => {
  const { selectedClientId } = useClientContext();
  const [newEmail, setNewEmail] = useState("");
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    if (!selectedClientId) return;
    setIsLoading(true);
    try {
      const data = await api.get<UserAccess[]>(`/api/clients/${selectedClientId}/users`);
      setUsers(data);
    } catch {
      console.error("Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [selectedClientId]);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleInvite = async () => {
    if (!selectedClientId || !isValidEmail(newEmail)) return;
    setIsSubmitting(true);
    setError('');
    try {
      await api.post(`/api/clients/${selectedClientId}/users`, { email: newEmail, role: 'viewer' });
      setNewEmail("");
      fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al autorizar usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (email: string) => {
    if (!selectedClientId) return;
    if (!confirm(`¿Revocar acceso a ${email}?`)) return;
    try {
      await api.delete(`/api/clients/${selectedClientId}/users/${encodeURIComponent(email)}`);
      fetchUsers();
    } catch {
      alert("Error al revocar acceso");
    }
  };

  if (!selectedClientId) {
    return <div className="p-10 text-slate-400">Selecciona un workspace para configurar accesos.</div>;
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="max-w-3xl mx-auto px-8 py-10">

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShieldCheck size={22} className="text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Gestión de Accesos</h1>
          </div>
          <p className="text-slate-500 text-sm ml-14">
            Los usuarios autorizados podrán ingresar con Google y tendrán acceso de <strong>sólo lectura</strong> a este workspace.
          </p>
        </div>

        {/* Invite Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus size={18} className="text-slate-600" />
            <h2 className="text-base font-semibold text-slate-800">Autorizar nuevo usuario</h2>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <TextInput
                placeholder="correo@empresa.com"
                value={newEmail}
                onChange={(e) => { setNewEmail(e.currentTarget.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                error={error || undefined}
                size="md"
                radius="md"
              />
            </div>
            <button
              onClick={handleInvite}
              disabled={!isValidEmail(newEmail) || isSubmitting}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                !isValidEmail(newEmail) || isSubmitting
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200 active:scale-95'
              }`}
            >
              {isSubmitting ? <Loader size={14} color="white" /> : <UserPlus size={16} />}
              Autorizar
            </button>
          </div>

          <div className="flex items-start gap-2 mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <AlertCircle size={15} className="text-slate-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-500">
              El usuario debe tener una cuenta de Google activa. Al añadirlo aquí, obtendrá acceso la próxima vez que inicie sesión.
            </p>
          </div>
        </div>

        {/* Users Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Users size={18} className="text-slate-500" />
            <h2 className="text-base font-semibold text-slate-800">Usuarios con acceso</h2>
            {!isLoading && (
              <span className="ml-auto text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                {users.length} {users.length === 1 ? 'usuario' : 'usuarios'}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader color="blue" size="sm" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <Users size={36} className="mb-3 opacity-40" />
              <p className="text-sm">No hay usuarios autorizados en este workspace</p>
            </div>
          ) : (
            <Table horizontalSpacing="lg" verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Email</Table.Th>
                  <Table.Th className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Rol</Table.Th>
                  <Table.Th style={{ width: 56 }}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {users.map((user) => (
                  <Table.Tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <Table.Td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {user.email[0].toUpperCase()}
                        </div>
                        <span className="text-sm text-slate-700 font-medium">{user.email}</span>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                        <ShieldCheck size={12} />
                        Solo lectura
                      </span>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        size="sm"
                        onClick={() => handleRevoke(user.email)}
                        className="opacity-40 hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={15} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </div>

      </div>
    </div>
  );
};
