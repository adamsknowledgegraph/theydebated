FROM python:3.11-slim

WORKDIR /app

COPY app/ /app/

ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "python3 server.py ${PORT:-8080}"]
