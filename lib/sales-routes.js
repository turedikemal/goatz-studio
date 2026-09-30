const sales = require('./sales');

// true dönerse istek işlenmiştir.
module.exports = async function salesRoutes({ route, req, res, url, json, readJson }) {
  const q = Object.fromEntries(url.searchParams);
  const m = (re) => re.exec(route);
  let x;

  // Sabit listeler
  if (route === 'GET /api/sales/meta') { json(res, 200, { orderStatuses: sales.ORDER_STATUSES, paymentStatuses: sales.PAYMENT_STATUSES }); return true; }

  // Müşteri etiketleri
  if (route === 'GET /api/customer-tags') { json(res, 200, await sales.listTags()); return true; }
  if (route === 'POST /api/customer-tags') { json(res, 201, await sales.createTag(await readJson(req))); return true; }
  if ((x = m(/^PUT \/api\/customer-tags\/(\d+)$/))) { json(res, 200, await sales.updateTag(+x[1], await readJson(req))); return true; }
  if ((x = m(/^DELETE \/api\/customer-tags\/(\d+)$/))) { await sales.deleteTag(+x[1]); json(res, 200, { ok: true }); return true; }

  // Müşteriler
  if (route === 'GET /api/customers') { json(res, 200, await sales.listCustomers(q)); return true; }
  if (route === 'POST /api/customers') { json(res, 201, await sales.createCustomer(await readJson(req))); return true; }
  if ((x = m(/^GET \/api\/customers\/(\d+)$/))) {
    const c = await sales.getCustomer(+x[1]);
    json(res, c ? 200 : 404, c || { error: 'Müşteri bulunamadı.' }); return true;
  }
  if ((x = m(/^PUT \/api\/customers\/(\d+)$/))) { json(res, 200, await sales.updateCustomer(+x[1], await readJson(req))); return true; }
  if ((x = m(/^DELETE \/api\/customers\/(\d+)$/))) { await sales.deleteCustomer(+x[1]); json(res, 200, { ok: true }); return true; }

  // Kuponlar ve kampanyalar
  if (route === 'GET /api/coupons') { json(res, 200, await sales.listCoupons()); return true; }
  if (route === 'POST /api/coupons') { json(res, 201, await sales.createCoupon(await readJson(req))); return true; }
  if ((x = m(/^PUT \/api\/coupons\/(\d+)$/))) { json(res, 200, await sales.updateCoupon(+x[1], await readJson(req))); return true; }
  if ((x = m(/^DELETE \/api\/coupons\/(\d+)$/))) { await sales.deleteCoupon(+x[1]); json(res, 200, { ok: true }); return true; }
  if (route === 'GET /api/campaigns') { json(res, 200, await sales.listCampaigns()); return true; }
  if (route === 'POST /api/campaigns') { json(res, 201, await sales.createCampaign(await readJson(req))); return true; }
  if ((x = m(/^PUT \/api\/campaigns\/(\d+)$/))) { json(res, 200, await sales.updateCampaign(+x[1], await readJson(req))); return true; }
  if ((x = m(/^DELETE \/api\/campaigns\/(\d+)$/))) { await sales.deleteCampaign(+x[1]); json(res, 200, { ok: true }); return true; }

  // Siparişler
  if (route === 'POST /api/orders/price') {
    const p = await sales.priceOrder(await readJson(req));
    json(res, 200, p); return true;
  }
  if (route === 'POST /api/orders/bulk') { const b = await readJson(req); json(res, 200, await sales.bulkOrders(b.ids, b.action || '')); return true; }
  if (route === 'GET /api/orders') { json(res, 200, await sales.listOrders(q)); return true; }
  if (route === 'POST /api/orders') { json(res, 201, await sales.createOrder(await readJson(req))); return true; }
  if ((x = m(/^GET \/api\/orders\/(\d+)$/))) {
    const o = await sales.getOrder(+x[1]);
    json(res, o ? 200 : 404, o || { error: 'Sipariş bulunamadı.' }); return true;
  }
  if ((x = m(/^PUT \/api\/orders\/(\d+)$/))) { await sales.updateOrderInfo(+x[1], await readJson(req)); json(res, 200, await sales.getOrder(+x[1])); return true; }
  if ((x = m(/^POST \/api\/orders\/(\d+)\/(status|payment|shipping|invoice|returns)$/))) {
    const id = +x[1]; const body = x[2] === 'invoice' ? {} : await readJson(req);
    if (x[2] === 'status') await sales.setStatus(id, body.status);
    else if (x[2] === 'payment') await sales.setPayment(id, body);
    else if (x[2] === 'shipping') await sales.setShipping(id, body);
    else if (x[2] === 'invoice') await sales.createInvoice(id);
    else await sales.createReturn(id, body);
    json(res, 200, await sales.getOrder(id)); return true;
  }
  if (route === 'GET /api/returns') { json(res, 200, await sales.listReturns()); return true; }
  if ((x = m(/^PUT \/api\/returns\/(\d+)$/))) { json(res, 200, await sales.updateReturn(+x[1], await readJson(req))); return true; }

  // Kayıtlı filtreler
  if (route === 'GET /api/saved-filters') { json(res, 200, await sales.listFilters(q.scope || 'orders')); return true; }
  if (route === 'POST /api/saved-filters') { json(res, 201, await sales.saveFilter(await readJson(req))); return true; }
  if ((x = m(/^DELETE \/api\/saved-filters\/(\d+)$/))) { await sales.deleteFilter(+x[1]); json(res, 200, { ok: true }); return true; }

  return false;
};
