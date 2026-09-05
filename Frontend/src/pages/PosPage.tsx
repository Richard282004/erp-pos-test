import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { puedeGestionarProductos, nombreRol, ROL_CAJERO } from "../api/auth";
import {
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  obtenerReceta,
  type Producto,
} from "../api/productos";
import { crearPedido } from "../api/pedidos";
import { type Modificador } from "../api/modificadores";
import { ModificadorSelector } from "../components/catalogo/ModificadorSelector";
import { ConfirmarProducto } from "../components/catalogo/ConfirmarProducto";
import { Avisos } from "../components/common/Avisos";
import { useAvisos } from "../hooks/useAvisos";
import { useCatalogoPos } from "../hooks/useCatalogoPos";
import { precioUnitario, type ItemCarrito } from "../lib/carrito";
import { mensajeError } from "../lib/errores";
import { ImpresionPedido, type PedidoImpr } from "../components/print/ImpresionPedido";
import { TipoPedidoSelector } from "../components/catalogo/TipoPedidoSelector";
import { CategoriaTabs } from "../components/catalogo/CategoriaTabs";
import { CatalogoGrid } from "../components/catalogo/CatalogoGrid";
import { Carrito } from "../components/carrito/Carrito";
import { AutorizarDescuento } from "../components/carrito/AutorizarDescuento";
import type { MedioPago } from "../components/carrito/MedioPagoSection";
import { AddProductModal } from "../components/catalogo/AddProductModal";
import { GestionProductos } from "../components/catalogo/GestionProductos";
import { SideDrawer } from "../components/common/SideDrawer";
import { ThemeToggle } from "../components/common/ThemeToggle";
import { AbrirCajaGate } from "../components/caja/AbrirCajaGate";
import { CajaDrawerSection } from "../components/caja/CajaDrawerSection";
import { useCajaTurno } from "../hooks/useCajaTurno";
import { useConexion } from "../hooks/useConexion";
import { useAuth } from "../context/useAuth";

type TipoPedido = "LOCAL" | "RETIRO" | "DELIVERY";

