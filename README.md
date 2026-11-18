# Life

Plan diario de entrenamiento, comidas, suplementos, súper y progreso. Cada usuario tiene su cuenta, su propio plan (calorías, porciones y horarios calculados con su perfil) y sus datos separados.

La app no abre ningún puerto en el VPS: un túnel de Cloudflare la conecta con tu dominio, igual que opencaptions.

## 1. Crear el túnel en Cloudflare

1. Entrá a https://one.dash.cloudflare.com → **Networks → Tunnels → Create a tunnel → Cloudflared**. Nombre: `life`.
2. En la pantalla de instalación elegí **Docker** y copiá solo el token (lo que viene después de `--token`).
3. **Public hostname**: subdominio `life`, dominio `carraro.ar`, Service `HTTP`, URL `life:3000`. Guardá.

No hace falta Cloudflare Access: el login lo hace la app.

## 2. Subirlo al VPS

```bash
# desde tu compu (PowerShell)
scp -r $HOME\Downloads\life usuario@IP-DEL-VPS:~/life

# en el VPS
cd ~/life
cp .env.example .env
nano .env        # TUNNEL_TOKEN, ADMIN_USERNAME, ADMIN_PASSWORD (8+ caracteres), ADMIN_NAME
docker compose up -d --build
docker compose logs -f   # esperá "Admin ... creado" y "life escuchando en :3000"
```

Abrí https://life.carraro.ar, entrá con tu usuario y completá tu perfil.

## 3. Sumar a otras personas

En la app: **Perfil** (ícono de persona arriba a la derecha) → **Usuarios** → Crear usuario. Le pasás el usuario y la contraseña inicial. La primera vez que entra, carga su peso, meta y horarios y la app arma su plan. Desde ahí también podés generarle una contraseña nueva o borrarlo.

## Recordatorios en el celu

En **Hoy** → Recordatorios → Activar. En iPhone primero hay que agregar la app a la pantalla de inicio (Compartir → Agregar a inicio) y abrirla desde ahí.

## Ilustraciones

Las ilustraciones de los ejercicios se bajan solas al construir la imagen (`scripts/fetch-art.mjs`) y quedan guardadas en `src/art/`. Si el VPS no tiene internet en ese momento, la app funciona igual, sin dibujos.

## Cambiar el plan

Comidas, ejercicios y horarios base están en `src/plan.js` y `src/exercises.js`. Editás y corrés `docker compose up -d --build`. Los datos de cada usuario viven en el volumen `life-data` y no se pierden.

## Backup

```bash
docker compose cp life:/data/life.db ./backup-$(date +%F).db
```

## Desarrollo local

```bash
npm install
ADMIN_USERNAME=admin ADMIN_PASSWORD=cambiame123 npm start   # API en :3000
npm run dev          # front en :5173
npm run build:demo   # un solo HTML de prueba, sin base de datos
```
