import "./DemoLandingPage.css";

const FEATURES = [
  {
    icon: "🛒",
    titulo: "Punto de venta rápido",
    texto: "Catálogo por categorías, atajos de teclado y carrito pensado para no perder ritmo en la caja.",
  },
  {
    icon: "🍔",
    titulo: "Modificadores y personalización",
    texto: "Extras, ingredientes a sacar y cantidad por modificador, todo desde un modal pensado para el mostrador.",
  },
  {
    icon: "💰",
    titulo: "Turnos de caja",
    texto: "Apertura y cierre de caja con arqueo, medios de pago y control de diferencias.",
  },
  {
    icon: "🏪",
    titulo: "Multisucursal",
    texto: "Varias sucursales y cajas, cada una con su stock, sus usuarios y sus permisos.",
  },
  {
    icon: "📊",
    titulo: "Dashboard y reportes",
    texto: "Ventas por día, medios de pago, productos más vendidos e informes exportables.",
  },
  {
    icon: "🧾",
    titulo: "Facturación electrónica",
    texto: "Integración con boleta/factura electrónica (DTE) para operar en regla desde el día uno.",
  },
  {
    icon: "🖨️",
    titulo: "Impresión térmica",
    texto: "Tickets de venta y corte de caja listos para impresora térmica de 80mm.",
  },
  {
    icon: "🔐",
    titulo: "Roles y permisos",
    texto: "Admin, supervisor y solo-reportes: cada rol ve únicamente lo que le corresponde.",
  },
];

const STACK = [
  "React 19",
  "TypeScript",
  "Vite",
  "FastAPI",
  "PostgreSQL",
  "Docker",
  "Cloudflare",
  "Render",
];

const CAPTURAS = [
  { src: "/demo/login.jpg", alt: "Pantalla de inicio de sesión del POS" },
  { src: "/demo/catalogo.jpg", alt: "Catálogo de productos del punto de venta" },
  { src: "/demo/carrito.jpg", alt: "Carrito de pedido con productos agregados" },
  { src: "/demo/dashboard.jpg", alt: "Dashboard de ventas en el panel de administración" },
];

export function DemoLandingPage() {
  return (
    <div className="demo">
      <header className="demo-hero">
        <div className="demo-hero-txt">
          <span className="demo-kicker">Proyecto personal · POS / ERP gastronómico</span>
          <h1>Un punto de venta hecho para cocinas ocupadas</h1>
          <p>
            Sistema de punto de venta y administración para restaurantes: catálogo,
            caja, inventario, multisucursal y facturación electrónica, en una sola
            app pensada para cajeros que no tienen tiempo que perder.
          </p>
          <div className="demo-stack">
            {STACK.map((s) => (
              <span key={s} className="demo-stack-chip">
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="demo-hero-img">
          <img src="/demo/login.jpg" alt="Pantalla de inicio de sesión del POS" loading="eager" />
        </div>
      </header>

      <section className="demo-seccion">
        <h2>Qué resuelve</h2>
        <div className="demo-features">
          {FEATURES.map((f) => (
            <div key={f.titulo} className="demo-feature-card">
              <span className="demo-feature-icon" aria-hidden="true">
                {f.icon}
              </span>
              <h3>{f.titulo}</h3>
              <p>{f.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="demo-seccion">
        <h2>Capturas</h2>
        <div className="demo-galeria">
          {CAPTURAS.map((c) => (
            <figure key={c.src} className="demo-captura">
              <img src={c.src} alt={c.alt} loading="lazy" decoding="async" />
            </figure>
          ))}
        </div>
      </section>

      <footer className="demo-footer">
        <p>Diseñado y construido por Richard.</p>
      </footer>
    </div>
  );
}
