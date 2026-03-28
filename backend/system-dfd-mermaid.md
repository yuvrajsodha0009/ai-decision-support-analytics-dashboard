# Full System DFD (Mermaid)

This document models the full platform data flow for:

- Frontend (React dashboard)
- Backend (Node/Express API)
- Python AI service (`python-ai-service`)
- External providers and data sources
- Data stores (MongoDB and upload storage)

## Level 0 DFD (System Context)

```mermaid
flowchart LR
    U[Org User\nAdmin Manager Analyst] -->|Login, upload CSV, analytics filters, AI queries| FE((Frontend Web App))
    FE -->|REST API calls with JWT| BE((Backend API))
    BE -->|Dashboard data, reports, AI results, status| FE

    BE <--> DB[(MongoDB)]
    BE <--> FS[(Uploads File Storage)]

    BE -->|Prompt payload| PY((Python AI Service))
    PY -->|AI analysis response| BE

    BE -->|LLM request| LLM[Gemini / Groq]
    LLM -->|Generated insights| BE

    BE -->|GeoJSON request| GEO[Map GeoJSON Source]
    GEO -->|Map geometry data| BE

    BE -->|Fetch external records| API[External Product/API Source]
    API -->|Source dataset| BE
```

## Level 1 DFD (Major Processes)

```mermaid
flowchart TB
    U[Org User] --> P0

    P0((P0 Frontend UI Layer\nAuth, Dashboard, Activity, Reports, AI Chat))
    P1((P1 Identity and Access\n/auth, /users, /activity))
    P2((P2 Data Intake and Versioning\n/data, /api-data, /v2/csv))
    P3((P3 Analytics and KPI Engine\n/analytics, /map, /category, /kpis))
    P4((P4 AI Orchestration\n/ai, ask-agent bridge))
    P5((P5 Reporting and Admin Sales\n/reports, /admin/sales))

    P0 <--> P1
    P0 <--> P2
    P0 <--> P3
    P0 <--> P4
    P0 <--> P5

    D1[(Users)]
    D2[(Activities)]
    D3[(RawSale)]
    D4[(Data and DataHistory)]
    D5[(ApiData and ApiDataHistory)]
    D6[(Source, Dataset, BusinessRecord, MappingTemplate)]
    D7[(KPI)]
    D8[(Uploads Directory)]

    P1 <--> D1
    P1 --> D2

    P2 <--> D4
    P2 <--> D5
    P2 <--> D6
    P2 <--> D8
    P2 --> D2

    P3 <--> D3
    P3 <--> D4
    P3 <--> D5
    P3 <--> D7

    P4 <--> D3
    P4 <--> D4
    P4 <--> D5

    P5 <--> D3
    P5 <--> D5
    P5 <--> D7
    P5 --> D2

    EXT1[External API Source] <--> P2
    EXT2[GeoJSON Source] <--> P3
    EXT3[Python AI Service] <--> P4
    EXT4[Gemini / Groq] <--> P4
```

## Level 2 DFD (Detailed End-to-End)

```mermaid
flowchart LR
    U[User] --> FE1

    subgraph FE[Frontend]
      FE1((F1 Authenticate / Session)) --> FE2((F2 Data Upload and Mapping UI))
      FE2 --> FE3((F3 Analytics Filters and Visuals))
      FE3 --> FE4((F4 AI Ask and Insight Panel))
      FE3 --> FE5((F5 Report Export and Activity View))
    end

    FE1 --> BE1
    FE2 --> BE2
    FE3 --> BE3
    FE4 --> BE4
    FE5 --> BE5

    subgraph BE[Backend]
      BE1((B1 Auth Validation\nJWT + role checks))
      BE2((B2 Ingestion Pipeline\nparse, normalize, dedupe, version))
      BE3((B3 Analytics Aggregation\nsales, category, geo, KPI))
      BE4((B4 AI Gateway\nprompt shaping + model routing))
      BE5((B5 Reporting + Audit\nPDF/Excel + activity log))
    end

    subgraph DS[Data Stores]
      S1[(Users)]
      S2[(Activities)]
      S3[(RawSale)]
      S4[(Data/DataHistory)]
      S5[(ApiData/ApiDataHistory)]
      S6[(Dataset + MappingTemplate + BusinessRecord)]
      S7[(KPI)]
      S8[(Uploaded Files)]
    end

    BEXT1[External API Source]
    BEXT2[GeoJSON Source]
    BEXT3[Python AI Service]
    BEXT4[Gemini / Groq]

    BE1 <--> S1
    BE1 --> S2

    BE2 <--> S4
    BE2 <--> S5
    BE2 <--> S6
    BE2 <--> S8
    BE2 --> S2
    BE2 <--> BEXT1

    BE3 <--> S3
    BE3 <--> S4
    BE3 <--> S5
    BE3 <--> S7
    BE3 <--> BEXT2

    BE4 <--> S3
    BE4 <--> S4
    BE4 <--> S5
    BE4 <--> BEXT3
    BE4 <--> BEXT4

    BE5 <--> S3
    BE5 <--> S5
    BE5 <--> S7
    BE5 --> S2

    BE3 --> FE3
    BE4 --> FE4
    BE5 --> FE5
```

