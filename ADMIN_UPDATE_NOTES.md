# Actualización: panel de administrador

Esta versión añade:

- `/admin`: pantalla para crear tiendas desde la app.
- `GET /api/admin/stores`: lista tiendas existentes.
- `POST /api/admin/stores`: crea tiendas nuevas.
- `POST /api/admin/stores/[storeId]/toggle`: activa/desactiva tiendas.
- Nueva variable de entorno: `ADMIN_PIN`.

## Qué debes hacer en Vercel

Añade esta variable:

```env
ADMIN_PIN=9999
```

Puedes usar otro PIN.

Después haz redeploy.

## Cómo usarlo

Abre:

```text
https://tu-dominio.vercel.app/admin
```

Introduce el PIN de administrador y crea tiendas.
