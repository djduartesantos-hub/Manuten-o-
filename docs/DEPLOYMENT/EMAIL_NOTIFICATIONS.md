# Email Notifications (SendGrid)

Este projeto envia emails via **SendGrid** usando a fila `email` (Bull). Sem `SENDGRID_API_KEY`, os emails sao ignorados (best-effort).

## Variaveis obrigatorias

- `SENDGRID_API_KEY`
- `SENDGRID_FROM` (ex: `noreply@empresa.com`)

## Como validar

1) Ativar **Notificacoes > Email** em `Definicoes`.
2) Criar um **Relatorio agendado** (Definicoes > Notificacoes do sistema).
3) Forcar o envio: aguardar o intervalo (10 min) ou ajustar `next_send_at` na BD.

## Notas

- O envio depende do Redis (fila `email`).
- Emails incluem anexos CSV + PDF quando aplicavel.
- O HTML enviado e simples por defeito.