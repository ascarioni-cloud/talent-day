"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Store = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [stores, setStores] = useState<Store[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const savedPin = window.localStorage.getItem("vq_admin_pin") || "";
    setPin(savedPin);
  }, []);

  useEffect(() => {
    if (!name) return;
    setSlug((currentSlug) => currentSlug ? currentSlug : slugify(name));
  }, [name]);

  const loadStores = useCallback(async () => {
    if (!pin) return;

    setLoading(true);
    setError("");
    window.localStorage.setItem("vq_admin_pin", pin);

    const res = await fetch(`/api/admin/stores?pin=${encodeURIComponent(pin)}`, {
      cache: "no-store",
    });

    const body = await res.json();

    if (!res.ok) {
      setError(body.error || "No se pudieron cargar las tiendas.");
      setLoading(false);
      return;
    }

    setStores(body.stores || []);
    setLoading(false);
  }, [pin]);

  const createStore = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    window.localStorage.setItem("vq_admin_pin", pin);

    const cleanSlug = slugify(slug || name);

    const res = await fetch("/api/admin/stores", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pin,
        name: name.trim(),
        slug: cleanSlug,
      }),
    });

    const body = await res.json();

    if (!res.ok) {
      setError(body.error || "No se pudo crear la tienda.");
      setBusy(false);
      return;
    }

    setMessage(`Tienda creada: ${body.store.name}`);
    setName("");
    setSlug("");
    setBusy(false);
    await loadStores();
  };

  const toggleStore = async (store: Store) => {
    setBusy(true);
    setError("");
    setMessage("");

    const res = await fetch(`/api/admin/stores/${store.id}/toggle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pin,
        is_active: !store.is_active,
      }),
    });

    const body = await res.json();

    if (!res.ok) {
      setError(body.error || "No se pudo actualizar la tienda.");
      setBusy(false);
      return;
    }

    setMessage(body.store.is_active ? "Tienda activada." : "Tienda desactivada.");
    setBusy(false);
    await loadStores();
  };

  const canCreate = useMemo(() => {
    return Boolean(pin && name.trim() && slugify(slug || name));
  }, [pin, name, slug]);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://tu-dominio.vercel.app";

  return (
    <main className="page">
      <section className="card">
        <p className="kicker">Administrador</p>
        <h1>Gestionar tiendas</h1>
        <p className="copy">
          Crea tiendas para generar automáticamente sus URLs de cola y de staff.
        </p>

        <div className="stack">
          <input
            type="password"
            inputMode="numeric"
            placeholder="PIN de administrador"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
          />

          <button className="button secondary" disabled={!pin || loading} onClick={loadStores}>
            {loading ? "Cargando..." : "Ver tiendas"}
          </button>
        </div>

        {error && <div className="error">{error}</div>}
        {message && <div className="status">{message}</div>}

        <div style={{ height: 28 }} />

        <h2>Nueva tienda</h2>

        <div className="stack">
          <input
            placeholder="Nombre de tienda. Ej: Mango"
            value={name}
            onChange={(event) => {
              const nextName = event.target.value;
              setName(nextName);
              setSlug(slugify(nextName));
            }}
          />

          <input
            placeholder="Slug URL. Ej: mango"
            value={slug}
            onChange={(event) => setSlug(slugify(event.target.value))}
          />

          <button className="button" disabled={!canCreate || busy} onClick={createStore}>
            {busy ? "Creando..." : "Crear tienda"}
          </button>
        </div>

        <p className="small">
          El slug define la URL. Ejemplo: si el slug es <strong>mango</strong>, la cola será{" "}
          <strong>/q/mango</strong>.
        </p>

        <div style={{ height: 28 }} />

        <h2>Tiendas existentes</h2>

        {stores.length === 0 && (
          <p className="copy">
            Introduce el PIN y pulsa “Ver tiendas” para cargar el listado.
          </p>
        )}

        <div className="storeList">
          {stores.map((store) => (
            <div className="storeRow" key={store.id}>
              <div>
                <strong>{store.name}</strong>
                <p>
                  {store.is_active ? "Activa" : "Inactiva"} · /q/{store.slug}
                </p>
                <p className="urlLine">{origin}/q/{store.slug}</p>
                <p className="urlLine">{origin}/staff/{store.slug}</p>
              </div>

              <button
                className="miniButton"
                disabled={busy}
                onClick={() => toggleStore(store)}
              >
                {store.is_active ? "Desactivar" : "Activar"}
              </button>
            </div>
          ))}
        </div>

        <p className="small">
          Para los QR usa la URL pública de cola: <strong>/q/slug-de-la-tienda</strong>.
        </p>
      </section>
    </main>
  );
}
