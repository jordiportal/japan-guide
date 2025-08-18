import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ApiService, Folder, Place } from '../services/api.service';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import * as L from 'leaflet';

@Component({
  selector: 'app-list-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatCardModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatToolbarModule, MatChipsModule, MatIconModule],
  template: `
  <div class="page">
    <mat-toolbar color="primary" class="topbar">
      <span class="title">Mapa del Japó</span>
      <span class="spacer"></span>
      <button class="refresh" (click)="openNew()" aria-label="Afegir">
        <span class="material-icons">add</span>
      </button>
      <button class="refresh" (click)="toggleMode()" aria-label="Canviar vista">
        <span class="material-icons">{{ mapMode ? 'view_module' : 'map' }}</span>
      </button>
      <button class="refresh" (click)="refresh()" aria-label="Actualitzar">
        <span class="material-icons">refresh</span>
      </button>
    </mat-toolbar>

    <div class="search">
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Cerca llocs</mat-label>
        <input matInput [(ngModel)]="query" (input)="debouncedRefresh()" placeholder="parc, museu, botiga..." />
        <button matSuffix class="clear" *ngIf="query" (click)="query=''; refresh()" aria-label="Esborrar">
          <span class="material-icons">close</span>
        </button>
      </mat-form-field>
    </div>

    <form *ngIf="creating" class="create-form" (ngSubmit)="create()">
      <div class="create-grid">
        <input type="text" placeholder="Títol" [(ngModel)]="newPlace.name_ca" name="name_ca" required>
        <input type="text" placeholder="Títol en japonès (opcional)" [(ngModel)]="newPlace.name_ja" name="name_ja">
        <textarea rows="2" placeholder="Descripció (opcional)" [(ngModel)]="newPlace.description_ca" name="description_ca"></textarea>
        <div class="row">
          <input type="number" step="any" placeholder="Latitud" [(ngModel)]="newPlace.latitude" name="latitude" required>
          <input type="number" step="any" placeholder="Longitud" [(ngModel)]="newPlace.longitude" name="longitude" required>
        </div>
        <div class="row">
          <select [(ngModel)]="newPlace.folder_id" name="folder_id">
            <option [ngValue]="undefined">Sense carpeta</option>
            <option *ngFor="let f of folders()" [ngValue]="f.id">{{ f.name }}</option>
          </select>
          <button type="submit">Afegir</button>
          <button type="button" (click)="creating=false">Cancel·lar</button>
        </div>
      </div>
    </form>

    <div class="folders">
      <mat-chip-listbox aria-label="Carpetes" class="chips" [multiple]="false">
        <mat-chip-option [selected]="!selectedFolderId" (click)="selectFolder(undefined)">Totes</mat-chip-option>
        <mat-chip-option *ngFor="let f of folders()" [selected]="selectedFolderId===f.id" (click)="selectFolder(f.id)">{{ f.name }}</mat-chip-option>
      </mat-chip-listbox>
    </div>

    <div class="tags">
      <div class="tags-scroll">
        <button class="tag" [class.active]="!selectedTag" (click)="selectTag(undefined)">Totes</button>
        <button class="tag" *ngFor="let t of tags()" [style.background]="selectedTag===t.name ? t.color : '#eee'" [style.color]="selectedTag===t.name ? '#fff' : '#333'" (click)="selectTag(t.name)">{{ t.name }}</button>
      </div>
    </div>

    <div class="grid" *ngIf="!mapMode">
      <a class="card" *ngFor="let p of places()" [routerLink]="['/place', p.id]">
        <div class="image" [class.placeholder]="!(p.image || p.image_url)">
          <img *ngIf="p.image || p.image_url" [src]="p.image || p.image_url" alt="{{p.name_ca}}" loading="lazy" />
          <span *ngIf="!p.image_url" class="material-icons">image</span>
        </div>
        <div class="content">
          <h3>{{ p.name_ca }} <small *ngIf="p.name_ja">（{{ p.name_ja }}）</small></h3>
          <div class="meta">
            <span class="material-icons heart">favorite</span>
            <span>{{ p.votes || 0 }}</span>
          </div>
          <p class="desc" *ngIf="p.description_ca">{{ p.description_ca }}</p>
        </div>
      </a>
    </div>

    <div *ngIf="mapMode" class="map-wrap">
      <div id="leaflet-map" class="map"></div>
    </div>
  </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; min-height: 100dvh; background: #fafafa; }
    .topbar { position: sticky; top: 0; z-index: 10; }
    .title { font-weight: 600; }
    .spacer { flex: 1 1 auto; }
    .refresh { background: transparent; border: 0; color: white; cursor: pointer; }
    .avatar { width: 28px; height: 28px; border-radius: 50%; margin-right: 6px; cursor: pointer; }
    .search { padding: 0.5rem 0.75rem; background: #fafafa; position: sticky; top: 56px; z-index: 9; }
    .create-form { padding: 0.5rem 0.75rem; }
    .create-grid { display: grid; gap: 0.5rem; }
    .create-grid input, .create-grid textarea, .create-grid select { width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #ccc; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .search-field { width: 100%; }
    .clear { background: transparent; border: 0; cursor: pointer; }
    .folders { padding: 0 0.5rem 0.5rem; overflow-x: auto; }
    .chips { display: flex; gap: 0.25rem; padding: 0 0.25rem; }
    .tags { padding: 0 0.5rem 0.25rem; }
    .tags-scroll { display: flex; gap: 0.5rem; overflow-x: auto; padding: 0 0.25rem; }
    .tag { border: 0; padding: 6px 10px; border-radius: 999px; background: #eee; color: #333; font-size: 12px; }
    .tag.active { background: #333; color: #fff; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; padding: 0.5rem; }
    @media (min-width: 600px) { .grid { grid-template-columns: repeat(3, 1fr); } }
    @media (min-width: 900px) { .grid { grid-template-columns: repeat(4, 1fr); } }
    .card { display: flex; flex-direction: column; text-decoration: none; color: inherit; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.08); border: 1px solid #eee; }
    .image { width: 100%; height: 140px; display: grid; place-items: center; background: #f0f0f0; overflow: hidden; border-top-left-radius: 12px; border-top-right-radius: 12px; }
    .image img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .image.placeholder { color: #9e9e9e; }
    .content { padding: 0.5rem 0.6rem 0.8rem; }
    .meta { display: inline-flex; align-items: center; gap: 4px; color: #e53935; font-size: 12px; }
    .heart { font-size: 16px; vertical-align: middle; }
    h3 { margin: 0; font-size: 14px; line-height: 1.1; }
    small { color: #666; font-weight: 400; }
    .desc { margin: 0.25rem 0 0; color: #555; font-size: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .map-wrap { height: calc(100dvh - 160px); padding: 0.5rem; }
    .map { height: 100%; border-radius: 12px; overflow: hidden; }
  `]
})
export class ListPageComponent {
  private api = inject(ApiService);
  private router = inject(Router);
  folders = signal<Folder[]>([]);
  places = signal<Place[]>([]);
  tags = signal<{ id: number; name: string; color: string }[]>([]);
  selectedFolderId?: number;
  query = '';
  selectedTag?: string;
  mapMode = false;
  private map?: L.Map;
  private markers: L.Marker[] = [];
  // Edición pública: ocultamos login/logout

