# Japan Guide

Aplicación web (Angular + Node/Express + SQLite) para explorar ubicaciones del KML, normalizadas al catalán y con referencias en japonés.

## Desarrollo

### Backend
```
cd backend
npm i
npm run import:kml
npm run dev
```
API en `http://localhost:3000`.

### Frontend
```
cd frontend
npm i
npm start
```
App en `http://localhost:4200`.

## Estructura
- `backend/`: Express + SQLite, importador KML y API REST
- `frontend/`: Angular 17, lista por tarjetas y detalle con mapa
- `data/`: base de datos SQLite (excluida del repo)
