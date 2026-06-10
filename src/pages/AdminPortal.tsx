import React, { useState, useEffect } from 'react';
import { api } from "../lib/api";
import type { Client } from "../types";
import { Folder, Plus, LogOut, Link, MoreVertical, Edit2, Pause, Play, Trash2 } from "lucide-react";
import { auth } from "../lib/firebase";
import { Modal, Button, TextInput, ColorInput, Menu, ActionIcon, Tooltip } from '@mantine/core';
import { useNavigate } from 'react-router-dom';

export const AdminPortal: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#2563EB");
  const [newLogoUrl, setNewLogoUrl] = useState("");

  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editName, setEditName] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const fetchClients = () => {
    api.get<Client[]>('/api/clients')
      .then(setClients)
      .catch(console.error);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post('/api/clients', {
        name: newName,
        primary_color: newColor,
        logo_url: newLogoUrl
      });
      setIsModalOpen(false);
      setNewName("");
      setNewLogoUrl("");
      setNewColor("#2563EB");
      fetchClients();
    } catch {
      alert("Hubo un error al crear el workspace.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRename = (client: Client) => {
    setEditingClient(client);
    setEditName(client.name);
    setIsEditModalOpen(true);
  };

  const handleSaveRename = async () => {
    if (!editingClient || !editName.trim()) return;
    try {
      await api.put(`/api/clients/${editingClient.id}`, {
        name: editName.trim()
      });
      setIsEditModalOpen(false);
      setEditingClient(null);
      fetchClients();
    } catch {
      alert("Hubo un error al renombrar el workspace.");
    }
  };

  const handleToggleStatus = async (client: Client) => {
    const nextStatus = client.status === 'hold' ? 'active' : 'hold';
    try {
      await api.put(`/api/clients/${client.id}`, {
        status: nextStatus
      });
      fetchClients();
    } catch {
      alert("Hubo un error al cambiar el estado del workspace.");
    }
  };

  const handleOpenDelete = (client: Client) => {
    setDeletingClient(client);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingClient) return;
    try {
      await api.delete(`/api/clients/${deletingClient.id}`);
      setIsDeleteModalOpen(false);
      setDeletingClient(null);
      fetchClients();
    } catch {
      alert("Hubo un error al eliminar el workspace.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8 h-screen overflow-auto">
      <header className="mb-10 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">iMettrics Workspaces</h1>
          <p className="text-slate-500 mt-1">Panel de control de clientes</p>
        </div>
        <Button 
          variant="subtle" 
          color="red" 
          leftSection={<LogOut size={18} />} 
          onClick={() => auth.signOut()}
        >
          Cerrar Sesión
        </Button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Create workspace card */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="group bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 hover:shadow-md hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all flex flex-col items-center justify-center text-center h-full min-h-[180px]"
        >
          <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
            <Plus size={24} className="text-slate-600 group-hover:text-blue-600" />
          </div>
          <h3 className="font-bold text-slate-700 group-hover:text-blue-700">Crear Workspace</h3>
        </button>

        {/* Existing workspaces */}
        {clients.map((client) => (
          <div
            key={client.id}
            onClick={() => navigate(`/workspace/${client.id}`)}
            className="group bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-300 cursor-pointer transition-all flex flex-col items-center text-center relative overflow-hidden"
          >
            <div 
              className="absolute top-0 left-0 w-full h-2" 
              style={{ backgroundColor: client.primary_color || '#2563EB' }} 
            />
            
            {/* Status Badge */}
            <div className="absolute top-3 left-3 select-none">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                client.status === 'hold' 
                  ? 'bg-amber-100 text-amber-800 border-amber-200' 
                  : 'bg-green-100 text-green-800 border-green-200'
              }`}>
                {client.status === 'hold' ? 'On Hold' : 'Activo'}
              </span>
            </div>

            {/* Actions Menu */}
            <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
              <Menu shadow="md" width={180} position="bottom-end">
                <Menu.Target>
                  <ActionIcon size="md" variant="subtle" color="gray" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item 
                    leftSection={<Edit2 size={14} />} 
                    onClick={() => handleOpenRename(client)}
                  >
                    Renombrar
                  </Menu.Item>
                  <Menu.Item 
                    leftSection={client.status === 'hold' ? <Play size={14} className="text-green-600" /> : <Pause size={14} className="text-amber-600" />}
                    onClick={() => handleToggleStatus(client)}
                  >
                    {client.status === 'hold' ? 'Marcar como Activo' : 'Poner On hold'}
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item 
                    color="red" 
                    leftSection={<Trash2 size={14} />} 
                    onClick={() => handleOpenDelete(client)}
                  >
                    Eliminar
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </div>

            <div className={`w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 mt-4 group-hover:bg-blue-50 transition-colors border border-slate-100 p-2 shadow-inner ${
              client.status === 'hold' ? 'opacity-60 grayscale' : ''
            }`}>
              {client.logo_url ? (
                <img src={client.logo_url} alt={client.name} className="w-full h-full object-contain" />
              ) : (
                <Folder size={32} className="text-slate-400 fill-slate-50 group-hover:fill-blue-100 group-hover:text-blue-500" />
              )}
            </div>
            
            <h3 className={`font-bold text-slate-800 text-lg truncate w-full px-2 ${client.status === 'hold' ? 'text-slate-500' : ''}`} title={client.name}>
              {client.name}
            </h3>
            
            <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Entrar al workspace</span>
              <Link size={12} />
            </div>
          </div>
        ))}
      </div>

      <Modal opened={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nuevo Workspace" centered>
        <div className="flex flex-col gap-4">
          <TextInput
            label="Nombre del Cliente"
            placeholder="Ej: ABC Corp"
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
            required
            data-autofocus
          />
          <ColorInput
            label="Color Principal (Branding)"
            placeholder="#2563EB"
            value={newColor}
            onChange={setNewColor}
            format="hex"
            swatches={['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#F43F5E']}
          />
          <TextInput
            label="Logo URL (opcional)"
            placeholder="https://ejemplo.com/logo.png"
            value={newLogoUrl}
            onChange={(e) => setNewLogoUrl(e.currentTarget.value)}
          />
          <Button 
            className="mt-4" 
            fullWidth 
            onClick={handleCreate} 
            loading={isSubmitting}
            disabled={!newName.trim()}
          >
            Crear Workspace
          </Button>
        </div>
      </Modal>

      {/* Rename Modal */}
      <Modal opened={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Renombrar Workspace" centered>
        <div className="flex flex-col gap-4">
          <TextInput
            label="Nombre del Cliente"
            value={editName}
            onChange={(e) => setEditName(e.currentTarget.value)}
            required
            data-autofocus
          />
          <Button 
            className="mt-4" 
            fullWidth 
            onClick={handleSaveRename}
            disabled={!editName.trim()}
          >
            Guardar Cambios
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal opened={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar eliminación" centered>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          ¿Estás seguro de que quieres eliminar el workspace <strong>{deletingClient?.name}</strong>? Se eliminarán permanentemente todos sus datos, guías, carpetas y accesos asociados. Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="subtle" color="gray" size="xs" onClick={() => setIsDeleteModalOpen(false)}>
            Cancelar
          </Button>
          <Button color="red" size="xs" onClick={handleDeleteConfirm}>
            Eliminar Workspace
          </Button>
        </div>
      </Modal>
    </div>
  );
};

