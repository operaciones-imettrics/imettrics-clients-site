import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import { MantineProvider, createTheme, Loader, Text, Title, Paper, Button } from '@mantine/core';
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

// No-access screen
function NoAccessPage() {
  const handleSignOut = () => import('firebase/auth').then(({ signOut }) => import('./lib/firebase').then(({ auth }) => signOut(auth)));
  return (
    <div className="h-screen flex items-center justify-center bg-slate-950">
      <Paper p="xl" radius="md" className="max-w-md w-full text-center" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        <div className="text-5xl mb-4">🔒</div>
        <Title order={3} c="white" mb="sm">Sin acceso</Title>
        <Text c="dimmed" mb="xl">
          Tu cuenta no tiene acceso a ningún workspace. Por favor contactá al equipo de iMettrics para que te asignen los permisos correspondientes.
        </Text>
        <Button variant="outline" color="gray" onClick={handleSignOut} fullWidth>
          Cerrar sesión
        </Button>
      </Paper>
    </div>
  );
}

// Global Router
function AppRouter() {
  const { user } = useAuth();
  const { setClients } = useClientContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      api.get<Client[]>('/api/clients/my-workspaces')
        .then(data => {
            setClients(data); // Populate shared context for all components
            const currentPath = window.location.pathname;
            // If they are on the root or login, auto redirect
            if (currentPath === '/') {
                if (user.customRole === 'admin') {
                    // Admins always go to admin portal, regardless of workspace count
                    navigate('/admin');
                } else if (data.length === 0) {
                    // No workspaces assigned: show no-access page
                    navigate('/no-access');
                } else if (data.length === 1) {
                    navigate(`/workspace/${data[0].id}`);
                } else {
                    navigate('/admin');
                }
            }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, navigate, setClients]);

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><Loader /></div>;
  }

  return (
    <Routes>
      <Route path="/" element={<div className="h-screen flex items-center justify-center"><Loader /></div>} />
      <Route path="/no-access" element={<NoAccessPage />} />
      <Route path="/admin" element={<AdminPortal />} />
      <Route path="/workspace/:clientId" element={<WorkspaceMiddleware />}>
         <Route index element={<Navigate to="guides" replace />} />
         <Route path="guides" element={<GuidesModule />} />
         {/* Future modules go here */}
         <Route path="settings" element={user?.customRole === 'admin' ? <WorkspaceSettings /> : <Navigate to="guides" replace />} />
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
