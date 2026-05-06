"use client";

import { useCallback, useEffect, useState } from "react";

type StaffStatus = {
  storeName: string;
  waitingCount: number;
  nextQueueNumber: number | null;
};

export default function StaffPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const [storeSlug, setStoreSlug] = useState("");
  const [pin, setPin] = useState("");
  const [data, setData] = useState<StaffStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    params.then((p) => setStoreSlug(p.storeSlug));
    const savedPin = window.localStorage.getItem("vq_staff_pin") || "";
    setPin(savedPin);
  }, [params]);

  const loadStatus = useCallback(async () => {
    if (!storeSlug) return;

    const res = await fetch(`/api/queue/status?storeSlug=${encodeURIComponent(storeSlug)}`, {
      cache: "no-store",
    });

    const body = await res.json();

    if (!res.ok) {
      setError(body.error || "No se pudo cargar la cola.");
      return;
    }

    setData({
      storeName: body.storeName,
      waitingCount: body.waitingCount,
      nextQueueNumber: body.nextQueueNumber ?? null,
    });
    setError("");
  }, [storeSlug]);

  useEffect(() => {
    loadStatus();
    const interval = window.setInterval(loadStatus, 2500);
    return () => window.clearInterval(interval);
  }, [loadStatus]);

  const callNext = async () => {
    setBusy(true);
    setError("");
    window.localStorage.setItem("vq_staff_pin", pin);

    const res = await fetch("/api/staff/next", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ storeSlug, pin }),
    });

    const body = await res.json();

    if (!res.ok) {
      setError(body.error || "No se pudo avanzar la cola.");
    }

    setBusy(false);
    loadStatus();
  };

  const resetQueue = async () => {
    const confirmed = window.confirm("¿Seguro que quieres vaciar la cola de esta tienda?");
    if (!confirmed) return;

    setBusy(true);
    setError("");
    window.localStorage.setItem("vq_staff_pin", pin);

    const res = await fetch("/api/staff/reset", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ storeSlug, pin }),
    });

    const body = await res.json();

    if (!res.ok) {
      setError(body.error || "No se pudo reiniciar la cola.");
    }

    setBusy(false);
    loadStatus();
  };

  return (
    <main className="page">
      <section className="card">
        <div className="staffHeader">
          <div>
            <p className="kicker">Vista de tienda</p>
            <h1>{data?.storeName || "Cola"}</h1>
          </div>
          <span className="pill">{data?.waitingCount ?? 0} esperando</span>
        </div>

        <div className="metrics">
          <div className="metric">
            <p className="metricLabel">Siguiente turno</p>
            <div className="metricValue">{data?.nextQueueNumber ?? "-"}</div>
          </div>
        </div>

        <div className="stack">
          <input
            type="password"
            inputMode="numeric"
            placeholder="PIN de staff"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />

          {error && <div className="error">{error}</div>}

          <button className="button" disabled={busy || !pin} onClick={callNext}>
            {busy ? "Procesando..." : "Llamar siguiente"}
          </button>

          <button className="button danger" disabled={busy || !pin} onClick={resetQueue}>
            Vaciar cola
          </button>
        </div>

        <p className="small">
          Esta vista permite avanzar la cola durante el evento. El PIN se configura en Vercel como variable de entorno.
        </p>
      </section>
    </main>
  );
}
