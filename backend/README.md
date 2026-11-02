# Backend

Microsserviços em Go que conversam por REST (via API Gateway) e por eventos no
Apache Kafka. Cada serviço tem o próprio banco de dados, que pode ser **em
memória** ou **PostgreSQL**.

| Serviço        | Porta | O que faz                                                        |
| -------------- | ----- | ---------------------------------------------------------------- |
| `api`          | 8080  | API Gateway: único ponto de entrada; valida o token, aplica bloqueios e limites, repassa para os serviços e mostra o status dos componentes |
| `auth`         | 8081  | Login (JWT), empresas (tenants), equipes e usuários; publica em `auth.events` |
| `notification` | 8082  | Envia emails (mock: só aparecem no log) a partir dos eventos     |
| `audit`        | 8083  | Trilha de auditoria (`auth.events`, `report.events`) e logs técnicos (`logs.events`) |
| `report`       | 8084  | Gera relatórios PDF e CSV de forma assíncrona, por empresa e equipe |
| `kafka`        | 9092  | Barramento de eventos (`auth.events`, `report.events`, `logs.events`) |
| `postgres`     | 5432  | Só sobe com `DB_DRIVER=postgres`; um banco por serviço           |

O frontend fala só com o gateway. As portas dos serviços ficam expostas para
depuração.

## Pré-requisitos

- Docker com Docker Compose v2.20 ou mais novo
- Go 1.26+ (só para rodar os serviços fora do Docker)

## Subindo tudo com Docker

Os comandos abaixo são executados dentro de `backend/`.

```sh
cp .env.example .env
docker compose up --build
```

Na primeira vez o build demora um pouco. Quando todos os containers estiverem
`healthy` (`docker compose ps`), teste:

```sh
curl localhost:8080/health
```

Para parar:

```sh
docker compose down      # mantém os dados (volumes)
docker compose down -v   # apaga também os dados do Postgres e os relatórios
```

## Modo do banco de dados

O modo é escolhido pela variável `DB_DRIVER`:

| `DB_DRIVER`        | O que acontece                                                                 |
| ------------------ | ------------------------------------------------------------------------------ |
| `memory` (padrão)  | Os dados ficam na memória de cada serviço e somem quando o container reinicia. |
| `postgres`         | O compose sobe também o container do Postgres e os serviços gravam nele.       |

### Trocando o modo

Edite o `.env`:

```sh
DB_DRIVER=postgres
```

ou passe na linha de comando, sem editar nada:

```sh
DB_DRIVER=postgres docker compose up --build
```

Para voltar para memória, use `DB_DRIVER=memory` (ou apague a linha do `.env`).
Ao trocar de modo com a stack no ar, rode `docker compose down` antes para o
container do Postgres não ficar sobrando.

> O `.env` precisa existir: é ele que liga o container do Postgres ao
> `DB_DRIVER` (`COMPOSE_PROFILES=${DB_DRIVER}`). Sem ele, use
> `docker compose --profile postgres up` junto com `DB_DRIVER=postgres`.

### Como o Postgres é organizado

- Um container, com um banco por serviço: `auth`, `notification`, `audit` e
  `report` (criados por `docker/postgres/init.sql`).
- Cada serviço cria as próprias tabelas ao subir, se ainda não existirem.
- Os dados ficam no volume `pgdata`.
- Acesso pelo host: `localhost:5432`, usuário `tcc`, senha `tcc`.

```sh
docker compose exec postgres psql -U tcc -d auth -c 'select * from users'
```

> O `init.sql` só roda quando o volume `pgdata` é criado. Se um serviço novo
> precisar de banco, recrie o volume (`docker compose down -v`) ou crie o
> banco manualmente.

## Perfis e contas iniciais

Cada usuário tem um perfil (`role`): `profissional` (colaborador), `gestao`
(RH) ou `admin` (todas as áreas). O cadastro público sempre cria
`profissional`; contas de gestão e admin vêm do arquivo de seed.

Ao subir, o `auth` lê `seed/users.json` (montado em `/seed` pelo compose) e
cria as empresas, equipes e contas que ainda não existem. O arquivo fica fora
do git; use `seed/users.example.json` como modelo:

```sh
cp seed/users.example.json seed/users.json   # edite nomes, e-mails e senhas
docker compose up -d --build auth
```

Como o seed roda em toda inicialização, as contas voltam mesmo no modo
memória. O perfil também vai no token JWT (claim `role`).

## Variáveis de ambiente

Definidas no `.env` (veja `.env.example`) ou na linha de comando:

