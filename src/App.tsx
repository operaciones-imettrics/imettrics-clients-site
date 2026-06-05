import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';

import { AuthProvider, useAuth } from './components/AuthProvider';
import { Login } from './pages/Login';
import { api } from "./lib/api";
import { ClientProvider, useClientContext } from "./contexts/ClientContext";
import { storage } from "./services/storage";

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

// Global Auth wrapper
function AppContent() {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<AdminPortal />} />
        <Route path="/workspace/:clientId" element={<WorkspaceMiddleware />}>
           <Route index element={<Navigate to="guides" replace />} />
           <Route path="guides" element={<GuidesModule />} />
           {/* Future modules go here */}
           <Route path="settings" element={<WorkspaceSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <MantineProvider theme={theme}>
      <AuthProvider>
        <ClientProvider>
          <AppContent />
        </ClientProvider>
      </AuthProvider>
    </MantineProvider>
  );
}

export default App;
