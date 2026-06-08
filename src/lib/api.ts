import { auth } from './firebase';

const BASE_URL = import.meta.env.VITE_API_URL || '';

class ApiClient {
  private targetClientId: string | null = null;

  setClientId(clientId: string | null | undefined) {
    if (clientId === "null" || clientId === "undefined" || !clientId) {
      this.targetClientId = null;
    } else {
      this.targetClientId = clientId;
    }
  }

  private async getHeaders(): Promise<Headers> {
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      headers.append('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  private getUrl(path: string): string {
    if (!this.targetClientId) return `${BASE_URL}${path}`;
    const url = new URL(`${BASE_URL}${path}`);
    url.searchParams.append('clientId', this.targetClientId);
    return url.toString();
  }

  private appendTargetClient(data: any): any {
    if (!this.targetClientId) return data;
    return { ...data, clientId: this.targetClientId };
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(this.getUrl(path), {
      method: 'GET',
      headers: await this.getHeaders(),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  async post<T>(path: string, data: any): Promise<T> {
    const response = await fetch(this.getUrl(path), {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(this.appendTargetClient(data)),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  async put<T>(path: string, data: any): Promise<T> {
    const response = await fetch(this.getUrl(path), {
      method: 'PUT',
      headers: await this.getHeaders(),
      body: JSON.stringify(this.appendTargetClient(data)),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  async delete(path: string): Promise<void> {
    const response = await fetch(this.getUrl(path), {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });
    if (!response.ok) throw new Error(await response.text());
  }
}

export const api = new ApiClient();
