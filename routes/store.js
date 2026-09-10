const express = require('express');
const { pool } = require('../lib/db');
const { SCHEMA } = require('../lib/migrate');

const router = express.Router();

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, description, category, price, image_url, images, attributes
     FROM ${SCHEMA}.products
     WHERE active = true AND quantity > 0
     ORDER BY created_at DESC`
  );
  res.render('index', { products: rows });
});

// Só produtos disponíveis — preço sempre vem do banco, nunca do cliente.
router.get('/api/products', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, description, category, price, quantity, image_url, images, attributes
     FROM ${SCHEMA}.products
     WHERE active = true AND quantity > 0
     ORDER BY created_at DESC`
  );
  res.json(rows);
});

// Única porta de entrada pra uma venda. Roda numa transação: valida estoque
// de cada item, calcula o total a partir do preço gravado no banco (nunca
// do que o cliente mandou), debita a quantidade e grava pedido + caixa
// juntos. Se faltar estoque de qualquer item, nada é gravado.
router.post('/api/registrar-venda', async (req, res) => {
  const { customerName, customerContact, address, paymentMethod, items } = req.body;

  if (!customerName || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Dados do pedido incompletos.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let totalCents = 0;
    const orderItems = [];

    for (const cartItem of items) {
      const { rows } = await client.query(
        `SELECT id, name, price, quantity FROM ${SCHEMA}.products WHERE id = $1 FOR UPDATE`,
        [cartItem.productId]
      );
      const product = rows[0];
      if (!product) {
        throw new Error(`Produto não encontrado.`);
      }
      const qty = Number(cartItem.quantity) || 0;
      if (qty <= 0) {
        throw new Error(`Quantidade inválida para ${product.name}.`);
      }
      if (Number(product.quantity) < qty) {
        throw new Error(`Estoque insuficiente para "${product.name}" (disponível: ${product.quantity}).`);
      }

      // Trabalha em centavos (inteiros) pra evitar erro de ponto flutuante
      // ao somar preços — 129.9 * 3 em float dá 389.70000000000005.
      const unitPriceCents = Math.round(Number(product.price) * 100);
      totalCents += unitPriceCents * qty;
      orderItems.push({
        product_id: product.id,
        name: product.name,
        quantity: qty,
        unit_price: unitPriceCents / 100,
      });

      await client.query(`UPDATE ${SCHEMA}.products SET quantity = quantity - $1 WHERE id = $2`, [
        qty,
        product.id,
      ]);
    }

    const total = totalCents / 100;

    const { rows: orderRows } = await client.query(
      `INSERT INTO ${SCHEMA}.orders (customer_name, customer_contact, address, items, total, payment_method, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pendente')
       RETURNING id`,
      [customerName, customerContact || null, address || null, JSON.stringify(orderItems), total, paymentMethod || null]
    );

    await client.query(
      `INSERT INTO ${SCHEMA}.cash_transactions (type, category, amount, description, ref_type, ref_id)
       VALUES ('entrada', 'venda loja', $1, $2, 'order', $3)`,
      [total, `Pedido de ${customerName}`, orderRows[0].id]
    );

    await client.query('COMMIT');
    res.json({ ok: true, orderId: orderRows[0].id, total });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message || 'Não foi possível concluir a venda.' });
  } finally {
    client.release();
  }
});

module.exports = router;
