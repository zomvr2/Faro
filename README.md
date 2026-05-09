# 🗺️ Faro by Justice. - Sistema de Reportes Geolocalizado

> **Aplicación móvil para reportar y visualizar incidentes en tiempo real** — Construida con Expo, React Native y Appwrite.

![Faro App](https://img.shields.io/badge/React%20Native-0.81-61dafb?style=flat-square&logo=react)
![Expo](https://img.shields.io/badge/Expo-54.0-000000?style=flat-square&logo=expo)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6?style=flat-square&logo=typescript)
![iOS & Android](https://img.shields.io/badge/Platform-iOS%20|%20Android-000000?style=flat-square)

---

## 📋 Descripción

**Faro** es una aplicación móvil que permite a los usuarios:

✨ **Reportar incidentes** — Crear reportes con descripción, categoría, ubicación GPS e imágenes  
🗺️ **Visualizar en mapa** — Ver todos los reportes cercanos en tiempo real en un mapa interactivo  
🔔 **Notificaciones en vivo** — Recibir alertas cuando se crea un reporte a menos de 1km de distancia  
📡 **Sincronización en tiempo real** — Actualizaciones instantáneas gracias a Appwrite Realtime  
🏷️ **Seguimiento de estado** — Marcar reportes como activos, resueltos o falsos  

---

## 🚀 Quick Start

### Requisitos previos

- **Node.js** ≥ 18
- **npm** o **yarn**
- **Expo CLI**: `npm install -g expo-cli`
- **Android Studio** (para emulador Android) o **Xcode** (para simulador iOS)
- **Appwrite** — Cuenta gratuita en [cloud.appwrite.io](https://cloud.appwrite.io)

### Instalación

1. **Clonar y navegar al proyecto**
   ```bash
   git clone <repo>
   cd Faro
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   
   Crear archivo `.env` en la raíz del proyecto:
   ```env
   EXPO_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   EXPO_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_APPWRITE_DATABASE_ID=your_database_id
   EXPO_PUBLIC_APPWRITE_REPORTS_COLLECTION_ID=your_reports_collection_id
   EXPO_PUBLIC_APPWRITE_REPORTS_BUCKET_ID=your_reports_bucket_id
   ```

4. **Iniciar la aplicación**
   ```bash
   npm start
   ```
   
   En el menú, presionar:
   - `a` para abrir en emulador Android
   - `i` para abrir en simulador iOS
   - `w` para abrir en web
   - `j` para abrir en Expo Go (teléfono real)

---

## 📱 Características Principales

### 🗺️ Mapa Interactivo
- Visualización de reportes en tiempo real usando **MapLibre**
- Clustering automático de marcadores
- Cámara controlada por contexto React
- Ubicación en vivo del usuario

### 📝 Crear Reportes
- Formulario intuitivo con:
  - Descripción del incidente
  - Categoría del reporte
  - Ubicación GPS automática
  - Captura de hasta 3 imágenes (cámara o galería)
  - Estado inicial (Activo/Resuelto/Falso)
- Carga de imágenes a **Appwrite Storage**
- Almacenamiento en base de datos Appwrite

### 🔔 Notificaciones
- Alertas locales para reportes cercanos (≤ 1km)
- Prevención de notificaciones duplicadas
- Integración con **expo-notifications**

### 📡 Sincronización en Tiempo Real
- Suscripción a cambios en tiempo real con Appwrite
- Actualización automática de reportes sin recargar
- Historial de reportes (RSS/Feed)

### 🎨 Interfaz Moderna
- Navegación por tabs (Mapa, Añadir reporte, RSS)
- Diseño responsive para iOS y Android
- Modo oscuro/claro automático
- Animaciones fluidas con **React Native Reanimated**

---

## 📁 Estructura del Proyecto

```
Faro/
├── 📱 app/                          # Código de la aplicación
│   ├── (tabs)/                      # Rutas principales (Expo Router)
│   │   ├── _layout.tsx              # Layout con tabs y lógica principal
│   │   ├── index.tsx                # Tab: Mapa
│   │   ├── add.tsx                  # Tab: Crear reporte
│   │   └── rss.tsx                  # Tab: Feed de reportes
│   └── _layout.tsx                  # Root layout
│
├── 🎨 components/                   # Componentes reutilizables
│   ├── TabBarIcon.tsx               # Iconos de navegación
│   ├── map/
│   │   ├── Map.tsx                  # Componente mapa principal
│   │   └── MapCameraContext.tsx     # Control de cámara del mapa
│   └── report/
│       └── ReportComponent.tsx       # Card de reporte
│
├── 🔧 services/appwrite/            # Capa de servicios Appwrite
│   ├── client.ts                    # Inicialización cliente
│   ├── env.ts                       # Variables de entorno
│   ├── index.ts                     # Exportaciones
│   └── reports.ts                   # API de reportes
│
├── 📦 assets/                       # Imágenes, fuentes, etc.
│   └── images/
│
├── ⚙️ Configuración
│   ├── app.json                     # Config Expo
│   ├── eas.json                     # Perfiles de build (Dev/Preview/Prod)
│   ├── babel.config.js              # Babel + Reanimated
│   ├── metro.config.js              # Metro bundler
│   ├── tsconfig.json                # TypeScript
│   └── eslint.config.js             # Linting
│
├── 📋 package.json                  # Dependencias
└── 📚 README.md                     # Este archivo
```

---

## 🛠️ Comandos Disponibles

### Desarrollo
```bash
# Iniciar desarrollo
npm start

# Ejecutar en Android
npm run android

# Ejecutar en iOS
npm run ios

# Ejecutar en web
npm run web

# Linting y validación
npm lint
```

### Build & Deployment (EAS)

**Nota:** Requiere cuenta en [EAS Build](https://eas.dev/)

```bash
# Construcción por perfil (dev/preview/production)
npm run eas:build:dev          # APK para desarrollo
npm run eas:build:preview      # Build preview
npm run eas:build:production   # Build para App Store/Play Store

# Publicar OTA updates
npm run eas:update:dev         # Al branch development
npm run eas:update:preview     # Al branch preview
npm run eas:update:production  # Al branch production
```

### Otros
```bash
# Resetear proyecto a estado inicial
npm run reset-project
```

---

## 🔐 Configuración de Appwrite

### Estructura de Base de Datos

**Colección: `reports`**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `description` | String | Descripción del incidente |
| `category` | String | Categoría del reporte |
| `lat` | Double | Latitud de la ubicación |
| `lng` | Double | Longitud de la ubicación |
| `status` | String | Estado: `active` \| `solved` \| `false` |
| `images` | String | URLs separadas por coma (máx. 3) |
| `createdAt` | DateTime | Fecha de creación |

### Bucket: `reports` (Storage)

- Para almacenar imágenes de reportes
- Máximo 3 imágenes por reporte
- Soporta JPG, PNG, WebP

### Permisos

Configura permisos públicos para lectura en:
- Colección `reports` (read)
- Bucket `reports` (read)

---

## 🚀 Flujo de Desarrollo

### Rama → Canal de Actualización

El proyecto usa **EAS Update** con mapeo automático:

```
development branch → development channel
preview branch     → preview channel
production branch  → production channel
```

### Ciclo Típico de Desarrollo

1. **Desarrollo local**
   ```bash
   npm start
   # Editar código en app/
   ```

2. **Build para tu device**
   ```bash
   npm run eas:build:dev      # Primera vez
   npm run android            # O: npm run ios
   ```

3. **Publicar OTA update** (cambios sin rebuild)
   ```bash
   npm run eas:update:dev
   ```

4. **Mergear a production cuando esté listo**
   ```bash
   git merge main production
   npm run eas:update:production
   ```

---

## 📚 Stack Tecnológico

| Tecnología | Versión | Propósito |
|---|---|---|
| **React Native** | 0.81 | Framework móvil |
| **Expo** | 54.0 | Plataforma de desarrollo |
| **Expo Router** | 6.0 | Routing basado en archivos |
| **MapLibre** | 10.4 | Mapas interactivos |
| **Appwrite** | 0.26 | Backend BaaS |
| **React Reanimated** | 4.1 | Animaciones |
| **React Navigation** | 7.1 | Navegación avanzada |
| **TypeScript** | 5.3 | Tipado estático |
| **Lucide Icons** | 1.7 | Iconografía |

---

## 🔄 Servicios de Appwrite

Todas las operaciones de Appwrite se centralizan en `services/appwrite/reports.ts`:

```typescript
// Crear un reporte
createReport(description, category, lat, lng, images)

// Obtener reportes cercanos
getNearbyReports(latitude, longitude, radiusKm)

// Suscribirse a cambios en tiempo real
subscribeToReports(callback)

// Obtener imágenes de un reporte
getReportImageUrls(imageCSV)
```

---

## 📍 Notificaciones de Proximidad

Cuando un usuario crea un reporte:

1. Se obtiene ubicación actual del usuario
2. Se calcula distancia a nuevos reportes
3. Si distancia ≤ 1000m → se dispara notificación local
4. Sistema de `notifiedReportIdsRef` previene duplicados

---

## 🤝 Contribución

1. Crear rama desde `development`
2. Hacer cambios y commits claros
3. Push a tu rama
4. Crear Pull Request

**Estándares:**
- Usar TypeScript para nuevo código
- Componentes con hooks modernos
- Siguiendo convenciones de Expo Router

---

## 📖 Recursos & Documentación

- [Expo Docs](https://docs.expo.dev) — Guías completas
- [Expo Router](https://docs.expo.dev/router/introduction/) — Routing basado en archivos
- [Appwrite Docs](https://appwrite.io/docs) — Backend & APIs
- [React Native Docs](https://reactnative.dev) — Fundamentos
- [EAS Build](https://docs.expo.dev/build/introduction/) — Compilación en la nube

---

## 📄 Licencia

Este proyecto es de uso privado.

---

## 💬 Soporte

¿Preguntas o problemas? Abre un issue en el repositorio.

---

**Última actualización:** Mayo 2026 | **Versión:** 1.0.0

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
