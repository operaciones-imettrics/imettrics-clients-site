import React, { useState, useEffect } from 'react';
import { useClientContext } from "../contexts/ClientContext";
import { Button, TextInput, Table, Badge, ActionIcon, Loader } from '@mantine/core';
import { UserPlus, Trash2, Mail } from 'lucide-react';
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

  const fetchUsers = async () => {
    if (!selectedClientId) return;
    setIsLoading(true);
    try {
      const data = await api.get<UserAccess[]>(`/api/clients/${selectedClientId}/users`);
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [selectedClientId]);

  const handleInvite = async () => {
    if (!selectedClientId || !newEmail.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post(`/api/clients/${selectedClientId}/users`, {
        email: newEmail,
        role: 'viewer'
      });
      setNewEmail("");
      fetchUsers();
    } catch (err: any) {
      alert("Error al invitar usuario: " + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (email: string) => {
    if (!selectedClientId) return;
    if (!confirm(`¿Estás seguro de revocar el acceso a ${email}?`)) return;
    try {
      await api.delete(`/api/clients/${selectedClientId}/users/${encodeURIComponent(email)}`);
      fetchUsers();
    } catch (err) {
      alert("Error al revocar acceso");
    }
  };

  if (!selectedClientId) {
    return <div className="p-10">Selecciona un workspace para configurar accesos.</div>;
  }

  return (
    <div className="flex-1 p-10 bg-white overflow-auto relative">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Configuración del Workspace</h1>
          <p className="text-slate-500">Administra la lista blanca (whitelist) de usuarios que tienen acceso a este entorno vía Google.</p>
        </header>

        <section className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Mail className="text-blue-600" size={24} />
            Autorizar Usuario
          </h2>
          <div className="flex gap-4 items-end">
            <TextInput
              label="Correo de Google (Obligatorio)"
              placeholder="usuario@gmail.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.currentTarget.value)}
              className="flex-1"
            />
            <Button 
              leftSection={<UserPlus size={18} />} 
              onClick={handleInvite}
              disabled={!newEmail.trim() || newEmail.indexOf('@') === -1}
              loading={isSubmitting}
            >
              Autorizar
            </Button>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-4">Usuarios en la Lista Blanca</h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="flex justify-center p-8"><Loader color="blue" /></div>
            ) : (
              <Table horizontalSpacing="md" verticalSpacing="md">
                <Table.Thead className="bg-slate-50">
                  <Table.Tr>
                    <Table.Th>Email Google</Table.Th>
                    <Table.Th>Rol</Table.Th>
                    <Table.Th style={{ width: 80 }}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {users.map((user) => (
                    <Table.Tr key={user.id}>
                      <Table.Td className="font-medium text-slate-700">{user.email}</Table.Td>
                      <Table.Td>
                        <Badge color={user.role === 'admin_cliente' ? 'blue' : 'gray'}>
                          {user.role}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon color="red" variant="subtle" onClick={() => handleRevoke(user.email)}>
                          <Trash2 size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  {users.length === 0 && (
                    <Table.Tr>
                      <Table.Td colSpan={3} className="text-center text-slate-500 py-8">
                        No hay usuarios adicionales autorizados en este workspace.
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
