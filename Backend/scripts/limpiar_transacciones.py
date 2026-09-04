"""Borra el movimiento de la operación y deja el catálogo intacto.

Se lleva pedidos, pagos, turnos de caja, compras, movimientos de inventario
y la auditoría (que de todos modos queda apuntando a pedidos borrados), y
deja como estaban productos, insumos, recetas, categorías, modificadores,
usuarios, cajas y sucursales. El stock y el costo promedio de los insumos
vuelven a cero, porque los sostenían las compras que se borran.

Pide confirmación escribiendo el nombre de la base. Con --si no pregunta.

    python Backend/scripts/limpiar_transacciones.py
    python Backend/scripts/limpiar_transacciones.py --si
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text  # noqa: E402

from app.database import engine  # noqa: E402

# En orden: primero lo que referencia, después lo referenciado.
TABLAS = (
    "auditoria",
    "pedido_item_modificadores",
    "pagos",
    "pedido_items",
    "pedidos",
    "movimientos_caja",
    "turnos_caja",
    "compra_detalles",
    "compras",
    "movimientos_inventario",
)


def contar(conn):
    conteos = {}
    for tabla in TABLAS:
        existe = conn.execute(
            text("SELECT to_regclass(:t)"), {"t": f"public.{tabla}"}
        ).scalar()
        if existe:
            conteos[tabla] = conn.execute(
                text(f"SELECT count(*) FROM {tabla}")
            ).scalar()
    return conteos


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--si", action="store_true", help="no preguntar")
    args = parser.parse_args()

    host = engine.url.host or "local"
    base = engine.url.database

    with engine.connect() as conn:
        conteos = contar(conn)

    total = sum(conteos.values())
    print(f"Base: {base} en {host}")
    for tabla, n in conteos.items():
        if n:
            print(f"  {tabla}: {n}")
    if total == 0:
        print("No hay nada que borrar.")
        return

    if not args.si:
        print(f"\nSe van a borrar {total} filas. El catálogo NO se toca.")
        if input(f'Escribí "{base}" para confirmar: ').strip() != base:
            print("Cancelado.")
            return

    with engine.begin() as conn:
        for tabla in TABLAS:
            if tabla in conteos:
                conn.execute(text(f"TRUNCATE {tabla} RESTART IDENTITY CASCADE"))
        if conn.execute(text("SELECT to_regclass('public.insumos')")).scalar():
            conn.execute(
                text("UPDATE insumos SET stock_actual = 0, costo_promedio = 0")
            )

    print(f"\nListo: {total} filas borradas. Stock y costo de insumos en cero.")


if __name__ == "__main__":
    main()
