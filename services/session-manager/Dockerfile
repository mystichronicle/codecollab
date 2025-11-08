FROM elixir:1.15-alpine

WORKDIR /app

# Install Hex and Rebar
RUN mix local.hex --force && \
    mix local.rebar --force

# Copy mix files
COPY mix.exs mix.lock ./

# Install dependencies (remove --only prod to get dev dependencies for compilation)
RUN mix deps.get

# Copy application code
COPY . .

# Compile the application
RUN mix compile

EXPOSE 8007 4369

CMD ["mix", "run", "--no-halt"]
