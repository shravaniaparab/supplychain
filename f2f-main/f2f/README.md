# AgriChain – Agricultural Supply Chain Management System

## Project Overview

AgriChain is a full-stack web application that digitizes and tracks agricultural produce across the entire supply chain — from farm to consumer. The system enforces role-based access for six stakeholder types (Farmer, Transporter, Distributor, Retailer, Consumer, and Admin) and maintains an immutable event log for every state transition a crop batch undergoes.

The system features a **Financial State Machine** that handles payments between stakeholders via manual UPI execution and strict confirmation checkpoints. It also provides **Advanced Analytics** for supply chain performance.

The backend is built with Django REST Framework and exposes a JWT-secured REST API. The frontend is a React/Vite single-page application with Tailwind CSS. Each crop batch has a unique ID and a QR code; consumers can scan the QR or search by batch ID to see the complete supply chain journey, price breakdown, and origin details in real time.

---

## Implemented Features

- **User Registration & JWT Authentication** – Role-specific login with KYC approval gating.
- **KYC Workflow** – Admin approves/rejects stakeholder KYC requests; pending and rejected states shown to users.
- **10-State Batch Lifecycle** – Full state machine from `CREATED` → `SOLD` with ownership transfer at delivery points.
- **Financial State Machine** – UPI-based payment tracking between stakeholders.
- **Batch Locking** – Batches are automatically locked for further progression if payments are pending.
- **Farmer Portal** – Create crop batches, view batch list/status, request transport, and manage payments.
- **Transporter Portal** – Tabbed dashboard for Farmer→Distributor and Distributor→Retailer shipments; earnings tracking.
- **Distributor Portal** – Incoming / Inventory / Outgoing views; Store batch, request onward transport, and split batches.
- **Retailer Portal** – Received / Listed / Sold views; Create retail listing (triggers QR generation).
- **Consumer Portal** – QR/Batch ID search; full transparency report including price breakdown and origin.
- **Public Trace API** – Open endpoint for batch history and transparency.
- **Advanced Analytics** – Interactive charts for earnings, volumes, and status distributions using Recharts.
- **Admin Portal** – System-wide stats, user management, and KYC oversight.

---

## System Architecture

### Backend (Django REST Framework)
- **Location**: `Backend/bsas_supplychain-main/`
- **Pattern**: Monolithic Django project with a single `supplychain` app.
- **Financial Logic**: Strict payment validation in `payment_views.py` and `batch_validators.py`.
- **View Organization**: Role-specific modules (e.g., `farmer_dashboard_views.py`, `distributor_views.py`).
- **Media Files**: QR codes and documents stored in `media/`.

### Frontend (React + Vite)
- **Location**: `Frontend/agri-supply-chain/`
- **State Management**: React Context (`AuthContext`) for auth and user state.
- **Localization**: `react-i18next` with local JSON translations.
- **Routing**: React Router v6 with granular role-based protection.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 18 + Vite 5 |
| Frontend Styling | Tailwind CSS 3 |
| Frontend Analytics | Recharts |
| Frontend Icons | Lucide React |
| Frontend HTTP | Axios |
| Backend Framework | Django 5.x |
| Backend API | Django REST Framework 3.14+ |
| Authentication | djangorestframework-simplejwt |
| Database | SQLite (dev) / PostgreSQL (prod) |

---

## Installation & Setup

### Prerequisites

- **Python** 3.10 or higher
- **Node.js** 18 (LTS) or higher
- **Git**

---

### A. Backend First-Time Setup (Detailed)

This guide assumes you are setting up the project for the first time on a local machine.

#### 1. Navigate to Backend Directory
```powershell
cd Backend\bsas_supplychain-main
```

#### 2. Create Virtual Environment
Isolate the project's Python dependencies:
```powershell
python -m venv .venv
```

#### 3. Activate Virtual Environment
**Windows:**
```powershell
.venv\Scripts\activate
```
**Linux/macOS:**
```bash
source .venv/bin/activate
```

