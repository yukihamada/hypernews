FROM rust:1-bookworm AS builder
WORKDIR /build
COPY backend/ backend/
COPY frontend/ frontend/
WORKDIR /build/backend
RUN cargo build --release -p news-server

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /build/backend/target/release/news-server /app/news-server
COPY frontend/ /app/public/
EXPOSE 8080
ENV DATABASE_PATH=/data/news.db \
    STATIC_DIR=/app/public \
    RUST_LOG=info
CMD ["/app/news-server"]
