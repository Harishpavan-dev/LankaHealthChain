# LankaHealthChain – தமிழில் Setup Guide (MVP)

இது Production Healthcare System இல்லை. Demo Patients மற்றும் Synthetic Records மட்டும் பயன்படுத்த வேண்டும்.

## Step 1 – உங்கள் Computer-ல் தேவையானவை

Windows 10/11 என்றால் WSL2 (Ubuntu), Docker Desktop, Git, Node.js **22.22.3 அல்லது அதற்குப் பிந்தைய compatible version**, pnpm 10, VS Code நிறுவுங்கள்.

## Step 2 – Project open

```bash
unzip LankaHealthChain-v0.5.0-source.zip
cd LankaHealthChain
cp .env.example .env
```

`.env`-ல் இருக்கும் எல்லா `CHANGE_*` passwords/secrets-ஐ மாற்றுங்கள். ஒவ்வொரு Hospital-க்கும் **வேறு** DB password, service-token secret அமைக்கவும். URL-ல் உள்ள password-மும் அதே password ஆக இருக்க வேண்டும்.

## Step 3 – Database & Keycloak start

```bash
set -a; . ./.env; set +a
docker compose --env-file .env -f infrastructure/docker/compose.yml up -d
```

முதல் startup-ல் PostgreSQL நான்கு databases உருவாக்கும்:

- `lankahealthchain_core`
- `hospital_northern`
- `hospital_jaffna`
- `hospital_venus`

## Step 4 – Prisma Migrations

```bash
corepack enable
corepack prepare pnpm@10.18.0 --activate
pnpm install
pnpm --filter @lhc/shared build
pnpm --filter @lhc/database build
pnpm --filter @lhc/hospital-database build
pnpm db:migrate
pnpm db:seed
```

Core-க்கு **ஏழு** versioned SQL Migration files, Hospital-க்கு **இரண்டு** Migration files இருக்கிறது. Hospital migration மூன்று databases-க்கும் தனித்தனியாக apply ஆகும்.

## Step 5 – API & Hospitals start

ஒவ்வொரு command-க்கும் தனி terminal பயன்படுத்துங்கள். எல்லா terminal-களிலும் `.env` export ஆக வேண்டும்.

```bash
# Terminal 1 – Core API
pnpm --filter @lhc/api dev

# Terminal 2 – Northern
HOSPITAL_CODE=northern HOSPITAL_DATABASE_URL="$HOSPITAL_NORTHERN_DATABASE_URL" HOSPITAL_TOKEN_SECRET="$HOSPITAL_NORTHERN_TOKEN_SECRET" pnpm --filter @lhc/hospital-simulator dev

# Terminal 3 – Jaffna
HOSPITAL_CODE=jaffna HOSPITAL_DATABASE_URL="$HOSPITAL_JAFFNA_DATABASE_URL" HOSPITAL_TOKEN_SECRET="$HOSPITAL_JAFFNA_TOKEN_SECRET" pnpm --filter @lhc/hospital-simulator dev

# Terminal 4 – Venus
HOSPITAL_CODE=venus HOSPITAL_DATABASE_URL="$HOSPITAL_VENUS_DATABASE_URL" HOSPITAL_TOKEN_SECRET="$HOSPITAL_VENUS_TOKEN_SECRET" pnpm --filter @lhc/hospital-simulator dev
```

## Step 6 – Portals

```bash
pnpm --filter @lhc/patient-portal dev
pnpm --filter @lhc/doctor-portal dev
pnpm --filter @lhc/admin-portal dev
```

- Patient `http://localhost:5173`
- Doctor `http://localhost:5174`
- Admin `http://localhost:5175`
- Swagger `http://localhost:3000/api/docs`

Demo Accounts README-ல் கொடுக்கப்பட்டுள்ளன. அவை Local Development மட்டும். Public Server-க்கு பயன்படுத்த வேண்டாம்.

## Step 7 – Testing

```bash
pnpm test
```

Doctor -> Access Request -> Patient Approve -> Record Retrieval -> Patient Revoke -> Doctor Denied என்ற demo flow-ஐ இயக்கிப் பாருங்கள்.

**குறிப்பு:** இந்த version-ல் approval local database consent மட்டுமே; Midnight proof இல்லை. Cardano transaction இன்னும் integrate செய்யப்படவில்லை. Cardano offline anchor preparation scripts மற்றும் Midnight Compact draft சேர்க்கப்பட்டுள்ளன. Live Cardano transaction மற்றும் Midnight proof இன்னும் நிறைவேற்றப்படவில்லை.

---

