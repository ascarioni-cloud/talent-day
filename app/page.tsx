export default function HomePage() {
  return (
    <main className="page">
      <section className="card">
        <p className="kicker">Virtual Queue</p>
        <h1>Colas virtuales para tiendas y eventos.</h1>
        <p className="copy">
          Crea un código QR por tienda y permite que candidatos o clientes se unan a la cola desde su móvil.
        </p>
        <p className="small">
          Ejemplo de URL para QR: <strong>/q/nike</strong><br />
          Vista de staff: <strong>/staff/nike</strong>
        </p>
      </section>
    </main>
  );
}
