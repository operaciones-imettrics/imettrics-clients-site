import { useState } from 'react';
import { Button, Paper, Title, Container, Text } from '@mantine/core';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Mail } from 'lucide-react';

export function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Error al iniciar sesión con Google');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40} className="h-screen flex flex-col justify-center">
      <div className="flex flex-col items-center mb-6">
        <img 
          src="https://imettrics.com/wp-content/uploads/2023/12/Favicon.png" 
          alt="iMettrics" 
          className="h-16 w-16 object-contain mb-4"
        />
        <Title ta="center" className="text-slate-800">
          iMettrics Portal
        </Title>
        <Text c="dimmed" size="sm" ta="center" mt={5}>
          Ingresa con tu cuenta de Google autorizada
        </Text>
      </div>

      <Paper withBorder shadow="md" p={30} radius="md">
        {error && (
          <Text c="red" size="sm" mb="md" ta="center">
            {error}
          </Text>
        )}
        <Button 
          fullWidth 
          size="lg"
          onClick={handleGoogleLogin} 
          loading={loading} 
          variant="outline"
          color="gray"
          leftSection={<Mail size={20} />}
          className="hover:bg-slate-50 hover:text-slate-900 transition-colors border-slate-300"
        >
          Acceder con Google
        </Button>
      </Paper>
    </Container>
  );
}
