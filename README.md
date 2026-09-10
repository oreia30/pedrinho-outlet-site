# Pedrinho Outlet — Site (loja virtual)

O que é: a vitrine pública da loja — catálogo, carrinho e checkout. Um
cliente compra aqui, o pedido cai automaticamente no painel
(`pedrinho-outlet-pdv-estoque`), o estoque é debitado e o caixa é lançado na
hora, na mesma transação (se faltar estoque de algum item, a compra inteira
falha e nada é gravado, pra nunca vender o que não tem).

Este projeto usa o **mesmo banco de dados** do painel — é lá que os
produtos são cadastrados e as fotos sobem.

## Passo a passo pra colocar no ar

1. **Banco**: use a **mesma** `DATABASE_URL` (Neon) configurada no projeto
   do painel — não crie um banco novo pra este.
2. **GitHub**: crie um repositório novo (ex: `pedrinho-outlet-site`) e suba
   esta pasta.
3. **Vercel**: importe o repositório em [vercel.com/new](https://vercel.com/new)
   e adicione a variável `DATABASE_URL` (a mesma do painel). Deploy.
4. **Domínio próprio** (quando o cliente comprar): aponte o domínio raiz
   (ex. `pedrinhooutlet.com.br`) pra este projeto. O subdomínio
   `painel.pedrinhooutlet.com.br` vai pro projeto do painel.

Não precisa rodar SQL nem criar tabela — o schema já foi criado pelo painel
(ou é criado por este projeto sozinho, se ele subir primeiro).

## Rodar localmente (opcional)
```
cp .env.example .env   # preencha DATABASE_URL (mesma do painel)
npm install
npm start
```
Abre em http://localhost:3000
