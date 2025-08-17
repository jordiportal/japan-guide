import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService, Place } from '../services/api.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
  <div class="container" *ngIf="place() as p">
    <div class="header">
      <a routerLink="/">← Tornar</a>
      <button class="icon-btn" *ngIf="user" (click)="toggleEdit()" aria-label="Editar">
        <span class="material-icons">{{ editMode ? 'close' : 'edit' }}</span>
      </button>
    </div>
    <h1>{{ p.name_ca }} <small *ngIf="p.name_ja">（{{ p.name_ja }}）</small></h1>
    <img *ngIf="p.image || p.image_url" [src]="p.image || p.image_url" class="hero" alt="{{p.name_ca}}" />
    <p *ngIf="p.description_ca">{{ p.description_ca }}</p>
    <p class="coords">Lat {{ p.latitude }}, Lng {{ p.longitude }}</p>
    <div class="map">
      <iframe
        [src]="safeMapUrl(p.latitude, p.longitude)"
        width="100%" height="320" style="border:0;" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Mapa"></iframe>
    </div>

    <hr>
    <h2 *ngIf="editMode">Editar</h2>
    <form *ngIf="editMode" (ngSubmit)="save()" class="form">
      <label>Títol
        <input type="text" [(ngModel)]="edit.name_ca" name="name_ca" required>
      </label>
      <label>Descripció
        <textarea [(ngModel)]="edit.description_ca" name="description_ca" rows="4"></textarea>
      </label>
      <label>Canviar imatge
        <input type="file" (change)="onFile($event)">
      </label>
      <div class="actions">
        <button type="submit">Guardar</button>
      </div>
    </form>
  </div>
  `,
  styles: [`
    .container { padding: 1rem; max-width: 900px; margin: 0 auto; }
    .header { display: flex; align-items: center; justify-content: space-between; }
    .icon-btn { background: transparent; border: 0; cursor: pointer; }
    .icon-btn .material-icons { font-size: 22px; color: #1976d2; }
    .hero { width: 100%; max-height: 400px; aspect-ratio: 16/9; object-fit: cover; border-radius: 12px; margin: 1rem 0; display: block; }
    .coords { color: #666; }
    .form { display: grid; gap: 0.75rem; margin-top: 1rem; }
    .form input[type="text"], .form textarea { width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #ccc; }
    .actions { display: flex; gap: 0.5rem; }
    .actions button { background: #1976d2; color: #fff; border: 0; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
  `]
})
export class DetailPageComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);
  place = signal<Place | null>(null);
  edit: { name_ca: string; description_ca?: string } = { name_ca: '' };
  file?: File;
  editMode = false;
  user: any = null;

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getPlace(id).subscribe(p => { this.place.set(p); this.edit = { name_ca: p.name_ca, description_ca: p.description_ca || '' }; });
    this.api.getSession().subscribe(s => this.user = s.user);
  }

  safeMapUrl(lat: number, lng: number): SafeResourceUrl {
    const q = encodeURIComponent(`${lat},${lng}`);
    const url = `https://www.google.com/maps?q=${q}&hl=ca&z=15&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  onFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.file = input.files[0];
    }
  }

  save() {
    const p = this.place();
    if (!p) return;
    this.api.updatePlace(p.id, this.edit).subscribe(() => {
      if (this.file) {
        this.api.uploadImage(p.id, this.file).subscribe(resp => {
          this.place.update(cur => cur ? { ...cur, name_ca: this.edit.name_ca, description_ca: this.edit.description_ca, image: resp.image } as any : cur);
          this.file = undefined;
        });
      } else {
        this.place.update(cur => cur ? { ...cur, name_ca: this.edit.name_ca, description_ca: this.edit.description_ca } as any : cur);
      }
      this.editMode = false;
    });
  }

  toggleEdit() { this.editMode = !this.editMode; }
}



