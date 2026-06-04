import { auth } from './firebase';

const BASE_URL = import.meta.env.VITE_API_URL || '';

class ApiClient {
  private async getHeaders(): Promise<Headers> {
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      headers.append('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  async post<T>(path: string, data: any): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  async put<T>(path: string, data: any): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  async delete(path: string): Promise<void> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });
    if (!response.ok) throw new Error(await response.text());
  }
}

export const api = new ApiClient();
