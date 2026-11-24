# LankaHealthChain – தமிழில் Setup Guide (MVP)

இது Production Healthcare System இல்லை. Demo Patients மற்றும் Synthetic Records மட்டும் பயன்படுத்த வேண்டும்.

## Step 1 – உங்கள் Computer-ல் தேவையானவை

Windows 10/11 என்றால் WSL2 (Ubuntu), Docker Desktop, Git, Node.js **22.22.3 அல்லது அதற்குப் பிந்தைய compatible version**, pnpm 10, VS Code நிறுவுங்கள்.

## Step 2 – Project open

```bash
unzip LankaHealthChain-v0.1.0-source.zip
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

Core-க்கு இரண்டு SQL Migration files, Hospital-க்கு ஒரு Migration file இருக்கிறது. Hospital migration மூன்று databases-க்கும் தனித்தனியாக apply ஆகும்.

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

**குறிப்பு:** இந்த version-ல் approval local database consent மட்டுமே; Midnight proof இல்லை. Cardano transaction இன்னும் integrate செய்யப்படவில்லை. அடுத்த development milestone-ல் அதை சேர்த்து தனித்தனியாக verify செய்ய வேண்டும்.
