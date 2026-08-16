import type { FastifyInstance } from 'fastify';
import type { AppEnv } from '../../config/env.js';
import { z } from 'zod';
import { getAuthUser } from '../../auth/service.js';
import { createInvoice, createPaymentAttempt, getPaymentAttemptForUser, attachProviderRequest, findAttemptByAuthority, markPaymentFailed, markPaymentSucceeded } from './repository.js';
import { requestZarinpalPayment, verifyZarinpalPayment } from './zarinpal.js';
import { getCurrentSubscription, cancelSubscription, renewSubscription } from './subscription-service.js';

const invoiceSchema = z.object({
  planKey: z.string().trim().min(1).max(80),
  amountMinor: z.number().int().positive().safe(),
  currency: z.string().length(3).transform((value) => value.toUpperCase()),
  description: z.string().trim().min(3).max(300),
});

const attemptSchema = z.object({
  invoiceId: z.string().uuid(),
  provider: z.enum(['zarinpal', 'idpay', 'sandbox']),
  idempotencyKey: z.string().trim().min(8).max(200),
});

function errorResponse(error: unknown) {
  if (!(error instanceof Error)) return null;
  const known: Record<string, number> = {
    plan_not_found: 404,
    invoice_not_found: 404,
    invalid_invoice_amount: 400,
    invalid_idempotency_key: 400,
    idempotency_key_conflict: 409,
    invoice_not_payable: 409,
  };
  const status = known[error.message];
  return status ? { status, error: error.message } : null;
}

export async function registerBillingRoutes(app: FastifyInstance, env: AppEnv) {
  app.get('/api/v1/billing/subscription', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    return reply.send({ ok: true, subscription: await getCurrentSubscription(user.id) });
  });

  app.post('/api/v1/billing/subscription/cancel', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const parsed = z.object({ immediate: z.boolean().default(false) }).safeParse(request.body ?? {});
    if (!parsed.success) return reply.status(400).send({ error: 'invalid_input' });
    try { return reply.send({ ok: true, subscription: await cancelSubscription(user.id, parsed.data.immediate) }); }
    catch (error) { if (error instanceof Error && error.message === 'subscription_not_found') return reply.status(404).send({ error: error.message }); throw error; }
  });

  app.post('/api/v1/billing/subscription/renew', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    try { return reply.send({ ok: true, subscription: await renewSubscription(user.id) }); }
    catch (error) { if (error instanceof Error && error.message === 'subscription_not_found') return reply.status(404).send({ error: error.message }); throw error; }
  });
  app.post('/api/v1/billing/invoices', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const parsed = invoiceSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid_input', details: parsed.error.flatten() });
    try {
      const invoice = await createInvoice({ userId: user.id, ...parsed.data });
      return reply.status(201).send({ ok: true, invoice });
    } catch (error) {
      const known = errorResponse(error);
      if (known) return reply.status(known.status).send({ error: known.error });
      throw error;
    }
  });

  app.post('/api/v1/billing/payment-attempts/:attemptId/start', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = z.object({ attemptId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_input' });
    const attempt = await getPaymentAttemptForUser(params.data.attemptId, user.id);
    if (!attempt) return reply.status(404).send({ error: 'payment_attempt_not_found' });
    if (attempt.provider !== 'zarinpal' || !['created', 'pending'].includes(attempt.status)) return reply.status(409).send({ error: 'payment_attempt_not_startable' });
    if (!env.PAYMENT_CALLBACK_BASE_URL) return reply.status(503).send({ error: 'payment_callback_not_configured' });
    try {
      const callbackUrl = new URL('/api/v1/billing/callback/zarinpal', env.PAYMENT_CALLBACK_BASE_URL).toString();
      const payment = await requestZarinpalPayment(env, { amountMinor: Number(attempt.amount_minor), callbackUrl, description: `Kaghaz-o-Baad invoice ${attempt.invoice_id}` });
      const updated = await attachProviderRequest({ attemptId: attempt.id, userId: user.id, authority: payment.authority, redirectUrl: payment.redirectUrl, rawResponse: payment.rawResponse });
      return reply.send({ ok: true, paymentAttempt: updated, redirectUrl: payment.redirectUrl });
    } catch (error) {
      await markPaymentFailed({ attemptId: attempt.id, code: error instanceof Error ? error.message : 'provider_error', message: 'zarinpal_request_failed', rawResponse: {} });
      throw error;
    }
  });

  app.get('/api/v1/billing/callback/zarinpal', async (request, reply) => {
    const query = z.object({ Authority: z.string().min(1), Status: z.enum(['OK', 'NOK']) }).safeParse(request.query);
    if (!query.success) return reply.status(400).send({ error: 'invalid_callback' });
    const attempt = await findAttemptByAuthority(query.data.Authority);
    if (!attempt) return reply.status(404).send({ error: 'payment_attempt_not_found' });
    if (query.data.Status === 'NOK') {
      await markPaymentFailed({ attemptId: attempt.id, code: 'cancelled', message: 'customer_cancelled', rawResponse: query.data });
      return reply.send({ ok: false, status: 'cancelled' });
    }
    try {
      const verified = await verifyZarinpalPayment(env, { authority: query.data.Authority, amountMinor: Number(attempt.amount_minor) });
      if (!verified.success) {
        await markPaymentFailed({ attemptId: attempt.id, code: String(verified.providerCode), message: 'verification_failed', rawResponse: verified.rawResponse });
        return reply.status(400).send({ ok: false, status: 'failed', code: verified.providerCode });
      }
      const paymentAttempt = await markPaymentSucceeded({ attemptId: attempt.id, refId: verified.refId, rawResponse: verified.rawResponse });
      return reply.send({ ok: true, status: 'paid', refId: verified.refId, paymentAttemptId: paymentAttempt.id });
    } catch (error) { throw error; }
  });

  app.post('/api/v1/billing/payment-attempts', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const parsed = attemptSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid_input', details: parsed.error.flatten() });
    try {
      const attempt = await createPaymentAttempt({ userId: user.id, ...parsed.data });
      return reply.status(201).send({ ok: true, paymentAttempt: attempt });
    } catch (error) {
      const known = errorResponse(error);
      if (known) return reply.status(known.status).send({ error: known.error });
      throw error;
    }
  });
}
