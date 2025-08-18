FROM node:18
WORKDIR /app
# Copiamos desde el contexto raíz del repo
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/src ./src
# Incluir el KML en la imagen para auto-inicialización
# Copiamos cualquier archivo KML del repo y lo renombramos a kml.xml dentro de la imagen
COPY Mapa*xml kml.xml
EXPOSE 3000
ENV PORT=3000
CMD ["node", "src/server.js"]