## Update: முழு Demo Stack-ஐ ஒரே Docker Command மூலம் Start செய்வது

இது **Local Development** மட்டும். முழுமையான Hospital Production Deployment அல்ல.

Repository root-ல் Terminal திறக்கவும்:

```bash
node scripts/setup-local.mjs
```

இது ஒருமுறை மட்டும் இயங்கும். `.env` ஏற்கெனவே இருந்தால் அதை overwrite செய்யாது.
Strong random passwords மற்றும் Hospital Service Token Secrets உருவாகும்.

நான்கு PostgreSQL Databases, Keycloak, மூன்று Hospital APIs, Core API மற்றும்
மூன்று React portals எல்லாவற்றையும் ஆரம்பிக்க:

```bash
docker compose --env-file .env \
  -f infrastructure/docker/compose.yml \
  -f infrastructure/docker/compose.app.yml \
  up -d --build
```

முதல் முறையாக Node dependencies install ஆகுவதால் Internet தேவை.

```bash
docker compose --env-file .env \
  -f infrastructure/docker/compose.yml \
  -f infrastructure/docker/compose.app.yml \
  ps
```

**Login (100% Synthetic):**

- Patient: `http://localhost:5173`, username `patient.arun`, password `DemoPatient123!`
- Doctor: `http://localhost:5174`, username `doctor.venus`, password `DemoDoctor123!`
- Admin: `http://localhost:5175`, username `admin.network`, password `DemoAdmin123!`

### Demo Workflow

1. Doctor login → `New record access request` → Arun ID ஏற்கெனவே sample ஆக நிரப்பப்பட்டிருக்கும் → Submit.
2. Patient login → Pending Requests → Approve.
3. Doctor Previous Requests → `View records` → அனுமதிக்கப்பட்ட FHIR data கிடைக்கும்.
4. Doctor → `Create synthetic medical record` → Venus Hospital Database-ல் புதிய Observation சேமிக்கும்.
5. Patient timeline → Record reference தெரியும்; Cardano status `PENDING` எனவே இருக்கும்.
6. Patient → `Revoke` → புதிய Doctor Record Request மறுக்கப்படும்.

**முக்கியம்:** `Approve` என்பது இப்போதைக்கு Local-Demo Consent மட்டுமே. Midnight ZK Proof ஆகாது.

### Database Migration Files

Core database:

```text
packages/database/prisma/migrations/
  202611220001_init/migration.sql
  202611220002_constraints/migration.sql
  202611220003_hardening/migration.sql
  202611220004_anchor_lookup/migration.sql
  202611220005_outbox_idempotency/migration.sql
  202611220006_append_only_audit/migration.sql
  202611220007_query_indexes/migration.sql
```

Hospital databases (Northern, Jaffna, Venus – மூன்றிலும் தனித்தனியாக Apply):

```text
packages/hospital-database/prisma/migrations/
  202611220001_init/migration.sql
  202611220002_durable_replay/migration.sql
```

### Cardano preparation (Blockchain TX அல்ல)

```bash
mkdir -p private/cardano-batches
docker compose --env-file .env \
  -f infrastructure/docker/compose.yml \
  -f infrastructure/docker/compose.app.yml \
  --profile operator run --rm cardano-preparer
```

இது randomized Merkle root மற்றும் inclusion proofs உருவாக்கும். Cardano Preprod
wallet, funded test ADA, signing key, node, Blockfrost key ஆகியவற்றை அமைத்து,
`contracts/cardano/README.md` வழிமுறைகளின்படி confirmed TX import செய்யலாம்.

### Testing

Node.js மற்றும் dependencies இருந்தால்:

```bash
pnpm test
pnpm test:protocol
pnpm build
```

இந்த project உருவாக்கப்பட்ட execution environment-ல் PostgreSQL/Docker/npm registry
கிடைக்காத காரணத்தால் முழு Compose stack மற்றும் Real Blockchain TX இன்னும்
End-to-End Test செய்யப்படவில்லை. அதனால் deployment பிறகு
`docs/testing/deployment-checklist.md` ஒவ்வொரு item-யும் உறுதிப்படுத்தவும்.

### Synthetic Dataset (v0.4.0)

`demo/fixtures/records.json`-ல் Arun-ன் **4 synthetic records** மற்றும்
`demo/fixtures/population.json`-ல் **100 fictional patients / 500 records** உள்ளன.
`pnpm db:seed` முடிந்தபிறகு Core-ல் **101 synthetic patients / 504 record references**
மற்றும் மூன்று தனித்தனி Hospital DB-களில் அதற்குரிய fake clinical records இருக்கும்.
கூடுதலான 100 patients-க்கு Keycloak logins உருவாக்கப்படவில்லை; அவை load-testing fixtures மட்டுமே.

