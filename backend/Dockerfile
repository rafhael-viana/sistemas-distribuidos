# Monta qualquer um dos microsserviços em cmd/. O serviço é escolhido pelo
# build arg SERVICE (api, auth, notification ou audit):
#   docker build --build-arg SERVICE=auth -t tcc-auth .

FROM golang:1.26-alpine AS build

ARG SERVICE
RUN test -n "$SERVICE" || (echo "build arg SERVICE é obrigatório" && false)

WORKDIR /src

# Baixa as dependências antes de copiar o código para aproveitar o cache.
COPY go.mod go.sum ./
RUN go mod download

COPY cmd ./cmd
COPY internal ./internal

RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/service ./cmd/${SERVICE}

FROM alpine:3.22

# wget já vem no busybox e é usado pelo healthcheck do compose.
# /data é do usuário app para o volume dos relatórios herdar a permissão.
RUN adduser -D -H -u 10001 app && mkdir /data && chown app /data
USER app

COPY --from=build /out/service /usr/local/bin/service

ENTRYPOINT ["/usr/local/bin/service"]