## Export Tips

- Preview this file in VS Code Markdown preview.
- If Mermaid is enabled, copy each diagram block to Mermaid Live Editor for PNG/SVG export.
- For formal docs, keep Level 0 for overview, Level 1 for module discussion, and Level 2 for implementation walkthroughs.

## Auth and Password Reset Flow (Project-Specific)

```mermaid
flowchart TD
  A([Open Auth Page]) --> B[Select Role Tab: Employee or Admin]
  B --> C[Enter Email and Password]
  C --> D[POST /api/auth/login]

  D --> E{Email and password present?}
  E -- No --> E1[400: Email and password are required]
  E -- Yes --> F{Email format valid?}
  F -- No --> F1[400: Invalid email format]
  F -- Yes --> G{Default admin credentials?}

  G -- Yes --> G1{Trying user panel?}
  G1 -- Yes --> G2[403: Admins must login from admin panel]
  G1 -- No --> G3{Admin account suspended?}
  G3 -- Yes --> G4[403: Account suspended]
  G3 -- No --> Z[Success: JWT token + user role + dashboard redirect]

  G -- No --> H{User exists by email?}
  H -- No --> H1[400: Invalid credentials]
  H -- Yes --> I{Password matches hash?}
  I -- No --> I1[400: Invalid credentials]
  I -- Yes --> J{Role-panel rule valid?}

  J -- No --> J1[403: Wrong panel for role]
  J -- Yes --> K{Account status Active?}
  K -- No --> K1[403: Account suspended]
  K -- Yes --> Z

  C --> L[Click Forgot Password]
  L --> M{Reset method}
  M -->|OTP| N[POST /api/auth/request-password-otp]
  M -->|Old Password| R[POST /api/auth/reset-password]

  N --> N1{Email present and valid?}
  N1 -- No --> N2[400: Email required or invalid]
  N1 -- Yes --> N3{User exists?}
  N3 -- No --> N4[Generic success response]
  N3 -- Yes --> N5{Cooldown elapsed?}
  N5 -- No --> N6[429: Wait before new OTP]
  N5 -- Yes --> N7[Generate 6-digit OTP, hash, save expiry]
  N7 --> N8{Email provider delivery ok?}
  N8 -- Yes --> N9[Generic success response]
  N8 -- No --> N10[Dev fallback: return devOtp in non-production]

  R --> R1{Email and new password valid?}
  R1 -- No --> R2[400 validation error]
  R1 -- Yes --> R3{User exists?}
  R3 -- No --> R4[404: User not found]
  R3 -- Yes --> R5{Old password provided?}

  R5 -- Yes --> R6{Old password correct?}
  R6 -- No --> R7[400: Old password incorrect]
  R6 -- Yes --> R10[Hash new password and clear OTP fields]

  R5 -- No --> R8{OTP provided and valid?}
  R8 -- No --> R9[400: OTP missing, expired, or invalid]
  R8 -- Yes --> R10

  R10 --> R11[Password reset successful]
```

## Registration Flow (Project-Specific)

