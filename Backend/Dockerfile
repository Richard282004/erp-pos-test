FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY Backend/requirements.txt Backend/requirements.txt
RUN pip install --no-cache-dir -r Backend/requirements.txt

COPY Backend Backend
COPY alembic alembic
COPY alembic.ini alembic.ini

RUN chmod +x Backend/start.sh

# No correr como root: si algo en la app o una dependencia se ve
# comprometido, que quede acotado a un usuario sin privilegios.
RUN useradd --no-create-home --shell /usr/sbin/nologin appuser \
    && chown -R appuser:appuser /app
USER appuser

CMD ["Backend/start.sh"]
