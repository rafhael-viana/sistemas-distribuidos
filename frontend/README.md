# Frontend

Interface web do MindSync em React + TypeScript (Vite), feita a partir do
protótipo no Figma "Protótipo do site MIND SYNC".

## Rodando

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # gera dist/
```

O Vite repassa as chamadas de API para o backend (veja `vite.config.ts`), então
suba os microsserviços antes (`backend/README.md`):

| Caminho                 | Serviço        | Porta |
| ----------------------- | -------------- | ----- |
| `/api/v1/auth`          | gateway (auth) | 8080  |
| `/api/v1/reports`       | report         | 8084  |
| `/api/v1/audit`         | audit          | 8083  |
| `/api/v1/notifications` | notification   | 8082  |

## Telas e fluxos

| Rota                               | Tela                                              |
| ---------------------------------- | ------------------------------------------------- |
| `/`                                | Landing page                                      |
| `/login`, `/cadastro`              | Login e cadastro (integrados ao `auth`)           |
| `/onboarding`                      | Privacidade → check-ins (passo 2 de 3) → conclusão |
| `/app`                             | Dashboard do colaborador                          |
| `/app/checkin`                     | Check-in periódico em 4 etapas                    |
| `/app/checkin/devolutiva`          | Devolutiva de saúde calculada das respostas       |
| `/app/historico`                   | Histórico de bem-estar                            |
| `/app/bem-estar`                   | Central de Bem-estar (mensagens ativas do RH)     |
| `/app/notificacoes`                | Minhas notificações                               |
| `/app/configuracoes`               | Configurações e privacidade                       |
| `/gestao`                          | Dashboard gerencial                               |
| `/gestao/ciclos`                   | Configuração de ciclos de pesquisa                |
| `/gestao/relatorios`               | Relatórios & Export (integrado ao `report`)       |
| `/gestao/relatorios/novo`          | Solicitar novo relatório                          |
| `/gestao/relatorios/gerando/:id`   | Acompanhamento da geração (polling do status)     |
| `/gestao/mensagens`                | Mensagens preventivas                             |
| `/gestao/usuarios`                 | Gestão de usuários                                |
| `/gestao/parametros`               | Parâmetros institucionais                         |
| `/gestao/auditoria`                | Trilha de auditoria (integrada ao `audit`)        |
| `/clientes/pessoa-fisica`          | 5.1 Cadastro pessoa física                        |
| `/clientes/pessoa-juridica`        | 5.2 Cadastro de empresas em massa (CSV)           |
| `/clientes`                        | 5.3 Clientes cadastrados                          |
| `/dev`                             | Gestão de tenants/empresas                        |
| `/dev/logs`                        | Logs técnicos & rastreamento de erros             |

## Perfis

O perfil vem do login (`user.role`) e define as áreas acessíveis:

| Perfil         | Áreas                                         | Após o login             |
| -------------- | --------------------------------------------- | ------------------------ |
| `profissional` | `/app`                                        | `/onboarding` ou `/app`  |
| `gestao`       | `/gestao`, `/clientes`                        | `/gestao`                |
| `admin`        | todas, com seletor de área na barra lateral   | `/gestao`                |

Contas de gestão e admin são criadas pelo seed do backend (`backend/README.md`).

## O que ainda é mock

O backend ainda não tem APIs de check-in, usuários, mensagens, clientes ou
tenants. Por isso:

- os dados dessas telas ficam em memória ou no `localStorage` do navegador;
- o cadastro gera o `username` a partir do e-mail, e o código de convite não é
  enviado;
- em "Solicitar relatório", só engajamento vira `type: "logins"`; qualquer
  outra combinação vira `type: "users"`, que são os tipos que o serviço de
  relatórios aceita hoje.
