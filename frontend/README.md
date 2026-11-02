# Frontend

Interface web do MindSync em React + TypeScript (Vite), feita a partir do
protótipo no Figma "Protótipo do site MIND SYNC".

## Rodando

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # gera dist/
```

O Vite repassa toda a API (`/api`) para o gateway na porta 8080
(`vite.config.ts`), que encaminha para cada microsserviço. Suba o backend
antes (`backend/README.md`).

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

## Integrado ao backend

- **Login, cadastro e sessão.** O cadastro usa o código de convite ou o
  domínio do e-mail. O app sai sozinho quando o token expira, o usuário é
  inativado ou a empresa é suspensa.
- **Empresas (`/dev`).** Criar, editar plano, limites, domínios e convite,
  suspender, reativar e excluir.
- **Usuários e equipes (`/gestao/usuarios`).** CRUD completo, com equipe no
  usuário.
- **Relatórios.** Por equipe, com download autenticado.
- **Trilha de auditoria.** Mostra só a empresa do usuário.
- **Logs técnicos (`/dev/logs`).** Busca, filtros, correlação da requisição
  entre os serviços e painel de status dos componentes.
- **Ciclos e dashboard gerencial.** Usam as equipes reais e o total de
  colaboradores.

O admin escolhe a empresa das telas de gestão no seletor da barra lateral.

## O que ainda é mock

O backend ainda não tem APIs de check-in, ciclos, mensagens preventivas,
parâmetros nem clientes PF/PJ. Por isso:

- os dados dessas telas ficam em memória ou no `localStorage` do navegador,
  incluindo os ciclos de pesquisa criados;
- os indicadores dos dashboards são valores de exemplo;
- o cadastro gera o `username` a partir do e-mail;
- em "Solicitar relatório", só engajamento vira `type: "logins"`; qualquer
  outra combinação vira `type: "users"`, que são os tipos que o serviço de
  relatórios aceita hoje.
