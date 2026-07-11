import api from './axios';

// ── Onboarding API ─────────────────────────────────────────────────────────────

/** POST /onboarding/initiate  — Create a new onboarding record from an enquiry */
export const initiateOnboardingApi = (enquiryId) =>
  api.post('/onboarding/initiate', { enquiryId });

/** GET /onboarding/:id  — Get a single onboarding record (full details) */
export const getOnboardingApi = (id) =>
  api.get(`/onboarding/${id}`);

/** PATCH /onboarding/:id/step  — Save progress for a specific onboarding step */
export const updateOnboardingStepApi = (id, data) =>
  api.patch(`/onboarding/${id}/step`, data);

/** POST /onboarding/:id/send-rules  — Send PG rules to tenant's app */
export const sendRulesApi = (id) =>
  api.post(`/onboarding/${id}/send-rules`);

/** GET /onboarding/:id/rules  — Get PG rules visible to tenant */
export const getRulesForTenantApi = (id) =>
  api.get(`/onboarding/${id}/rules`);

/** POST /onboarding/:id/accept-rules  — Record rule acceptance (physical or digital) */
export const acceptRulesApi = (id, data) =>
  api.post(`/onboarding/${id}/accept-rules`, data);

/** POST /onboarding/:id/assign-bed  — Assign a bed to the tenant */
export const assignBedApi = (id, data) =>
  api.post(`/onboarding/${id}/assign-bed`, data);

/** GET /onboarding/pg/:pgId  — List all onboardings for a PG */
export const listOnboardingsApi = (pgId, params) =>
  api.get(`/onboarding/pg/${pgId}`, { params });

/** POST /onboarding/shift-bed  — Shift a tenant to a new bed */
export const shiftBedApi = (data) =>
  api.post('/onboarding/shift-bed', data);

/**
 * POST /onboarding/offboard  — Owner initiates offboarding (settlement_pending).
 * Body: { onboardingId, exitDate, reason, deductions, deductionNotes, pendingRent, settlementReference }
 */
export const offboardTenantApi = (data) =>
  api.post('/onboarding/offboard', data);

/**
 * POST /onboarding/confirm-settlement  — Tenant confirms receipt of refund (→ removed).
 * Body: { onboardingId }
 */
export const confirmSettlementApi = (onboardingId) =>
  api.post('/onboarding/confirm-settlement', { onboardingId });

/** GET /onboarding/pg/:pgId/rules-upload-url  — Get S3 presigned URL for rules PDF upload */
export const getPGRulesUploadUrlApi = (pgId, params) =>
  api.get(`/onboarding/pg/${pgId}/rules-upload-url`, { params });

/** PATCH /onboarding/pg/:pgId/rules  — Update PG rules metadata after upload */
export const updatePGRulesApi = (pgId, data) =>
  api.patch(`/onboarding/pg/${pgId}/rules`, data);

/** GET /onboarding/tenant/my-pg  — Get the tenant's current active PG + onboarding info */
export const getMyPGInfoApi = () =>
  api.get('/onboarding/tenant/my-pg');

/** GET /onboarding/tenant/history  — Get the tenant's bed assignment history */
export const getBedHistoryApi = () =>
  api.get('/onboarding/tenant/history');

/**
 * GET /onboarding/tenants  — Owner: list all tenants across managed PGs.
 * Params: { search, pgId, status, page, limit }
 */
export const listTenantsApi = (params) =>
  api.get('/onboarding/tenants', { params });
