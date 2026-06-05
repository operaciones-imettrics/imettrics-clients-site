import React, { useState, useEffect } from 'react';
import { api } from "../lib/api";
import type { Client } from "../types";
import { Folder, Plus, LogOut, Link } from "lucide-react";
import { auth } from "../lib/firebase";
import { Modal, Button, TextInput, ColorInput } from '@mantine/core';

export const AdminPortal: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#2563EB");
  const [newLogoUrl, setNewLogoUrl] = useState("");

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
          <a
            key={client.id}
            href={`/workspace/${client.id}`}
            className="group bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-300 cursor-pointer transition-all flex flex-col items-center text-center no-underline relative overflow-hidden"
          >
            <div 
              className="absolute top-0 left-0 w-full h-2" 
              style={{ backgroundColor: client.primary_color || '#2563EB' }} 
            />
            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 mt-2 group-hover:bg-blue-50 transition-colors border border-slate-100 p-2 shadow-inner">
              {client.logo_url ? (
                <img src={client.logo_url} alt={client.name} className="w-full h-full object-contain" />
              ) : (
                <Folder size={32} className="text-slate-400 fill-slate-50 group-hover:fill-blue-100 group-hover:text-blue-500" />
              )}
            </div>
            <h3 className="font-bold text-slate-800 text-lg truncate w-full px-2" title={client.name}>{client.name}</h3>
            <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Entrar al workspace</span>
              <Link size={12} />
            </div>
          </a>
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
    </div>
  );
};

