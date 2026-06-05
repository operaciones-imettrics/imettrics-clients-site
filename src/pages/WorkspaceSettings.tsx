import React, { useState } from 'react';
import { Button, TextInput, Table, Badge, ActionIcon } from '@mantine/core';
import { UserPlus, Trash2, Mail } from 'lucide-react';

// Mock Data
const MOCK_USERS = [
  { id: '1', email: 'director@cliente.com', role: 'admin_cliente' },
  { id: '2', email: 'operador@cliente.com', role: 'viewer' }
];

export const WorkspaceSettings: React.FC = () => {
  const [newEmail, setNewEmail] = useState("");

  const handleInvite = () => {
    alert("Próximamente: Se enviará una invitación a " + newEmail);
    setNewEmail("");
  };

  return (
    <div className="flex-1 p-10 bg-white overflow-auto relative">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Configuración del Workspace</h1>
          <p className="text-slate-500">Administra los permisos y usuarios que tienen acceso a este entorno.</p>
        </header>

        <section className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Mail className="text-blue-600" size={24} />
            Invitar Usuario
          </h2>
          <div className="flex gap-4 items-end">
            <TextInput
              label="Correo Electrónico"
              placeholder="usuario@empresa.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.currentTarget.value)}
              className="flex-1"
            />
            <Button 
              leftSection={<UserPlus size={18} />} 
              onClick={handleInvite}
              disabled={!newEmail.trim()}
            >
              Invitar
            </Button>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-4">Usuarios con Acceso</h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <Table horizontalSpacing="md" verticalSpacing="md">
              <Table.Thead className="bg-slate-50">
                <Table.Tr>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Rol</Table.Th>
                  <Table.Th style={{ width: 80 }}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {MOCK_USERS.map((user) => (
                  <Table.Tr key={user.id}>
                    <Table.Td className="font-medium text-slate-700">{user.email}</Table.Td>
                    <Table.Td>
                      <Badge color={user.role === 'admin_cliente' ? 'blue' : 'gray'}>
                        {user.role}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon color="red" variant="subtle">
                        <Trash2 size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {MOCK_USERS.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={3} className="text-center text-slate-500 py-8">
                      No hay usuarios invitados a este workspace.
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  );
};
