# Thesis DFD Diagrams (Mermaid)

This file provides clean, submission-ready DFD diagrams for:
- Context Level DFD
- Level 1 DFD
- Level 2 DFD (core decomposition)

## 1) Context Level DFD

```mermaid
flowchart LR
    SYS((AI Decision Support Analytics Dashboard))

    EMP[Employee User]
    ADM[Admin User]
    GST[Guest User]

    API[External API Source]
    GEO[GeoJSON Source]
    PY[Python AI Service]
    LLM[Gemini or Groq]
    MAIL[OTP Email Provider]

    EMP -->|Login, upload CSV, apply filters, ask AI, generate reports| SYS
    SYS -->|Dashboard, analytics results, AI insights, exports| EMP

    ADM -->|Admin login, user management, KPI management, audit view| SYS
    SYS -->|Admin dashboards, user status, activity logs| ADM

    GST -->|Open landing and auth page| SYS
    SYS -->|Public pages and auth options| GST

    SYS -->|Fetch records| API
    API -->|Source dataset payload| SYS

    SYS -->|Request map geometry| GEO
    GEO -->|GeoJSON response| SYS

    SYS -->|Prompt payload| PY
    PY -->|Structured AI response| SYS

    SYS -->|LLM query| LLM
    LLM -->|Generated insights| SYS

    SYS -->|Send password reset OTP| MAIL
    MAIL -->|Delivery status| SYS
```

## 2) Level 1 DFD

```mermaid
flowchart TB
    U[Platform Users] --> P1
    U --> P2
    U --> P3
    U --> P4
    U --> P5
    U --> P6

    P1((1.0 Registration and Login))
    P2((2.0 Data Intake and Versioning))
    P3((3.0 Analytics and KPI Processing))
    P4((4.0 AI Query and Insight Generation))
    P5((5.0 Reporting and Export))
    P6((6.0 User and Access Management))
    P7((7.0 Activity and Audit Tracking))

    D1[(Users)]
    D2[(Activities)]
    D3[(RawSale)]
    D4[(Data)]
    D5[(DataHistory)]
    D6[(ApiData)]
    D7[(ApiDataHistory)]
    D8[(Source)]
    D9[(Dataset)]
    D10[(MappingTemplate)]
    D11[(BusinessRecord)]
    D12[(KPI)]
    D13[(Uploads)]

    EXT1[External API Source]
    EXT2[GeoJSON Source]
    EXT3[Python AI Service]
    EXT4[LLM Provider]
    EXT5[OTP Email Provider]

    P1 <--> D1
    P1 --> D2
    P1 <--> EXT5

    P2 <--> D4
    P2 <--> D5
    P2 <--> D6
    P2 <--> D7
    P2 <--> D8
    P2 <--> D9
    P2 <--> D10
    P2 <--> D11
    P2 <--> D13
    P2 <--> EXT1
    P2 --> D2

    P3 <--> D3
    P3 <--> D4
    P3 <--> D6
    P3 <--> D12
    P3 <--> EXT2

    P4 <--> D3
    P4 <--> D4
    P4 <--> D6
    P4 <--> EXT3
    P4 <--> EXT4
    P4 --> D2

    P5 <--> D3
    P5 <--> D6
    P5 <--> D12
    P5 --> D2

    P6 <--> D1
    P6 --> D2

    P7 <--> D2
```

## 3) Level 2 DFD (Core Decomposition)

```mermaid
flowchart LR
    U[User] --> A1
    U --> A2
    U --> A3
    U --> A4

    subgraph AUTH[1.0 Registration and Login]
      A1((1.1 Validate Input)) --> A2((1.2 Verify User and Role))
      A2 --> A3((1.3 Issue JWT and Session State))
      A3 --> A4((1.4 Forgot Password OTP and Reset))
    end

    subgraph INGEST[2.0 Data Intake and Versioning]
      I1((2.1 Source Selection CSV/API)) --> I2((2.2 Parse and Normalize))
      I2 --> I3((2.3 Apply Mapping Template))
      I3 --> I4((2.4 Clean and Validate Rows))
      I4 --> I5((2.5 Deduplicate Records))
      I5 --> I6((2.6 Persist and Version Snapshot))
      I6 --> I7((2.7 Return Batch Result and Log Activity))
    end

    subgraph ANALYTICS[3.0 Analytics and KPI]
      N1((3.1 Validate Filters)) --> N2((3.2 Load Filtered Records))
      N2 --> N3((3.3 Aggregate Dimensions and Trends))
      N3 --> N4((3.4 Compute KPI Metrics))
      N4 --> N5((3.5 Build Visualization Payload))
    end

    subgraph AI[4.0 AI Query and Insight]
      Q1((4.1 Validate AI Request)) --> Q2((4.2 Build Contextual Prompt))
      Q2 --> Q3((4.3 Route to Python AI or LLM))
      Q3 --> Q4((4.4 Post Process and Safety Checks))
      Q4 --> Q5((4.5 Return Insight and Log Activity))
    end

    subgraph REPORT[5.0 Reporting and Export]
      R1((5.1 Validate Report Request)) --> R2((5.2 Fetch Aggregated Dataset))
      R2 --> R3((5.3 Generate PDF, Excel, or JSON))
      R3 --> R4((5.4 Stream or Render Output))
      R4 --> R5((5.5 Log Report Event))
    end

    D1[(Users)]
    D2[(Activities)]
    D3[(RawSale/Data/ApiData)]
    D4[(KPI)]

    A2 <--> D1
    A4 <--> D1
    A4 --> D2

    I6 <--> D3
    I7 --> D2

    N2 <--> D3
    N4 <--> D4

    Q2 <--> D3
    Q5 --> D2

    R2 <--> D3
    R2 <--> D4
    R5 --> D2
```

## Export Steps

1. Open this file in Markdown preview.
2. Copy each Mermaid block into Mermaid Live Editor for PNG or SVG.
3. Use Context + Level 1 in the main thesis chapter.
4. Put Level 2 in implementation or appendix section.
