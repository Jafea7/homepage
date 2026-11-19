FROM python:3.12-alpine
WORKDIR /app
COPY server.py .
RUN addgroup -S stats && adduser -S -G stats -u 10001 stats
RUN mkdir /data && chown stats:stats /data
USER stats
CMD ["python3", "-u", "/app/server.py"]
