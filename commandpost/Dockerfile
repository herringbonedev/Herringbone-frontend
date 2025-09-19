# ---------- Build stage (with shell/tools) ----------
FROM cgr.dev/chainguard/python:latest-dev AS builder
WORKDIR /app
USER root

# Create a venv in a writable path and install deps
ENV VENV_PATH=/app/.venv
COPY requirements.txt .
RUN python -m venv "$VENV_PATH" \
 && "$VENV_PATH/bin/pip" install --no-cache-dir -r requirements.txt

# Copy your app code
COPY main.py .
COPY templates ./templates
COPY static ./static

# Ensure nonroot user can read everything at runtime
RUN chown -R 65532:65532 /app

# ---------- Runtime stage (distroless, non-root) ----------
FROM cgr.dev/chainguard/python:latest
WORKDIR /app

# Bring in the app + venv from builder
COPY --from=builder /app /app

# Run as nonroot (Chainguard default UID)
USER 65532
EXPOSE 5000

# (optional) put venv first on PATH
ENV PATH="/app/.venv/bin:${PATH}"

# Option B: use the venv's python and run uvicorn as a module
ENTRYPOINT ["/app/.venv/bin/python"]
CMD ["-m","uvicorn","main:app","--host","0.0.0.0","--port","5000","--workers","2"]