**இங்கே உண்மையாகச் சரிபார்க்கப்பட்டவை:** 62 unit மற்றும் isolated protocol HTTP tests,
49 TS/TSX syntax checks, 100 record Cardano offline Merkle proof.
**இங்கே சரிபார்க்கப்படாதவை:** Docker build/start, Prisma migrations apply,
actual browser login/E2E, Preprod on-chain transaction, Midnight contract compilation/ZK proofs.
இவற்றுக்கான தெளிவான steps `docs/testing/IMPLEMENTATION_REPORT.md`-ல் கொடுக்கப்பட்டுள்ளன.

---

## v0.4.0 Verification – Local Docker Stack-ல் உண்மையான E2E Test

**இந்த scripts எல்லாம் Synthetic Demo Database-களுக்கானவை மட்டுமே.**
கீழ்க்கண்ட commands மூலம் prerequisites சரிபார்க்கவும்:

```bash
node scripts/qa/preflight.mjs
node scripts/setup-local.mjs  # Only if .env does not exist
```

Development stack-ஐ ஆரம்பித்த பிறகு (மேலே உள்ள Compose commands):

```bash
LHC_HEALTH_ATTEMPTS=60 node scripts/qa/live-smoke.mjs
LHC_ACCEPT_SYNTHETIC_WRITE=YES node scripts/qa/live-flow.mjs
```

இரண்டாவது command **உண்மையான Docker-run app**-இல் OIDC Login, Doctor Request,
Patient Approve, Consent-based cross-hospital read, new synthetic Observation write,
patient timeline pagination, Revoke மற்றும் post-revocation denial ஆகியவற்றைச் சரிபார்க்கும்.
அது Cardano Preprod/Midnight on-chain proof-ஐச் சரிபார்க்காது.

Keycloak local test client `lhc-test-cli` test-only password flow-ஐ பயன்படுத்தும்.
**Production Realm-க்கு இதை export செய்யாதீர்கள்.**
Keycloak realm ஏற்கெனவே import செய்யப்பட்டிருந்தால் புதிய test-client automatic-ஆக
update ஆகாது; disposable demo environment-க்கு மட்டும் புதிய database volume பயன்படுத்தவும்.

Midnight Ledger 9 Compact 0.36.1-ல் compile செய்ய வேண்டிய script:

```bash
compact update 0.36.1
bash contracts/midnight/scripts/compile.sh
```

Compilation, wallet integration, ZK proof generation மற்றும் Preprod deployment
இந்த coding environment-ல் செய்யப்படவில்லை. Testnet wallet secrets-ஐ chat/GitHub-ல்
பகிர வேண்டாம்.


---

## v0.5.0 – கூடுதல் பாதுகாப்பு மற்றும் Database Checks

Core-க்கு 9 SQL migration files, ஒவ்வொரு Hospital-க்கும் 2 SQL migration files உள்ளன. `pnpm db:migrate` மூன்று Hospital Databases-க்கும் தனித்தனி migration histories-ஐப் பயன்படுத்தும்.

Full Docker stack தொடங்கிய பின் நான்கு database roles-ஐச் சோதிக்க:

```bash
docker compose --env-file .env \
 -f infrastructure/docker/compose.yml \
 -f infrastructure/docker/compose.app.yml \
 run --rm --no-deps migrate-and-seed pnpm db:verify-isolation
```

Expected: 4 own connections PASS; 12 cross-hospital connections DENIED. Hospital APIs இப்போது மற்ற Hospital DB passwords-ஐ environment-ல் பெறாது. Frontend containers-க்கும் DB credentials கிடையாது.

Patient Approval Request-க்கு **24 மணி நேர deadline** உள்ளது. Doctor Portal-ல் records அதிகமாக இருந்தால் **Load more records** மூலம் அடுத்த page பார்க்கலாம். இந்த features source-ல் சேர்க்கப்பட்டுள்ளன; உண்மையான Docker stack-ல் இன்னும் சோதிக்கப்படவில்லை.

**Cardano Preprod**: wallet, Preprod test-ADA, node/signing access மற்றும் confirmed TX-ஐப் பதிவு செய்வது இன்னும் அவசியம்.

**Midnight**: Compact compiler நிறுவி source contract compile, local proof server, wallet/client, deploy, verification ஆகியவை இன்னும் செய்யப்பட வேண்டும். Local-demo authorization ஒரு ZK proof அல்ல.