export function PosPage() {
  const { accessToken, currentUser, logout } = useAuth();

  const [categoria, setCategoria] = useState("Todos");

  const {
    productos,
    loadingProductos,
    errorProductos,
    recargarProductos: cargarProductos,
    categoriasBackend,
    emisor,
    modsMap,
    modsPorProducto,
  } = useCatalogoPos(accessToken);

  const [selectorProducto, setSelectorProducto] = useState<Producto | null>(null);
  const [ultimoImpr, setUltimoImpr] = useState<PedidoImpr | null>(null);
  const [modoImpr, setModoImpr] = useState<"ticket" | "comanda" | null>(null);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [porConfirmar, setPorConfirmar] = useState<Producto | null>(null);
  const { avisos, avisar, cerrar: cerrarAviso } = useAvisos();
  const sinConexion = !useConexion();

  const categoriasParaFiltro = useMemo(
    () => ["Todos", ...categoriasBackend.map((c) => c.nombre)],
    [categoriasBackend]
  );

  const [tipoPedido, setTipoPedido] =
    useState<TipoPedido>("RETIRO");

  const [carrito, setCarrito] =
    useState<ItemCarrito[]>([]);

  const [descuento, setDescuento] = useState(0);

  const [observacion, setObservacion] =
    useState("");

  const [sendingPedido, setSendingPedido] = useState(false);
  const [mensajePedido, setMensajePedido] = useState<string | null>(null);
  const [errorPedido, setErrorPedido] = useState<string | null>(null);
  const [medioPago, setMedioPago] = useState<MedioPago>('EFECTIVO');
  const [montoRecibido, setMontoRecibido] = useState<number | null>(null);

  // Cambiar de medio de pago: si deja de ser efectivo, el monto recibido no
  // aplica. Se limpia acá y no en un efecto para no encadenar renders.
  const cambiarMedioPago = (m: MedioPago) => {
    setMedioPago(m);
    if (m !== "EFECTIVO") setMontoRecibido(null);
  };

  const { resumen: cajaResumen, turno: cajaTurno, loading: cajaLoading, refetch: refetchCaja } = useCajaTurno();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<{ nombre: string; descripcion: string; precio: number; imagen_url: string | null; id_categoria: number | null; activo: boolean }>({ nombre: '', descripcion: '', precio: 0, imagen_url: '', id_categoria: null, activo: true });
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [costoEditando, setCostoEditando] = useState<number | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [createProductError, setCreateProductError] = useState<string | null>(null);

  // FILTRAR PRODUCTOS POR CATEGORÍA
  const productosFiltrados = useMemo(() => {
    if (categoria === "Todos") {
      return productos;
    }

    return productos.filter(
      (producto) =>
        producto.categoria === categoria
    );
  }, [categoria, productos]);

  // AGREGAR PRODUCTO AL CARRITO
  const agregarAlCarrito = (producto: Producto, mods: Modificador[]) => {
    const modsCarrito = mods.map((m) => ({
      id_modificador: m.id_modificador,
      nombre: m.nombre,
      precio_adicional: m.precio_adicional,
    }));
    const clave = (ids: number[]) => [...ids].sort((a, b) => a - b).join(",");
    const claveNueva = clave(modsCarrito.map((m) => m.id_modificador));

    setCarrito((carritoActual) => {
      const existente = carritoActual.find(
        (item) =>
          item.id_producto === producto.id_producto &&
          clave(item.modificadores.map((m) => m.id_modificador)) === claveNueva
      );
      if (existente) {
        return carritoActual.map((item) =>
          item.lineId === existente.lineId
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [
        ...carritoActual,
        {
          ...producto,
          lineId:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `${producto.id_producto}-${Date.now()}-${Math.random()}`,
          cantidad: 1,
          descuento: 0,
          modificadores: modsCarrito,
        },
      ];
    });
  };

  // Sigue al carrito, o al selector si el producto tiene modificadores.
  const continuarAgregado = (producto: Producto) => {
    const ids = modsPorProducto[producto.id_producto] ?? [];
    const disponibles = ids
      .map((id) => modsMap[id])
      .filter((m): m is Modificador => !!m && m.activo);
    if (disponibles.length > 0) {
      setSelectorProducto(producto);
    } else {
      agregarAlCarrito(producto, []);
      avisar("ok", `${producto.nombre} agregado`);
    }
  };

  // Confirmar antes de sumar, en celular y en escritorio: evita el producto
  // equivocado por un toque o clic de más. Enter agrega, Escape cancela.
  const agregarProducto = (producto: Producto) => setPorConfirmar(producto);

  // CAMBIAR CANTIDAD
  const cambiarCantidad = (lineId: string, cambio: number) => {
    setCarrito((carritoActual) =>
      carritoActual
        .map((item) =>
          item.lineId === lineId ? { ...item, cantidad: item.cantidad + cambio } : item
        )
        .filter((item) => item.cantidad > 0)
    );
  };

  // DESCUENTO POR PRODUCTO
  const cambiarDescuentoProducto = (lineId: string, descuentoProducto: number) => {
    const descuentoSeguro = Math.min(100, Math.max(0, descuentoProducto));
    setCarrito((carritoActual) =>
      carritoActual.map((item) =>
        item.lineId === lineId ? { ...item, descuento: descuentoSeguro } : item
      )
    );
  };

  // VACIAR CARRITO
  // Identificador del intento de cobro en curso. Se mantiene entre reintentos
  // (corte de red) para que el servidor no cree dos pedidos, y se descarta
  // cuando el carrito se vacía tras cobrar.
  const claveCobro = useRef<string | null>(null);

  const vaciarCarrito = () => {
    setCarrito([]);
    setDescuento(0);
    setObservacion("");
    setAutorizacion(null);
    claveCobro.current = null;
  };

  // SUBTOTAL SIN DESCUENTOS (incluye modificadores)
  const subtotalSinDescuentos = carrito.reduce(
    (totalActual, item) => totalActual + precioUnitario(item) * item.cantidad,
    0
  );

  // TOTAL DE DESCUENTOS POR PRODUCTO
  const descuentoProductos = carrito.reduce((totalActual, item) => {
    const precioLinea = precioUnitario(item) * item.cantidad;
    return totalActual + precioLinea * (item.descuento / 100);
  }, 0);

  // SUBTOTAL DESPUÉS DE DESCUENTOS INDIVIDUALES
  const subtotal =
    subtotalSinDescuentos -
    descuentoProductos;

  // DESCUENTO GENERAL DEL PEDIDO
  const montoDescuento =
    subtotal *
    (descuento / 100);

  // TOTAL FINAL
  const total =
    subtotal -
    montoDescuento;

  // Unidades en el carrito — lo muestra la barra flotante del móvil.
  const cantidadTotalItems = carrito.reduce((n, item) => n + item.cantidad, 0);

  // Tope de descuento del cajero: mismo cálculo y mismo número que el
  // servidor, así el aviso aparece ANTES de cobrar y no como una sorpresa.
  const LIMITE_DESCUENTO_CAJERO = 20;
  const descuentoEfectivoPct =
    subtotalSinDescuentos > 0 ? ((subtotalSinDescuentos - total) / subtotalSinDescuentos) * 100 : 0;
  const excedeTopeDescuento =
    currentUser?.id_rol === ROL_CAJERO && descuentoEfectivoPct > LIMITE_DESCUENTO_CAJERO + 0.01;

  const [pidiendoAutorizacion, setPidiendoAutorizacion] = useState(false);

  // La autorización del supervisor vale para ESTE pedido y este monto. La
  // firma (descuento + total) cambia si el cajero toca el carrito o el
  // descuento después, y ahí la autorización deja de estar vigente sin
  // necesidad de un efecto que la borre.
  const firmaPedido = `${descuento}|${total.toFixed(2)}`;
  const [autorizacion, setAutorizacion] =
    useState<{ token: string; por: string; firma: string } | null>(null);
  const autorizacionVigente =
    autorizacion && autorizacion.firma === firmaPedido ? autorizacion : null;
  const tokenAutorizacion = autorizacionVigente?.token ?? null;
  const autorizadoPor = autorizacionVigente?.por ?? null;

  // Enviar pedido al backend. tokenOverride se usa justo después de que un
  // supervisor autoriza, para no esperar a que el estado se actualice.
  const cobrarPedido = async (tokenOverride?: string, porOverride?: string) => {
    if (carrito.length === 0) return;
    // Efectivo: el monto recibido es obligatorio y no puede ser menor al
    // total. Sin esto, el vuelto y el arqueo de caja quedan sin base real.
    if (medioPago === 'EFECTIVO' && (montoRecibido === null || montoRecibido < total)) {
      setErrorPedido(
        montoRecibido === null
          ? 'Para cobrar en efectivo, ingresá el monto que recibiste.'
          : 'El monto recibido es menor que el total.'
      );
      return;
    }
    const token = tokenOverride ?? tokenAutorizacion;
    // El descuento supera el tope y todavía no hay autorización: se pide
    // acá, sin mandar nada al servidor todavía.
    if (excedeTopeDescuento && !token) {
      setPidiendoAutorizacion(true);
      return;
    }

    setSendingPedido(true);
    setErrorPedido(null);
    setMensajePedido(null);

    if (!claveCobro.current) {
      claveCobro.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
    }

    const payload = {
      tipo_pedido: tipoPedido,
      nombre_cliente: null,
      telefono_cliente: null,
      descuento,
      observacion,
      items: carrito.map((it) => ({
        id_producto: it.id_producto,
        cantidad: it.cantidad,
        descuento: it.descuento,
        modificadores: it.modificadores.map((m) => m.id_modificador),
      })),
      pago: {
        metodo_pago: medioPago,
        monto_recibido:
          medioPago === "EFECTIVO" && montoRecibido !== null ? montoRecibido : null,
      },
      token_autorizacion: token,
      idempotency_key: claveCobro.current,
    };

    try {
      const data = await crearPedido(payload, accessToken);
      // Los montos del ticket salen de lo que confirmó el servidor, no del
      // estado de la pantalla (que pudo cambiar o redondear distinto).
      setUltimoImpr({
        id_pedido: data.id_pedido,
        fecha: data.fecha,
        tipo_pedido: tipoPedido,
        cajero: currentUser?.username ?? null,
        items: carrito.map((it) => ({
          nombre: it.nombre,
          cantidad: it.cantidad,
          precio_unitario: precioUnitario(it),
          descuento_pct: it.descuento,
          modificadores: it.modificadores.map((md) => ({
            nombre: md.nombre,
            precio_adicional: md.precio_adicional,
          })),
        })),
        subtotal: data.subtotal,
        descuento_monto: data.descuento,
        total: data.total,
        pago: data.pago
          ? {
              metodo: data.pago.metodo_pago,
              monto: data.pago.monto,
              recibido: data.pago.monto_recibido,
              vuelto: data.pago.vuelto,
            }
          : {
              metodo: medioPago,
              monto: data.total,
              recibido: montoRecibido,
              vuelto: montoRecibido != null ? montoRecibido - data.total : null,
            },
        observacion: observacion || null,
      });
      setMensajePedido(`Pedido #${data.id_pedido} creado`);
      const porNombre = porOverride ?? autorizadoPor;
      if (porNombre) avisar("ok", `Descuento autorizado por ${porNombre}`);
      vaciarCarrito();
      refetchCaja();
    } catch (err) {
      console.error(err);
      refetchCaja();
      setErrorPedido(mensajeError(err, "Error al crear pedido"));
    } finally {
      setSendingPedido(false);
    }
  };

  // FORMATO PESOS CHILENOS
  const formatoPrecio = (
    valor: number
  ) =>
    new Intl.NumberFormat(
      "es-CL",
      {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      }
    ).format(valor);

  const abrirNuevoProducto = () => {
    setEditingProductId(null);
    setCostoEditando(null);
    setNewProduct({ nombre: '', descripcion: '', precio: 0, imagen_url: '', id_categoria: null, activo: true });
    setShowAddProduct(true);
  };

  const abrirEditarProducto = (producto: Producto) => {
    setEditingProductId(producto.id_producto);
    setNewProduct({
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precio: producto.precio,
      imagen_url: producto.imagen_url,
      id_categoria: null,
      activo: producto.activo,
    });
    setShowAddProduct(true);

    setCostoEditando(null);
    obtenerReceta(producto.id_producto, accessToken)
      .then((lineas) =>
        setCostoEditando(
          lineas.reduce((s, l) => s + l.cantidad * l.costo_promedio, 0)
        )
      )
      .catch(() => setCostoEditando(null));
  };

  return (
    <div className="pos">

      {/* BARRA SUPERIOR */}
      <header className="topbar">

        <button
          className="hamburger-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menú"
        >
          <span />
          <span />
          <span />
        </button>

        <div className="brand">
          <h1>🍔 Byeburger POS</h1>
        </div>

      </header>

      {sinConexion && (
        <div className="offline-banner" role="status">
          📡 Sin conexión a internet — no se puede cobrar hasta que vuelva el WiFi.
        </div>
      )}

      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Byeburger POS"
      >
        <div className="drawer-section drawer-sesion">
          <strong>{currentUser?.username ?? 'Usuario'}</strong>
          <small>{nombreRol(currentUser)}</small>
          <button onClick={logout}>Cerrar sesión</button>
        </div>

        {puedeGestionarProductos(currentUser) && (
          <div className="drawer-section">
            <GestionProductos
              productos={productos}
              formatoPrecio={formatoPrecio}
              onAgregar={abrirNuevoProducto}
              onEditar={abrirEditarProducto}
              onEliminar={async (producto) => {
                await eliminarProducto(producto.id_producto, accessToken);
                await cargarProductos();
              }}
            />
          </div>
        )}

        {puedeGestionarProductos(currentUser) && (
          <div className="drawer-section">
            <Link
              className="drawer-admin-link"
              to="/admin"
              onClick={() => setDrawerOpen(false)}
            >
              ⚙️ Administración
            </Link>
          </div>
        )}

        {cajaResumen && (
          <div className="drawer-section">
            <CajaDrawerSection resumen={cajaResumen} onCambio={refetchCaja} />
          </div>
        )}

        <div className="drawer-section">
          <ThemeToggle />
        </div>
      </SideDrawer>

      {porConfirmar && (
        <ConfirmarProducto
          producto={porConfirmar}
          formatoPrecio={formatoPrecio}
          onCancelar={() => {
            avisar("error", `${porConfirmar.nombre} cancelado`);
            setPorConfirmar(null);
          }}
          onAgregar={() => {
            const p = porConfirmar;
            setPorConfirmar(null);
            continuarAgregado(p);
          }}
        />
      )}

      {selectorProducto && (
        <ModificadorSelector
          producto={selectorProducto}
          modificadores={(modsPorProducto[selectorProducto.id_producto] ?? [])
            .map((id) => modsMap[id])
            .filter((m): m is Modificador => !!m && m.activo)}
          formatoPrecio={formatoPrecio}
          onCancel={() => {
            const nombre = selectorProducto.nombre;
            setSelectorProducto(null);
            avisar("error", `${nombre} cancelado`);
          }}
          onConfirm={(elegidos) => {
            agregarAlCarrito(selectorProducto, elegidos);
            avisar("ok", `${selectorProducto.nombre} agregado`);
            setSelectorProducto(null);
          }}
        />
      )}

      <AddProductModal
        open={showAddProduct}
        newProduct={newProduct}
        onChangeNewProduct={setNewProduct}
        categoriasBackend={categoriasBackend}
        editingProductId={editingProductId}
        creatingProduct={creatingProduct}
        createProductError={createProductError}
        costoReceta={costoEditando}
        onCancel={() => setShowAddProduct(false)}
        onSubmit={async () => {
          setCreateProductError(null);
          setCreatingProduct(true);
          try {
            const input = {
              nombre: newProduct.nombre,
              descripcion: newProduct.descripcion || null,
              precio: newProduct.precio,
              imagen_url: newProduct.imagen_url || null,
              id_categoria: newProduct.id_categoria,
              activo: newProduct.activo,
            };

            if (editingProductId) {
              await actualizarProducto(editingProductId, input, accessToken);
            } else {
              await crearProducto(input, accessToken);
            }

            // success -> refresh products
            await cargarProductos();
            setShowAddProduct(false);
            setNewProduct({ nombre: '', descripcion: '', precio: 0, imagen_url: '', id_categoria: null, activo: true });
            setEditingProductId(null);
          } catch (err) {
            console.error('Error creando producto', err);
            setCreateProductError(mensajeError(err, 'Error creando producto'));
          } finally {
            setCreatingProduct(false);
          }
        }}
      />

      {cajaLoading ? (
        <div className="pos-cargando">Cargando caja…</div>
      ) : !cajaTurno ? (
        <AbrirCajaGate onAbierta={refetchCaja} />
      ) : (
      <main className="main-layout">

        {/* CATÁLOGO */}
        <section className="catalogo">

          {/* TIPO DE PEDIDO */}
          <TipoPedidoSelector tipoPedido={tipoPedido} onChange={setTipoPedido} />

          {/* CATEGORÍAS */}
          <CategoriaTabs
            categorias={categoriasParaFiltro}
            categoriaActiva={categoria}
            onSelect={setCategoria}
          />

          <div className="titulo-seccion">

            <h2>
              {categoria === "Todos"
                ? "Todos los productos"
                : categoria}
            </h2>

            <span>
              {
                productosFiltrados.length
              }{" "}
              productos
            </span>

          </div>

          {/* PRODUCTOS */}
          <CatalogoGrid
            productos={productosFiltrados}
            loading={loadingProductos}
            error={errorProductos}
            onReintentar={cargarProductos}
            formatoPrecio={formatoPrecio}
            onAgregar={agregarProducto}
          />

        </section>

        {/* CARRITO — en móvil es una hoja que sube desde abajo */}
        {carritoAbierto && (
          <div className="carrito-backdrop" onClick={() => setCarritoAbierto(false)} />
        )}
        <div className={"carrito-wrap" + (carritoAbierto ? " abierto" : "")}>
        <Carrito
          onCerrar={() => setCarritoAbierto(false)}
          tipoPedido={tipoPedido}
          carrito={carrito}
          onVaciar={vaciarCarrito}
          onCambiarCantidad={cambiarCantidad}
          onCambiarDescuentoProducto={cambiarDescuentoProducto}
          observacion={observacion}
          onChangeObservacion={setObservacion}
          descuento={descuento}
          onChangeDescuento={setDescuento}
          medioPago={medioPago}
          onChangeMedioPago={cambiarMedioPago}
          montoRecibido={montoRecibido}
          onChangeMontoRecibido={setMontoRecibido}
          subtotalSinDescuentos={subtotalSinDescuentos}
          descuentoProductos={descuentoProductos}
          subtotal={subtotal}
          montoDescuento={montoDescuento}
          total={total}
          formatoPrecio={formatoPrecio}
          sendingPedido={sendingPedido}
          mensajePedido={mensajePedido}
          errorPedido={errorPedido}
          sinConexion={sinConexion}
          onCobrar={() => cobrarPedido()}
          avisoDescuento={
            excedeTopeDescuento && !tokenAutorizacion
              ? `Este descuento (${descuentoEfectivoPct.toFixed(1)}%) supera el ${LIMITE_DESCUENTO_CAJERO}% permitido para cajero. Al cobrar se va a pedir autorización.`
              : excedeTopeDescuento && tokenAutorizacion
                ? `Descuento autorizado por ${autorizadoPor}.`
                : null
          }
        />
        </div>

        {/* Barra flotante: en móvil es el acceso al pedido */}
        {carrito.length > 0 && !carritoAbierto && (
          <button className="carrito-fab" onClick={() => setCarritoAbierto(true)}>
            <span className="carrito-fab-n">{cantidadTotalItems}</span>
            <span className="carrito-fab-txt">Ver pedido</span>
            <span className="carrito-fab-total">{formatoPrecio(total)}</span>
          </button>
        )}

      </main>
      )}

      {ultimoImpr && (
        <div className="pedido-ok" role="status">
          <strong>Pedido #{ultimoImpr.id_pedido} cobrado</strong>
          <div className="pedido-ok-btns">
            <button onClick={() => setModoImpr("comanda")}>🧑‍🍳 Comanda</button>
            <button onClick={() => setModoImpr("ticket")}>🧾 Ticket</button>
            <button className="pedido-ok-cerrar" onClick={() => setUltimoImpr(null)}>Cerrar</button>
          </div>
        </div>
      )}

      {pidiendoAutorizacion && (
        <AutorizarDescuento
          porcentaje={descuentoEfectivoPct}
          accessToken={accessToken}
          onCancelar={() => setPidiendoAutorizacion(false)}
          onAutorizado={(token, autorizadoPorNombre) => {
            setAutorizacion({ token, por: autorizadoPorNombre, firma: firmaPedido });
            setPidiendoAutorizacion(false);
            cobrarPedido(token, autorizadoPorNombre);
          }}
        />
      )}

      <Avisos avisos={avisos} onCerrar={cerrarAviso} />

      <ImpresionPedido pedido={ultimoImpr} modo={modoImpr} emisor={emisor} onDone={() => setModoImpr(null)} />

    </div>
  );
}
