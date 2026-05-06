"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { QueueStatusPayload } from "@/lib/types";

function getVisitorToken() {
  const key = "vq_visitor_token";
  let token = window.localStorage.getItem(key);

  if (!token) {
    token = crypto.randomUUID();
    window.localStorage.setItem(key, token);
  }

  return token;
}

export default function QueuePage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const [storeSlug, setStoreSlug] = useState<string>("");
  const [visitorToken, setVisitorToken] = useState<string>("");
  const [data, setData] = useState<QueueStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then((p) => setStoreSlug(p.storeSlug));
    setVisitorToken(getVisitorToken());
  }, [params]);

  const loadStatus = useCallback(async () => {
    if (!storeSlug || !visitorToken) return;

    const res = await fetch(
      `/api/queue/status?storeSlug=${encodeURIComponent(storeSlug)}&visitorToken=${encodeURIComponent(visitorToken)}`,
      { cache: "no-store" }
    );

    const body = await res.json();

    if (!res.ok) {
      setError(body.error || "No se pudo cargar la cola.");
      setLoading(false);
      return;
    }

    setData(body);
    setError("");
    setLoading(false);
  }, [storeSlug, visitorToken]);

  useEffect(() => {
    loadStatus();
    const interval = window.setInterval(loadStatus, 2500);
    return () => window.clearInterval(interval);
  }, [loadStatus]);

  const joinQueue = async () => {
    setJoining(true);
    setError("");

    const res = await fetch("/api/queue/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ storeSlug, visitorToken }),
    });

    const body = await res.json();

    if (!res.ok) {
      setError(body.error || "No se pudo entrar en la cola.");
      setJoining(false);
      return;
    }

    setData(body);
    setJoining(false);
  };

  const headline = useMemo(() => {
    if (!data) return "Cargando cola...";
    if (data.status === "not_joined") return "Únete a la cola virtual";
    if (data.status === "called") return "Es tu turno";
    if (data.status === "served") return "Ya has sido atendido";
    if (data.status === "cancelled") return "Tu turno ya no está activo";
    return "Estás en la cola";
  }, [data]);

  return (
    <main className="page">
      <section className="card">
        <p className="kicker">{data?.storeName || "Cola virtual"}</p>
        <h1>{headline}</h1>

        {loading && <p className="copy">Preparando tu turno...</p>}

        {error && <div className="error">{error}</div>}

        {!loading && data?.status === "not_joined" && (
          <>
            <p className="copy">
              No necesitas esperar físicamente en fila. Entra en la cola y vuelve cuando tu turno esté cerca.
            </p>
            <button className="button" onClick={joinQueue} disabled={joining}>
              {joining ? "Entrando..." : "Entrar en la cola"}
            </button>
          </>
        )}

        {!loading && data && data.status !== "not_joined" && (
          <>
            {data.status === "called" && (
              <div className="status">Acércate al punto de atención.</div>
            )}

            <div className="metrics">
              <div className="metric">
                <p className="metricLabel">Personas delante de ti</p>
                <div className="metricValue">{data.peopleAhead ?? "-"}</div>
              </div>

              <div className="metric">
                <p className="metricLabel">Tu turno</p>
                <div className="metricValue">{data.queueNumber ?? "-"}</div>
              </div>

              <div className="metric">
                <p className="metricLabel">Posición actual</p>
                <div className="metricValue">{data.position ?? "-"}</div>
              </div>
            </div>

            <p className="small">
              Esta pantalla se actualiza automáticamente. No necesitas refrescar la página.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