```mermaid
flowchart TD
  A([Open Registration UI or Admin User Create]) --> B[Enter name, email, password, optional role]
  B --> C[POST /api/auth/register]

  C --> D{All fields present?}
  D -- No --> D1[400: All fields are required]
  D -- Yes --> E{Email format valid?}
  E -- No --> E1[400: Invalid email format]
  E -- Yes --> F{Password length >= 6?}
  F -- No --> F1[400: Password must be at least 6 characters long]
  F -- Yes --> G{Email already registered?}
  G -- Yes --> G1[400: Email already registered]
  G -- No --> H{Authenticated requester exists?}

  H -- No --> I[Public/self registration path]
  I --> J{Requested elevated role?}
  J -- Yes --> J1[403: Only Admin can assign elevated roles]
  J -- No --> K[Force role = Employee]

  H -- Yes --> L{Requester is Admin?}
  L -- No --> L1[403: Only Admin can create users from authenticated routes]
  L -- Yes --> M[Allow requested role after normalization]

  K --> N[Hash password with bcrypt]
  M --> N
  N --> O[Create user: name, email, hashed password, role, accountStatus=Active]
  O --> P[Log activity: User Registered]
  P --> Q[Sign JWT token]
  Q --> R[201 Created: token + user id, name, email, role]

  C --> X[Unexpected error]
  X --> Y[500: Registration failed]
```

## Forgot Password Flow (Project-Specific)

```mermaid
flowchart TD
  A([User clicks Forgot password]) --> B[Open reset modal]
  B --> C{Choose reset method}

  C -->|OTP| D[Enter email and click Send OTP]
  D --> E[POST /api/auth/request-password-otp]

  E --> E1{Email present?}
  E1 -- No --> E2[400: Email is required]
  E1 -- Yes --> E3{Email format valid?}
  E3 -- No --> E4[400: Invalid email format]
  E3 -- Yes --> E5{User exists?}
  E5 -- No --> E6[Generic success message]
  E5 -- Yes --> E7{Cooldown elapsed?}
  E7 -- No --> E8[429: Wait before requesting new OTP]
  E7 -- Yes --> E9[Generate 6-digit OTP and store hash + expiry]
  E9 --> E10{OTP email delivered?}
  E10 -- Yes --> E11[Generic success message]
  E10 -- No --> E12[Non-prod fallback: return devOtp]

  C -->|Old Password| F[Enter email + old password + new password]
  E11 --> G[Enter OTP + new password]
  E12 --> G

  F --> H[POST /api/auth/reset-password]
  G --> H

  H --> H1{Email and new password provided?}
  H1 -- No --> H2[400: Email and new password are required]
  H1 -- Yes --> H3{Email format valid?}
  H3 -- No --> H4[400: Invalid email format]
  H3 -- Yes --> H5{New password length >= 6?}
  H5 -- No --> H6[400: Password must be at least 6 characters long]
  H5 -- Yes --> H7{User exists?}
  H7 -- No --> H8[404: User not found]
  H7 -- Yes --> H9{Old password provided?}

  H9 -- Yes --> H10{Old password matches?}
  H10 -- No --> H11[400: Old password is incorrect]
  H10 -- Yes --> H15[Hash new password and clear OTP fields]

  H9 -- No --> H12{OTP provided?}
  H12 -- No --> H13[400: Provide old password or OTP]
  H12 -- Yes --> H14{OTP exists, not expired, and valid?}
  H14 -- No --> H16[400: OTP not requested, expired, or invalid]
  H14 -- Yes --> H15

  H15 --> H17[Password reset successful]
```

## Unified Auth Lifecycle (Compact Thesis View)

```mermaid
flowchart LR
  U([User]) --> CH{Choose Action}
  CH -->|Register| R0[POST /api/auth/register]
  CH -->|Login| L0[POST /api/auth/login]
  CH -->|Forgot Password| F0[Open Reset Modal]

  %% Registration
  R0 --> R1{Valid name email password?}
  R1 -- No --> RE1[400 Validation Error]
  R1 -- Yes --> R2{Email already exists?}
  R2 -- Yes --> RE2[400 Email already registered]
  R2 -- No --> R3{Requester/Admin role rules pass?}
  R3 -- No --> RE3[403 Forbidden]
  R3 -- Yes --> R4[Hash password + create user + sign JWT]
  R4 --> RS[201 Registration Success]

  %% Login
  L0 --> L1{Email password present and valid?}
  L1 -- No --> LE1[400 Invalid input]
  L1 -- Yes --> L2{User exists and password matches?}
  L2 -- No --> LE2[400 Invalid credentials]
  L2 -- Yes --> L3{Role-panel check passes?}
  L3 -- No --> LE3[403 Wrong panel for role]
  L3 -- Yes --> L4{Account active?}
  L4 -- No --> LE4[403 Account suspended]
  L4 -- Yes --> LS[200 Login Success + JWT]

  %% Forgot password request OTP
  F0 --> F1{Method}
  F1 -->|OTP| O1[POST /api/auth/request-password-otp]
  F1 -->|Old Password| P1[POST /api/auth/reset-password]

  O1 --> O2{Email valid?}
  O2 -- No --> OE1[400 Invalid email]
  O2 -- Yes --> O3{Cooldown elapsed?}
  O3 -- No --> OE2[429 Cooldown error]
  O3 -- Yes --> O4[Generate OTP hash + expiry]
  O4 --> O5{Delivery success?}
  O5 -- Yes --> O6[OTP sent / generic response]
  O5 -- No --> O7[Dev fallback with devOtp]

  %% Reset password (OTP or old password)
  O6 --> P1
  O7 --> P1
  P1 --> P2{Email and new password valid?}
  P2 -- No --> PE1[400 Validation error]
  P2 -- Yes --> P3{User exists?}
  P3 -- No --> PE2[404 User not found]
  P3 -- Yes --> P4{Old password valid OR OTP valid?}
  P4 -- No --> PE3[400 Verification failed]
  P4 -- Yes --> P5[Hash new password + clear OTP fields]
  P5 --> PS[200 Password reset success]
```

