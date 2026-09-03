FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY Backend/requirements.txt Backend/requirements.txt
RUN pip install --no-cache-dir -r Backend/requirements.txt

COPY Backend Backend
COPY alembic alembic
COPY alembic.ini alembic.ini

RUN chmod +x Backend/start.sh

CMD ["Backend/start.sh"]
