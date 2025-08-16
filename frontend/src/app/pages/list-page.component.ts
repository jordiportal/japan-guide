import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService, Folder, Place } from '../services/api.service';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-list-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatCardModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatToolbarModule, MatChipsModule, MatIconModule],
  template: `
  <div class="page">
    <mat-toolbar color="primary" class="topbar">
      <span class="title">Mapa del Japó</span>
      <span class="spacer"></span>
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

    <div class="grid">
      <a class="card" *ngFor="let p of places()" [routerLink]="['/place', p.id]">
        <div class="image" [class.placeholder]="!p.image_url">
          <img *ngIf="p.image_url" [src]="p.image_url" alt="{{p.name_ca}}" loading="lazy" />
          <span *ngIf="!p.image_url" class="material-icons">image</span>
        </div>
        <div class="content">
          <h3>{{ p.name_ca }} <small *ngIf="p.name_ja">（{{ p.name_ja }}）</small></h3>
          <p class="desc" *ngIf="p.description_ca">{{ p.description_ca }}</p>
        </div>
      </a>
    </div>
  </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; min-height: 100dvh; background: #fafafa; }
    .topbar { position: sticky; top: 0; z-index: 10; }
    .title { font-weight: 600; }
    .spacer { flex: 1 1 auto; }
    .refresh { background: transparent; border: 0; color: white; cursor: pointer; }
    .search { padding: 0.5rem 0.75rem; background: #fafafa; position: sticky; top: 56px; z-index: 9; }
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
    .image { width: 100%; height: 140px; display: grid; place-items: center; background: #f0f0f0; }
    .image img { width: 100%; height: 100%; object-fit: cover; }
    .image.placeholder { color: #9e9e9e; }
    .content { padding: 0.5rem 0.6rem 0.8rem; }
    h3 { margin: 0; font-size: 14px; line-height: 1.1; }
    small { color: #666; font-weight: 400; }
    .desc { margin: 0.25rem 0 0; color: #555; font-size: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  `]
})
export class ListPageComponent {
  private api = inject(ApiService);
  folders = signal<Folder[]>([]);
  places = signal<Place[]>([]);
  tags = signal<{ id: number; name: string; color: string }[]>([]);
  selectedFolderId?: number;
  query = '';
  selectedTag?: string;

  constructor() {
    this.api.getFolders().subscribe(f => this.folders.set(f));
    this.api.getTags().subscribe(t => this.tags.set(t));
    this.refresh();
  }

  refresh() {
    const params = new URLSearchParams();
    if (this.selectedFolderId) params.set('folderId', String(this.selectedFolderId));
    if (this.query) params.set('q', this.query);
    if (this.selectedTag) params.set('tag', this.selectedTag);
    this.api.getPlaces(this.selectedFolderId, this.query).subscribe(p => this.places.set(p));
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
}


