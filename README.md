# Virtual Queue App

Aplicación sencilla para gestionar colas virtuales en tiendas físicas durante eventos.

## Qué incluye

- QR por tienda usando URL única: `/q/[storeSlug]`
- Entrada en cola desde móvil sin registro
- Identificación por dispositivo usando `localStorage`
- Posición real persistente aunque el usuario recargue
- Actualización automática cada 2,5 segundos
- Vista de staff: `/staff/[storeSlug]`
- Botón para llamar al siguiente turno
- Botón para vaciar la cola
- Backend seguro mediante Next.js API Routes + Supabase Service Role en servidor

## Stack

- Next.js App Router
- Supabase Postgres
- Vercel
- TypeScript

## 1. Crear proyecto Supabase

1. Crea un proyecto en Supabase.
2. Ve a SQL Editor.
3. Ejecuta el archivo `supabase/schema.sql`.
4. Crea o edita tiendas en la tabla `stores`.

Ejemplo:

```sql
insert into public.stores (slug, name)
values ('mango', 'Mango')
on conflict (slug) do update set name = excluded.name, is_active = true;
```

## 2. Variables de entorno

Copia `.env.example` como `.env.local`:

```bash
cp .env.example .env.local
```

Configura:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STAFF_PIN=1234
ADMIN_PIN=9999
NEXT_PUBLIC_APP_NAME=Virtual Queue
```

Importante: `SUPABASE_SERVICE_ROLE_KEY` nunca debe usarse en componentes cliente ni exponerse como `NEXT_PUBLIC_`.

## 3. Ejecutar en local

```bash
npm install
npm run dev
```

Abre:

```text
http://localhost:3000/q/nike
http://localhost:3000/staff/nike
```

## 4. Desplegar en Vercel

1. Sube este proyecto a GitHub.
2. Importa el repositorio desde Vercel.
3. Añade las variables de entorno en Vercel Project Settings > Environment Variables.
4. Deploy.

## Panel de administrador

La app incluye una pantalla para crear y gestionar tiendas sin usar SQL:

```text
/admin
```

Para acceder:

1. Abre `https://tu-dominio.vercel.app/admin`.
2. Introduce el `ADMIN_PIN`.
3. Pulsa `Ver tiendas`.
4. Crea una tienda indicando nombre y slug.

Ejemplo:

```text
Nombre: Mango
Slug: mango
```

La app generará estas rutas:

```text
/q/mango
/staff/mango
```

También puedes activar o desactivar tiendas desde el listado. Una tienda inactiva no permitirá entrar en la cola.

Recuerda añadir `ADMIN_PIN` en Vercel como variable de entorno y hacer redeploy.

## 5. Generar QR

Cada tienda necesita un QR que apunte a:

```text
https://tu-dominio.vercel.app/q/nike
https://tu-dominio.vercel.app/q/adidas
https://tu-dominio.vercel.app/q/puma
```

Puedes generar los QR con cualquier generador externo o desde Canva.

## 6. Operativa durante el evento

Usuario:

1. Escanea QR.
2. Pulsa “Entrar en la cola”.
3. Ve cuántas personas tiene delante.
4. La pantalla se actualiza automáticamente.

Staff:

1. Abre `/staff/[storeSlug]`.
2. Introduce el PIN.
3. Pulsa “Llamar siguiente”.
4. El usuario llamado verá “Es tu turno”.

## 7. Próximas mejoras recomendadas

- Notificación visual/sonora cuando falten 1–2 personas.
- Web Push para avisar aunque el navegador no esté abierto.
- PIN por tienda en vez de PIN global.
- Pantalla pública para mostrar el turno actual.
- Panel central de evento con todas las tiendas.
- Exportación CSV de tiempos de espera.
- Modo “pausar cola” cuando la tienda esté saturada.