  constructor() {
    this.api.getFolders().subscribe(f => this.folders.set(f));
    this.api.getTags().subscribe(t => this.tags.set(t));
    this.refresh();
    // No comprobamos sesión
  }

  refresh() {
    this.api.getPlaces(this.selectedFolderId, this.query, this.selectedTag).subscribe((p: any) => {
      this.places.set(p);
      if (this.mapMode) setTimeout(() => this.drawMarkers(), 0);
    });
  }

  private debounceTimer?: any;
  debouncedRefresh() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.refresh(), 300);
  }

  selectFolder(id: number | undefined) {
    this.selectedFolderId = id;
    this.refresh();
  }

  selectTag(name?: string) {
    this.selectedTag = name;
    this.refresh();
  }

  toggleMode() {
    this.mapMode = !this.mapMode;
    if (this.mapMode) {
      setTimeout(() => this.initMap(), 0);
    } else {
      this.destroyMap();
    }
  }

  private initMap() {
    if (this.map) return;
    this.map = L.map('leaflet-map').setView([35.68, 139.76], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
    this.drawMarkers();
  }

  private drawMarkers() {
    if (!this.map) return;
    this.markers.forEach(m => m.remove());
    this.markers = [];
    const bounds = L.latLngBounds([]);
    for (const p of this.places()) {
      const marker = L.marker([p.latitude, p.longitude]).addTo(this.map!);
      const img = (p.image || p.image_url) ? `<img src="${p.image || p.image_url}" alt="${p.name_ca}">` : `<div class="img ph"></div>`;
      const kanji = p.name_ja ? `（${p.name_ja}）` : '';
      const desc = p.description_ca ? p.description_ca : '';
      const html = `
        <div class="poi-card">
          <div class="img-wrap">${img}</div>
          <div class="info">
            <div class="title">${p.name_ca} <small>${kanji}</small></div>
            <div class="desc">${desc}</div>
            <button class="goto" data-id="${p.id}">Veure</button>
          </div>
        </div>`;
      marker.bindPopup(html, { maxWidth: 280 });
      marker.on('popupopen', () => {
        const el = document.querySelector(`.leaflet-popup .goto[data-id='${p.id}']`);
        if (el) {
          el.addEventListener('click', () => this.router.navigate(['/place', p.id]), { once: true });
        }
      });
      this.markers.push(marker);
      bounds.extend([p.latitude, p.longitude]);
    }
    if (bounds.isValid()) this.map.fitBounds(bounds.pad(0.1));
  }

  private destroyMap() {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
      this.markers = [];
    }
  }

  creating = false;
  newPlace: { name_ca: string; name_ja?: string; description_ca?: string; latitude: number | null; longitude: number | null; folder_id?: number } = {
    name_ca: '', name_ja: '', description_ca: '', latitude: null, longitude: null
  };

  openNew() { this.creating = true; }

  create() {
    if (!this.newPlace.name_ca || this.newPlace.latitude == null || this.newPlace.longitude == null) return;
    const payload = {
      name_ca: this.newPlace.name_ca,
      name_ja: this.newPlace.name_ja || undefined,
      description_ca: this.newPlace.description_ca || undefined,
      latitude: Number(this.newPlace.latitude),
      longitude: Number(this.newPlace.longitude),
      folder_id: this.newPlace.folder_id
    } as any;
    this.api.createPlace(payload).subscribe(p => {
      this.creating = false;
      this.newPlace = { name_ca: '', name_ja: '', description_ca: '', latitude: null, longitude: null };
      this.refresh();
    });
  }

  // Sin login/logout
}


