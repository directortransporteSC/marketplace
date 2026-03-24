# 🚗 AutoMarket — Supabase + GitHub Pages

Marketplace de vehículos con base de datos en la nube, fotos en Storage,
múltiples administradores y publicación en GitHub Pages.

---

## 📁 Estructura del proyecto

```
automarket/
├── index.html              ← Vista CLIENTE (pública)
├── admin.html              ← Vista ADMINISTRADOR (login)
├── supabase_setup.sql      ← Script SQL para configurar la BD
├── css/
│   └── styles.css
├── js/
│   ├── supabase.js         ← ⚠️ AQUÍ van tus credenciales + admins
│   ├── client.js           ← Lógica vista cliente
│   └── admin.js            ← Lógica panel admin
└── assets/
    └── specialcar.png      ← Tu logo
```

---

## 🚀 Paso 1 — Crear el proyecto en Supabase

1. Ve a **https://supabase.com** y crea una cuenta gratuita
2. Clic en **"New project"**
3. Ponle un nombre (ej: `automarket`) y elige una región cercana a Colombia
4. Espera ~2 minutos a que se cree el proyecto

---

## 🔑 Paso 2 — Obtener las credenciales

1. En el dashboard de Supabase ve a **Settings → API**
2. Copia los dos valores y pégalos en `js/supabase.js`:

```javascript
const SUPABASE_URL  = 'https://XXXXXXXXXXXX.supabase.co';  // Project URL
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5c...';     // anon public key
```

---

## 🗄️ Paso 3 — Crear la base de datos

1. En Supabase ve a **SQL Editor → New query**
2. Copia todo el contenido de `supabase_setup.sql`
3. Pégalo en el editor y clic en **"Run"**

Esto crea:
- ✅ Tabla `vehicles` con todos los campos
- ✅ Políticas de seguridad (clientes solo leen, admins escriben)
- ✅ 8 vehículos de ejemplo

---

## 🪣 Paso 4 — Crear el bucket de fotos

1. En Supabase ve a **Storage**
2. Clic en **"New bucket"**
3. Nombre: `vehicle-images`
4. Activa **"Public bucket"** ✅
5. Clic en **"Create bucket"**

Las fotos de los vehículos se guardarán aquí automáticamente.

---

## 👥 Paso 5 — Crear administradores

Cada admin necesita un usuario en Supabase:

1. Ve a **Authentication → Users → Add user**
2. Ingresa el correo y contraseña del administrador
3. Clic en **"Create user"**
4. Repite para cada admin (hasta 5 recomendado)

Luego en `js/supabase.js` registra los correos (solo para mostrar el nombre en el panel):

```javascript
const ADMINS = [
  { user: 'juan@tuempresa.com',  label: 'Juan García' },
  { user: 'maria@tuempresa.com', label: 'María López' },
  { user: 'pedro@tuempresa.com', label: 'Pedro Sánchez' },
  // Agrega más aquí...
];
```

> **Importante:** El correo en `ADMINS` debe coincidir exactamente con el
> correo creado en Supabase Auth.

---

## 🌐 Paso 6 — Publicar en GitHub Pages

1. Crea un repositorio en **https://github.com** (puede ser privado o público)
2. Sube todos los archivos del proyecto al repositorio
3. Ve a **Settings → Pages**
4. En "Source" selecciona **"Deploy from a branch"**
5. Rama: `main`, carpeta: `/ (root)`
6. Clic en **"Save"**

En ~2 minutos tu sitio estará en:
```
https://TU_USUARIO.github.io/NOMBRE_REPOSITORIO/
```

---

## 🔧 Cómo agregar más administradores

1. Ve a Supabase → **Authentication → Users → Add user**
2. Crea el usuario con correo y contraseña
3. Agrega el correo al array `ADMINS` en `js/supabase.js`
4. Haz commit del cambio en GitHub

---

## 📞 Dónde están los datos de contacto del vendedor

En el formulario de publicación (panel admin) encontrarás:

| Campo | Descripción |
|---|---|
| **Nombre del vendedor** | Nombre o empresa que aparece en el anuncio |
| **WhatsApp** | Número para el botón 💬 WhatsApp (sin +57) |
| **Teléfono adicional** | Segundo número para el botón 📞 Llamar |
| **Correo electrónico** | Para el botón ✉️ Correo |
| **Ciudad** | Ubicación que se muestra en la tarjeta |

En la vista cliente, el botón de WhatsApp abre directamente la conversación.
El botón de correo abre el cliente de email con el mensaje pre-llenado.

---

## 🖼️ Dónde se guardan las fotos

Las fotos se suben directamente a **Supabase Storage** en el bucket `vehicle-images`.
Cada foto recibe una URL pública permanente que se guarda en la columna `images` de la tabla.

- ✅ No ocupan espacio en GitHub
- ✅ Se sirven rápido desde la CDN de Supabase
- ✅ Plan gratuito: hasta **1 GB** de almacenamiento

---

## 🎨 Personalización rápida

**Cambiar colores** (`css/styles.css`):
```css
:root {
  --blue:   #1a2f6e;   /* Azul principal */
  --accent: #2563eb;   /* Botones */
}
```

**Cambiar nombre del marketplace:**
Busca `AutoMarket` en `index.html` y `admin.html`.

**Cambiar credenciales:**
Edita `js/supabase.js` líneas 4–5.

---

## 💰 Costos

| Servicio | Plan gratuito |
|---|---|
| Supabase | ✅ Gratis (500 MB BD, 1 GB Storage, 50.000 req/mes) |
| GitHub Pages | ✅ Gratis (repositorio público) |
| **Total** | **$0** |

---

*HTML + CSS + JavaScript puro con Supabase como backend. Sin frameworks.*
