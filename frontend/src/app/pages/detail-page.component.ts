import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService, Place } from '../services/api.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
  <div class="container" *ngIf="place() as p">
    <a routerLink="/">← Tornar</a>
    <h1>{{ p.name_ca }} <small *ngIf="p.name_ja">（{{ p.name_ja }}）</small></h1>
    <img *ngIf="p.image || p.image_url" [src]="p.image || p.image_url" class="hero" alt="{{p.name_ca}}" />
    <p *ngIf="p.description_ca">{{ p.description_ca }}</p>
    <p class="coords">Lat {{ p.latitude }}, Lng {{ p.longitude }}</p>
    <div class="map">
      <iframe
        [src]="safeMapUrl(p.latitude, p.longitude)"
        width="100%" height="320" style="border:0;" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Mapa"></iframe>
    </div>
  </div>
  `,
  styles: [`
    .container { padding: 1rem; max-width: 900px; margin: 0 auto; }
    .hero { width: 100%; max-height: 400px; aspect-ratio: 16/9; object-fit: cover; border-radius: 12px; margin: 1rem 0; display: block; }
    .coords { color: #666; }
  `]
})
export class DetailPageComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);
  place = signal<Place | null>(null);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getPlace(id).subscribe(p => this.place.set(p));
  }

  safeMapUrl(lat: number, lng: number): SafeResourceUrl {
    const q = encodeURIComponent(`${lat},${lng}`);
    const url = `https://www.google.com/maps?q=${q}&hl=ca&z=15&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}



