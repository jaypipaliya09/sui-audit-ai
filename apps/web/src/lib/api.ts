'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include', // send cookies for refresh token
    });

    // Auto-refresh on 401
    if (res.status === 401 && token) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.getToken()}`;
        const retryRes = await fetch(`${API_URL}${path}`, {
          ...options,
          headers,
          credentials: 'include',
        });
        if (!retryRes.ok) {
          const err = await retryRes.json().catch(() => ({ message: 'Request failed' }));
          throw new Error(err.message || `Request failed with status ${retryRes.status}`);
        }
        return retryRes.json();
      } else {
        // Refresh failed — clear token
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(err.message || `Request failed with status ${res.status}`);
    }

    return res.json();
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.accessToken) {
        localStorage.setItem('token', data.accessToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // ── Auth ──
  async register(data: { name: string; email: string; password: string }) {
    return this.request<{ message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: { email: string; password: string }) {
    return this.request<{ accessToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyEmail(token: string) {
    return this.request<{ message: string }>(`/auth/verify-email?token=${token}`);
  }

  async logout() {
    return this.request<{ message: string }>('/auth/logout', { method: 'POST' });
  }

  // ── Audits ──
  async submitAudit(data: { contractCode: string; contractName: string; txDigest?: string }) {
    return this.request<{ auditId: string }>('/audit/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAuditReport(id: string) {
    return this.request<any>(`/audit/${id}/report`);
  }

  // ── Repo Audits ──
  async scanRepo(data: { repoUrl: string; includeTests?: boolean }) {
    return this.request<any>('/repo-audit/scan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async submitRepoAudit(data: { scanId: string; projectTrack: string; includeTests?: boolean }) {
    return this.request<{ repoAuditId: string }>('/repo-audit/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getRepoAuditReport(id: string) {
    return this.request<any>(`/repo-audit/${id}/report`);
  }

  async listRepoAudits(page = 1, limit = 10) {
    return this.request<any>(`/repo-audit?page=${page}&limit=${limit}`);
  }

  // ── Reports ──
  async getReports(page = 1, limit = 20) {
    return this.request<any>(`/reports?page=${page}&limit=${limit}`);
  }

  async getReportByBlobId(blobId: string) {
    return this.request<any>(`/reports/blob/${blobId}`);
  }

  async getReportById(id: string) {
    return this.request<any>(`/reports/${id}`);
  }

  // ── Billing ──
  async createCheckout(priceId: string) {
    return this.request<{ url: string }>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ priceId }),
    });
  }

  async getBillingStatus() {
    return this.request<any>('/billing/status');
  }

  async createPortalSession() {
    return this.request<{ url: string }>('/billing/portal');
  }

  // ── API Keys ──
  async createApiKey(data: { name: string; scopes?: string[] }) {
    return this.request<any>('/api-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listApiKeys() {
    return this.request<any[]>('/api-keys');
  }

  async revokeApiKey(id: string) {
    return this.request<any>(`/api-keys/${id}`, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