| Variável             | Padrão                 | Uso                                                    |
| -------------------- | ---------------------- | ------------------------------------------------------ |
| `DB_DRIVER`          | `memory`               | `memory` ou `postgres`                                 |
| `AUTH_SEED_FILE`     | (vazio)                | JSON com contas iniciais do `auth` (compose: `/seed/users.json`) |
| `JWT_SECRET`         | `dev-secret-change-me` | Chave de assinatura dos tokens do `auth`               |
| `KAFKA_HOST_PORT`    | `9092`                 | Porta do Kafka no host (mude se a 9092 estiver em uso) |
| `POSTGRES_HOST_PORT` | `5432`                 | Porta do Postgres no host                              |
| `POSTGRES_PASSWORD`  | `tcc`                  | Senha do usuário `tcc` do Postgres                     |

## Rodando um serviço fora do Docker

Útil para depurar um serviço enquanto o resto roda no compose. O Kafka fica
acessível em `localhost:9092` (ou na porta de `KAFKA_HOST_PORT`).

```sh
docker compose up -d kafka kafka-init            # só a infraestrutura
go run ./cmd/auth                                # banco em memória

# com Postgres
DB_DRIVER=postgres docker compose up -d postgres kafka kafka-init
DB_DRIVER=postgres \
DATABASE_URL='postgres://tcc:tcc@localhost:5432/auth?sslmode=disable' \
go run ./cmd/auth
```

Cada serviço lê a própria porta (`API_PORT`, `AUTH_PORT`, `NOTIFICATION_PORT`,
`AUDIT_PORT`, `REPORT_PORT`) e `KAFKA_BROKERS` (padrão `localhost:9092`).
Lembre de parar o container do serviço antes (`docker compose stop auth`) para
liberar a porta.

## Empresas, equipes e acesso

- **Empresa (tenant):** criada pelo admin. Tem plano, limite de
  colaboradores, limite de requisições por minuto, domínios de e-mail e código
  de convite.
- **Cadastro público:** o colaborador entra na empresa pelo código de convite
  ou pelo domínio do e-mail. Se a empresa tiver domínios, o e-mail precisa ser
  de um deles. O limite de colaboradores vale também aqui.
- **Equipes:** criadas pela gestão (RH) da empresa. Cada usuário tem uma
  equipe, usada nos relatórios e nos ciclos de pesquisa.
- **Bloqueios:** usuário inativado ou empresa suspensa não faz login. As
  sessões abertas são barradas no gateway em até 10 s, o cache da consulta de
  acesso ao `auth`. O gateway também aplica o limite de requisições por minuto
  da empresa (429).
- **Permissões:** gestão só vê e altera a própria empresa. Admin vê todas as
  empresas, e informa `tenant_id` quando a operação é de uma delas.

| Rota (pelo gateway)                  | Quem pode            |
| ------------------------------------ | -------------------- |
| `POST /api/v1/auth/register`, `/login` | público            |
| `GET /api/v1/auth/me`                | qualquer usuário     |
| `/api/v1/tenants`                    | admin                |
| `/api/v1/teams`, `/api/v1/users`     | gestão e admin       |
| `/api/v1/reports`                    | gestão e admin       |
| `GET /api/v1/audit/events`           | gestão e admin       |
| `GET /api/v1/audit/logs`, `/logs/trace/{request_id}` | admin |
| `GET /api/v1/system/status`          | admin                |

## Logs técnicos e correlação

Toda requisição recebe um `X-Request-ID` no gateway, repassado aos serviços e
gravado no envelope dos eventos do Kafka (`correlation_id`). Cada serviço
publica em `logs.events` as requisições que atende (exceto GETs bem-sucedidos
e `/health`), os eventos que consome e os panics, com stack trace. O `audit`
guarda esses logs. `GET /api/v1/audit/logs/trace/{request_id}` devolve o
caminho completo de uma requisição: gateway, serviço, Kafka e consumidores.

## Usando a API

Há exemplos prontos em `http/` (formato `.http`, para Kulala/REST Client). As
rotas protegidas pedem o token do login no header `Authorization: Bearer`.

```sh
# login (as contas de gestão/admin vêm do seed)
TOKEN=$(curl -s -X POST localhost:8080/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"login":"gestao","password":"..."}' | jq -r .token)

# equipes e usuários da empresa
curl -H "Authorization: Bearer $TOKEN" localhost:8080/api/v1/teams
curl -H "Authorization: Bearer $TOKEN" localhost:8080/api/v1/users

# relatório assíncrono de uma equipe: pede (202), acompanha e baixa quando "done"
curl -X POST localhost:8080/api/v1/reports -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"type":"users","format":"pdf","team_ids":["tm_..."]}'
curl -H "Authorization: Bearer $TOKEN" localhost:8080/api/v1/reports/<id>
curl -H "Authorization: Bearer $TOKEN" -o users.pdf localhost:8080/api/v1/reports/<id>/download

# trilha de auditoria da empresa
curl -H "Authorization: Bearer $TOKEN" localhost:8080/api/v1/audit/events
```

Tipos de relatório: `users` (usuários com equipe, status e resumo de logins) e
`logins` (tentativas de login). Formatos: `pdf` e `csv`.
