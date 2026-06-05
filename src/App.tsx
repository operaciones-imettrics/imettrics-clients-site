import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import { MantineProvider, createTheme, Loader } from '@mantine/core';
import '@mantine/core/styles.css';

import { AuthProvider, useAuth } from './components/AuthProvider';
import { Login } from './pages/Login';
import { api } from "./lib/api";
import { ClientProvider, useClientContext } from "./contexts/ClientContext";
import { storage } from "./services/storage";
import type { Client } from "./types";

// Pages & Layout
import { AppShell } from "./components/AppShell";
import { GuidesModule } from "./pages/GuidesModule";
import { AdminPortal } from "./pages/AdminPortal";
import { WorkspaceSettings } from "./pages/WorkspaceSettings";

const theme = createTheme({
  primaryColor: 'blue',
});

// A component to automatically sync the targeted client context in the workspace
function WorkspaceMiddleware() {
  const { user } = useAuth();
  const { selectedClientId, setSelectedClientId } = useClientContext();
  const { clientId } = useParams<{ clientId: string }>();

  // Sync context with the URL parameter
  useEffect(() => {
    if (clientId && clientId !== selectedClientId) {
      setSelectedClientId(clientId);
    }
  }, [clientId, selectedClientId, setSelectedClientId]);

  // Sync backend when context updates
  useEffect(() => {
    if (user && selectedClientId) {
      api.setClientId(selectedClientId);
      storage.syncFromRemote();
    }
  }, [user, selectedClientId]);

  return <AppShell />;
}

// Global Router
function AppRouter() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      api.get<Client[]>('/api/clients/my-workspaces')
        .then(data => {
            const currentPath = window.location.pathname;
            // If they are on the root or login, auto redirect
            if (currentPath === '/') {
                if (data.length === 1 && user.customRole !== 'admin') {
                    navigate(`/workspace/${data[0].id}`);
                } else if (data.length > 0 || user.customRole === 'admin') {
                    navigate('/admin');
                }
            }
        })
        .catch(console.error);
    }
  }, [user, navigate]);

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<div className="h-screen flex items-center justify-center"><Loader /></div>} />
      <Route path="/admin" element={<AdminPortal />} />
      <Route path="/workspace/:clientId" element={<WorkspaceMiddleware />}>
         <Route index element={<Navigate to="guides" replace />} />
         <Route path="guides" element={<GuidesModule />} />
         {/* Future modules go here */}
         <Route path="settings" element={<WorkspaceSettings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <MantineProvider theme={theme}>
      <AuthProvider>
        <ClientProvider>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </ClientProvider>
      </AuthProvider>
    </MantineProvider>
  );
}

export default App;