## Data Ingestion Pipeline Flow (Domain-Specific)

```mermaid
flowchart TD
  A([User selects source]) --> B{Source type}
  B -->|CSV Upload| C[Upload file to backend]
  B -->|External API| D[Fetch API payload]

  C --> E[Parse CSV headers and rows]
  D --> F[Normalize API response fields]
  E --> G[Apply mapping template]
  F --> G

  G --> H[Data cleaning and type coercion]
  H --> I[Duplicate detection and deduplication]
  I --> J[Versioning snapshot for history]
  J --> K[Persist canonical records in MongoDB]
  K --> L[Store upload metadata/file reference]
  L --> M[Log ingestion activity]
  M --> N([Ingestion success response to frontend])

  H --> X{Validation errors?}
  X -- Yes --> X1[Return row-level errors and reject invalid records]
  X -- No --> I
```

## Analytics and KPI Processing Flow (Domain-Specific)

```mermaid
flowchart TD
  A([User sets filters]) --> B[Frontend sends analytics request]
  B --> C[Backend validates JWT and query params]
  C --> D[Load filtered dataset from MongoDB]

  D --> E[Aggregate by date, category, region, and source]
  E --> F[Compute KPI metrics and trends]
  F --> G{Map/Geo analytics requested?}
  G -- Yes --> H[Join with GeoJSON/state-city mapping]
  G -- No --> I[Skip geo join]
  H --> J[Build chart-ready payload]
  I --> J

  J --> K[Return analytics JSON to frontend]
  K --> L([Dashboard charts/tables rendered])

  D --> D1{No matching data?}
  D1 -- Yes --> D2[Return empty-state payload]
  D1 -- No --> E
```

## AI Orchestration Flow (Domain-Specific)

```mermaid
flowchart TD
  A([User submits AI query]) --> B[Frontend sends /ai or ask-agent request]
  B --> C[Backend validates auth and request schema]
  C --> D[Collect context data from MongoDB]
  D --> E[Build prompt with business context and filters]

  E --> F{Route target}
  F -->|Python AI Service| G[Call python-ai-service endpoint]
  F -->|Direct LLM| H[Call Gemini/Groq provider]

  G --> I[Python service enriches/structures prompt]
  I --> J[Model inference]
  H --> J

  J --> K[Post-process response and safety checks]
  K --> L[Persist AI interaction/activity log]
  L --> M([Return insight summary to frontend])

  J --> N{Provider failure?}
  N -- Yes --> O[Fallback provider or graceful error response]
  N -- No --> K
```

## Reporting and Export Flow (Domain-Specific)

```mermaid
flowchart TD
  A([User opens reports module]) --> B[Select filters and report type]
  B --> C[Frontend calls report endpoint]
  C --> D[Backend validates auth and parameters]
  D --> E[Fetch aggregated analytics/report dataset]

  E --> F{Export format}
  F -->|PDF| G[Generate PDF report document]
  F -->|Excel/CSV| H[Generate spreadsheet export]
  F -->|On-screen only| I[Return JSON summary]

  G --> J[Stream file response to frontend]
  H --> J
  I --> K[Render report preview]
  J --> L([User downloads report])

  E --> M[Log report generation activity]
  M --> N[(Activities collection updated)]

  D --> X{Invalid request?}
  X -- Yes --> X1[Return validation/auth error]
  X -- No --> E
```
