FROM alpine:latest AS builder

# Install Zig
RUN apk add --no-cache curl tar xz
RUN curl -L https://ziglang.org/download/0.11.0/zig-linux-x86_64-0.11.0.tar.xz -o zig.tar.xz \
    && tar -xf zig.tar.xz \
    && mv zig-linux-x86_64-0.11.0 /usr/local/zig \
    && ln -s /usr/local/zig/zig /usr/local/bin/zig

WORKDIR /app
COPY . .

# Build the service
RUN zig build-exe src/main.zig -O ReleaseFast

FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/main .

EXPOSE 8006
CMD ["./main"]