#### 4. Install Dependencies
Install all required Python packages (Django, DRF, JWT, PIL, etc.):
```powershell
pip install -r requirements.txt
```

#### 5. Apply Database Migrations
Create the local database schema:
```powershell
python manage.py migrate
```

#### 6. Seed Initial Data (CRITICAL)
The project requires initial roles and crop categories to function. Run this command to populate the database:
```powershell
python manage.py seed_data
```

#### 7. Create Admin Superuser
Create a user to access the Admin dashboard:
```powershell
python manage.py createsuperuser
```

#### 8. Start Development Server
```powershell
python manage.py runserver
```

---

### B. Frontend Setup

#### 1. Navigate to Frontend Directory
```powershell
cd ..\..\Frontend\agri-supply-chain
```

#### 2. Install Packages
```powershell
npm install
```

#### 3. Start Development Server
```powershell
npm run dev
```

---

---

## Project History & Evolution (February 2026 Stabilization)

AgriChain underwent a major stabilization phase in early 2026 to transition from a mockup-heavy prototype to a production-ready Web2 system.

### Optimization Milestones
- **Stabilized 10-State Lifecycle**: Formalized the state machine with explicit `current_owner` tracking and status-gated transitions.
- **Role-Based Handover**: Implemented bilateral delivery verification where receivers must confirm arrival before ownership transfers.
- **Immutable Event Log**: Every critical state change (Creation, Transport, Listing, Sale) is logged in a `BatchEvent` table to mirror blockchain audit trails.
- **Transition to Real Data**: Removed all hardcoded mock data from the Consumer and Stakeholder portals, connecting them to live API endpoints.
- **Financial Enforcement**: Integrated a financial state machine that locks batch progression until specific payment milestones are met (UPI-based tracking).

---

## Future Roadmap: Blockchain Integration

The system is architected for a **Hybrid Web2/Web3** environment, where the current Django backend serves as a high-performance integration layer.

### Technical Blueprint
- **Network Strategy**: Ethereum Layer 2 (Polygon/Arbitrum) to ensure low gas costs and fast finality.
- **Smart Contract Ecosystem** (Solidity):
    - **AgriToken (ERC-1155)**: Each crop batch as a unique NFT, supporting fractional ownership during batch splits.
    - **SupplyChainMaster**: workflow orchestrator matching current Web2 state machine.
    - **StakeholderRegistry**: On-chain KYC and role management via wallet identities.
    - **PaymentEscrow**: Conditional release of funds upon delivery confirmation.
- **Data Anchoring**: Critical events will be hashed and anchored to the blockchain, providing a "Trustless Traceability" badge for consumers.
- **Decentralized Storage**: Planning to move inspection reports and certificates to IPFS for permanent, unalterable access.

---

## API Reference (Key Endpoints)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login/` | User authentication (JWT) |
| GET | `/api/dashboard/farmer/` | Farmer stats & batch summaries |
| POST | `/api/payments/` | View/declare/settle payments |
| POST | `/api/batch/<id>/bulk-split/` | Split batches (Distributor) |
| POST | `/api/distributor/transport/request-to-retailer/` | Onward transport request |
| GET | `/api/public/trace/<id>/` | Public batch traceability |

---

## Folder Structure

```
f2f/
├── Backend/
│   └── bsas_supplychain-main/       # Django project
│       ├── supplychain/             # Core app
│       │   ├── payment_views.py     # Payment/Financial logic
│       │   ├── models.py            # DB Schema
│       │   ├── serializers.py       # API serializing
│       │   └── management/          # Custom management commands (seed_data)
│       └── manage.py                # Django manager
│
└── Frontend/
    └── agri-supply-chain/           # Vite project
        ├── src/
        │   ├── components/          # Reusable UI components
        │   ├── context/             # Auth & Global state
        │   ├── pages/               # UI Layers (Farmer, Retailer, etc.)
        │   └── services/            # API integration (api.js)
        └── package.json             # Frontend dependencies
```
