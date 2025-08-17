import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

export interface Folder { id: number; name: string; }
export interface Place {
  id: number;
  name_ca: string;
  name_ja?: string;
  description_ca?: string;
  description_ja?: string;
  folder_id?: number;
  latitude: number;
  longitude: number;
  image_url?: string;
  tags?: { id: number; name: string; color: string }[];
  image?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = 'http://localhost:3000/api';

  getFolders(): Observable<Folder[]> {
    return this.http.get<Folder[]>(`${this.base}/folders`);
  }

  getPlaces(folderId?: number, q?: string): Observable<Place[]> {
    const params: any = {};
    if (folderId) params.folderId = folderId;
    if (q) params.q = q;
    return this.http.get<Place[]>(`${this.base}/places`, { params });
  }

  getPlace(id: number): Observable<Place> {
    return this.http.get<Place>(`${this.base}/places/${id}`);
  }

  getTags(): Observable<{ id: number; name: string; color: string }[]> {
    return this.http.get<{ id: number; name: string; color: string }[]>(`${this.base}/tags`);
  }

  updatePlace(id: number, data: { name_ca: string; description_ca?: string }) {
    return this.http.put(`${this.base}/places/${id}`, data, { withCredentials: true });
  }

  uploadImage(id: number, file: File) {
    const form = new FormData();
    form.append('image', file);
    return this.http.post<{ ok: boolean; image: string }>(`${this.base}/places/${id}/image`, form, { withCredentials: true });
  }

  googleAuth(credential: string) {
    return this.http.post<{ ok: boolean; user: any }>(`${this.base}/auth/google`, { credential }, { withCredentials: true });
  }

  getSession() {
    return this.http.get<{ user: any }>(`${this.base}/auth/session`, { withCredentials: true });
  }

  logout() {
    return this.http.post<{ ok: boolean }>(`${this.base}/auth/logout`, {}, { withCredentials: true });
  }
}


