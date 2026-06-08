import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Client } from '../types';

interface ClientContextType {
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;
  clients: Client[];
  setClients: (clients: Client[]) => void;
}

const ClientContext = createContext<ClientContextType>({
  selectedClientId: null,
  setSelectedClientId: () => {},
  clients: [],
  setClients: () => {},
});

export const ClientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  return (
    <ClientContext.Provider value={{ selectedClientId, setSelectedClientId, clients, setClients }}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClientContext = () => useContext(ClientContext);
