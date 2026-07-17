# Anima Imago — site real

Este projeto é a versão funcional do site: galeria vinda de um banco de dados,
pagamento real via Stripe, downloads seguros e a página de Studio Upload
publicando peças de verdade.

Não usa nenhum framework pesado (Next.js, React etc.) — só HTML/CSS/JS puro em
`/public` e funções serverless simples em `/api`, sem nenhuma dependência de
pacotes externos (só a API do Node.js). Isso significa que não é preciso rodar
`npm install` para nada funcionar.

Veja o arquivo **"Anima Imago — Guia de Publicação.docx"** para o passo a
passo completo, pensado para quem não mexe com código no dia a dia.
Este README é a referência técnica resumida.

## Estrutura

```
public/            → site (HTML/CSS/JS), publicado tal como está
api/                → funções do servidor (pagamento, banco de dados, upload)
api/_lib/           → funções auxiliares compartilhadas
supabase-schema.sql → schema do banco de dados (rodar uma vez no Supabase)
seed.js             → popula o banco com as 14 peças de exemplo do protótipo
.env.example        → lista de variáveis de ambiente necessárias
```

## Variáveis de ambiente necessárias

Veja `.env.example`. Todas precisam ser configuradas no painel da Vercel
(Project Settings → Environment Variables) antes do primeiro deploy real.

## Popular as 14 peças de exemplo

Depois do primeiro deploy, vá em `/upload.html`, digite a senha do estúdio, e
clique no botão **"Popular com as 14 peças de exemplo"** — isso publica as
peças de exemplo do protótipo direto no banco, sem precisar de terminal.

(Alternativa via terminal, para quem preferir: `SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=... node seed.js`.)

## Webhook do Stripe

Depois do primeiro deploy, configure em Stripe → Developers → Webhooks um
endpoint apontando para:

```
https://SEU-DOMINIO/api/stripe-webhook
```

escutando o evento `checkout.session.completed`. Copie o "Signing secret"
gerado para a variável `STRIPE_WEBHOOK_SECRET`.

## Encomendas personalizadas ("Commission a Piece")

Além do catálogo pronto, o site tem uma página `/commission.html` onde qualquer
cliente pode pedir uma peça feita sob medida. Ele paga um sinal de 50% na hora
(via Stripe, mesma estrutura da compra normal) e o restante é combinado
diretamente com você quando a peça fica pronta.

O cliente também pode anexar uma pequena imagem de referência (JPG/PNG, até
6MB) como exemplo do que tem em mente — ela aparece junto com o pedido.

Você acompanha os pedidos em `/studio-orders.html` (mesma senha do Studio
Upload): dá para ver a descrição pedida, a imagem de referência (se houver),
marcar "em produção", subir a imagem final quando terminar (gera
automaticamente um link de download seguro para você copiar e enviar por
e-mail) e marcar como entregue.

O preço total do pacote de encomenda é definido pela variável de ambiente
`COMMISSION_PRICE` (o sinal é sempre 50% desse valor) — mude o número no
painel da Vercel a qualquer momento, sem precisar editar código.

## Limitação conhecida (v1)

A pré-visualização das peças na galeria e a versão final entregue após a
compra usam o mesmo arquivo de imagem, protegido por um link temporário e por
uma marca d'água visual (CSS) na galeria. Isso é suficiente para uma loja
pequena/boutique, mas não é proteção contra cópia tão forte quanto gerar uma
versão de baixa resolução separada para a pré-visualização — isso pode ser
adicionado depois, se fizer sentido para o negócio.
