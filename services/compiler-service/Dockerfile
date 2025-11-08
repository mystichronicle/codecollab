FROM thevlang/vlang:alpine

WORKDIR /app

# Copy source code
COPY . .

# Build the service
RUN v -prod -o compiler-service main.v

EXPOSE 8005

CMD ["/app/compiler-service"]
