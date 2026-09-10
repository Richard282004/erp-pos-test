"""Carga ventas de demostración en la base LOCAL para ver el dashboard con datos.

Uso (dentro del contenedor o con el venv):
    python Backend/scripts/seed_demo.py [--dias 12] [--borrar]

--borrar: primero elimina las ventas demo anteriores (las que tengan
observacion = 'demo').
"""
import argparse
import os
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine, text

TZ_OFFSET = timedelta(hours=-3)  # America/Santiago aprox., solo para repartir horas


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dias", type=int, default=12)
    ap.add_argument("--borrar", action="store_true")
    args = ap.parse_args()

    url = os.environ.get("DATABASE_URL", "postgresql://burger_user:123456@localhost:5434/burger_pos")
    engine = create_engine(url)

    with engine.begin() as c:
        suc = c.execute(text("SELECT id_sucursal FROM sucursales ORDER BY id_sucursal LIMIT 1")).scalar()
        caja = c.execute(text("SELECT id_caja FROM cajas WHERE id_sucursal=:s ORDER BY id_caja LIMIT 1"), {"s": suc}).scalar()
        user = c.execute(text("SELECT id_usuario FROM usuarios WHERE id_sucursal=:s ORDER BY id_usuario LIMIT 1"), {"s": suc}).scalar()
        prods = c.execute(
            text("SELECT id_producto, precio FROM productos WHERE activo AND precio > 0 ORDER BY id_producto")
        ).fetchall()
        if not (suc and caja and user and prods):
            raise SystemExit("Falta sucursal / caja / usuario / productos. Corré seed_inicial primero.")

        if args.borrar:
            c.execute(text("""
                DELETE FROM pagos WHERE id_pedido IN (SELECT id_pedido FROM pedidos WHERE observacion='demo');
                """))
            c.execute(text("""
                DELETE FROM pedido_items WHERE id_pedido IN (SELECT id_pedido FROM pedidos WHERE observacion='demo');
                """))
            c.execute(text("DELETE FROM pedidos WHERE observacion='demo'"))
            c.execute(text("""
                DELETE FROM turnos_caja WHERE id_turno IN (
                    SELECT id_turno FROM turnos_caja t
                    WHERE NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.id_turno=t.id_turno)
                      AND t.estado='CERRADO'
                )
            """))

        metodos = ["EFECTIVO", "EFECTIVO", "EFECTIVO", "DEBITO", "DEBITO", "CREDITO", "TRANSFERENCIA"]
        tipos = ["LOCAL", "LOCAL", "LOCAL", "RETIRO", "RETIRO", "DELIVERY"]
        hoy = datetime.now(timezone.utc).date()

        total_ped = 0
        for d in range(args.dias, -1, -1):
            dia = hoy - timedelta(days=d)
            # más ventas los findes
            base = 14 if dia.weekday() >= 4 else 8
            n = max(1, base + random.randint(-3, 5))

            turno_ini = datetime.combine(dia, datetime.min.time(), tzinfo=timezone.utc) + timedelta(hours=15)
            id_turno = c.execute(text("""
                INSERT INTO turnos_caja (id_caja, id_usuario, monto_inicial, estado, fecha_apertura, fecha_cierre)
                VALUES (:c, :u, 20000, 'CERRADO', :ini, :fin)
                RETURNING id_turno
            """), {"c": caja, "u": user, "ini": turno_ini, "fin": turno_ini + timedelta(hours=8)}).scalar()

            for i in range(1, n + 1):
                cuando = turno_ini + timedelta(minutes=random.randint(0, 8 * 60))
                items = random.sample(prods, k=min(len(prods), random.randint(1, 3)))
                subtotal = 0
                filas_item = []
                for p in items:
                    cant = random.randint(1, 2)
                    precio = float(p._mapping["precio"])
                    subtotal += precio * cant
                    filas_item.append((p._mapping["id_producto"], cant, precio))
                desc = subtotal * (0.1 if random.random() < 0.1 else 0)
                total = round(subtotal - desc)

                id_ped = c.execute(text("""
                    INSERT INTO pedidos (id_sucursal, id_turno, id_usuario, tipo_pedido, estado,
                                         subtotal, descuento, total, fecha_creacion, numero, observacion)
                    VALUES (:s, :t, :u, :tipo, 'ENTREGADO', :sub, :desc, :tot, :cuando, :num, 'demo')
                    RETURNING id_pedido
                """), {
                    "s": suc, "t": id_turno, "u": user, "tipo": random.choice(tipos),
                    "sub": round(subtotal), "desc": round(desc), "tot": total, "cuando": cuando, "num": i,
                }).scalar()

                for id_prod, cant, precio in filas_item:
                    c.execute(text("""
                        INSERT INTO pedido_items (id_pedido, id_producto, cantidad, precio)
                        VALUES (:p, :prod, :cant, :precio)
                    """), {"p": id_ped, "prod": id_prod, "cant": cant, "precio": precio})

                c.execute(text("""
                    INSERT INTO pagos (id_pedido, id_turno, id_usuario, metodo_pago, monto, fecha_pago)
                    VALUES (:p, :t, :u, :m, :monto, :cuando)
                """), {"p": id_ped, "t": id_turno, "u": user, "m": random.choice(metodos), "monto": total, "cuando": cuando})
                total_ped += 1

    print(f"OK — {total_ped} ventas demo en {args.dias + 1} días.")


if __name__ == "__main__":
    main()
