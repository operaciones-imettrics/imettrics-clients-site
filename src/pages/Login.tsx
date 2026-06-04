import React, { useState } from 'react';
import { TextInput, PasswordInput, Button, Paper, Title, Container, Text } from '@mantine/core';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40} className="h-screen flex flex-col justify-center">
      <Title ta="center" className="text-slate-800">
        iMettrics Portal
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Ingresa con tus credenciales
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleLogin}>
          <TextInput
            label="Email"
            placeholder="tu@email.com"
            required
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
          />
          <PasswordInput
            label="Contraseña"
            placeholder="Tu contraseña"
            required
            mt="md"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
          />
          {error && (
            <Text c="red" size="sm" mt="sm">
              {error}
            </Text>
          )}
          <Button fullWidth mt="xl" type="submit" loading={loading} color="blue">
            Iniciar sesión
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
