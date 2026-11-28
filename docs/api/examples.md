# Local synthetic API examples

**Prerequisites:** the entire local Compose demo is running, migrations/seeds have succeeded, and you have a *synthetic* Keycloak access token. Do not paste access tokens into GitHub, shell history or screenshots. The following commands use shell environment variables instead of literal credentials.

```bash
export API=http://127.0.0.1:3000/api/v1
export DOCTOR_TOKEN='REPLACE_WITH_SYNTHETIC_DOCTOR_OIDC_ACCESS_TOKEN'
export PATIENT_TOKEN='REPLACE_WITH_SYNTHETIC_PATIENT_OIDC_ACCESS_TOKEN'
export PATIENT_ID=b1111111-1111-4111-8111-111111111111
```

## 1. Health / readiness

```bash
curl --fail-with-body "$API/health"
curl --fail-with-body "$API/health/ready"
```

## 2. Create a doctor request

```bash
curl --fail-with-body -X POST "$API/access-requests" \
 -H "Authorization: Bearer $DOCTOR_TOKEN" -H 'Content-Type: application/json' \
 --data '{"patientId":"b1111111-1111-4111-8111-111111111111","purpose":"treatment","requestedTypes":["Observation","MedicationRequest"],"requestedDurationMinutes":60}'
```

Save the returned `id` locally as `REQUEST_ID`, then approve with the synthetic patient token:

```bash
curl --fail-with-body -X POST "$API/access-requests/$REQUEST_ID/approve" \
 -H "Authorization: Bearer $PATIENT_TOKEN"
```

Save the resulting `id` as `CONSENT_ID`. Then:

```bash
curl --fail-with-body "$API/access-requests/$REQUEST_ID/records/page?limit=10" \
 -H "Authorization: Bearer $DOCTOR_TOKEN"

curl --fail-with-body -X POST "$API/consents/$CONSENT_ID/revoke" \
 -H "Authorization: Bearer $PATIENT_TOKEN"
```

A subsequent doctor fetch is expected to return **HTTP 403**. Already retrieved copies are not revoked.

## 3. View timeline and anchor status

```bash
curl --fail-with-body "$API/patients/me/timeline/page?limit=25" \
 -H "Authorization: Bearer $PATIENT_TOKEN"

curl --fail-with-body "$API/records/$RECORD_ID/verification" \
 -H "Authorization: Bearer $PATIENT_TOKEN"
```

The returned `onchainVerified` should not be interpreted as true without live Preprod evidence. A `PENDING`/`LOCAL_COMMITMENT_ONLY` entry is an offline commitment, not a chain transaction.

## 4. Create a synthetic Observation

```bash
curl --fail-with-body -X POST "$API/records" \
 -H "Authorization: Bearer $DOCTOR_TOKEN" -H 'Content-Type: application/json' \
 --data '{"patientId":"b1111111-1111-4111-8111-111111111111","resource":{"resourceType":"Observation","id":"demo-synthetic-pressure-001","status":"final","code":{"coding":[{"system":"http://loinc.org","code":"8480-6"}]},"valueQuantity":{"value":120,"unit":"mmHg"}}}'
```

`demo-synthetic-pressure-001` is a stable example FHIR id; if the same record already exists with differing content the server rejects the write. Always use fictional records only.

## v0.7 – History pagination examples

These requests require a validated Keycloak access token. Replace `<access-token>` with a synthetic development user token; never paste credentials or bearer tokens into public issue trackers.

```bash
# Verified doctor: one page of their own access requests
curl -H 'Authorization: Bearer <access-token>' \
  'http://localhost:3000/api/v1/access-requests/mine/page?limit=25'

# Authenticated patient: one page of their own consent history
curl -H 'Authorization: Bearer <access-token>' \
  'http://localhost:3000/api/v1/patients/me/consents/page?limit=25'
```

The response uses `items` and `nextCursor`. If `nextCursor` is a UUID, provide it in a subsequent `cursor` query. If null, no further items are currently available. A cursor from another doctor/patient yields HTTP 400, not someone else's data.
