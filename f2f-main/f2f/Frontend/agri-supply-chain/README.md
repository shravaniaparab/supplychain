# AgriChain — Farm to Fork Supply Chain Platform

A blockchain-backed agricultural supply chain management system built with React + Vite (frontend) and Django REST Framework (backend).

---

## Recent UI Changes (Latest Update)

### 1. Top Navbar Enhancements
- **Language Switcher**: Globe icon dropdown in every page's navbar. Supports English, Hindi (हिंदी), and Marathi (मराठी). Selected language is persisted in `localStorage`.
- **Dark/Light Mode Toggle**: Sun/Moon icon button on every navbar — both main app (`TopNav`) and admin portal (`AdminLayout`).
- **Settings Button**: Gear icon linking to `/settings` is always visible in the navbar.
- These controls appear on **every stakeholder page** (Farmer, Distributor, Transporter, Retailer, Consumer) and the **Admin portal**.

### 2. Multilingual System (i18next)
- **Library**: `i18next` + `react-i18next`
- **Languages Supported**: English (`en`), Hindi (`hi`), Marathi (`mr`)
- **Architecture**:
  - `src/i18n.js` — i18next configuration with `fallbackLng: 'en'`, localStorage persistence
  - `src/locales/en.json` — English translations
  - `src/locales/hi.json` — Hindi translations (Devanagari script)
  - `src/locales/mr.json` — Marathi translations (Devanagari script)
- **Coverage**: Navbar, Sidebar, Dashboard cards, KYC management, User management, Batch operations, Status badges, Buttons, Toast messages, Form labels, Settings page
- **Number Localization**: `src/hooks/useLocalizedNumber.js` — Uses `Intl.NumberFormat` to render numbers in locale-specific numerals (e.g., `१०` in Hindi/Marathi)
- **Language switching**: Instant UI update, no refresh required. Toast shown in selected language on change.

### 3. Suspend Batch — Reason Field
- The `SuspendModal` component (used across all stakeholder profiles) now requires a **mandatory reason** text field before suspension can be submitted.
- The reason textarea is validated — cannot be empty.
- Applied consistently wherever a Suspend button exists (Farmer Batches, Distributor Inventory, etc.).

### 4. Login Page Dark/Light Mode
- The Login page now **properly applies** dark/light mode styling.
- The `isDark` state is now writable (`setIsDark`) and the root container dynamically applies the `dark` class.
- Toggling mode on the public nav (PublicTopNav) correctly reflects on the login page.

### 5. Admin Portal Fixes
#### View Document (KYC Management)
- Clicking **View Document** now opens a modal viewer — **no file is downloaded**.
- Removed the debug info block that was displaying raw byte metadata.
- Images render inline; PDFs render via `<embed>`; other byte formats show a clean "Document Verified" card.

#### Admin Dashboard
- Stats cards now show **only user-related data**: KYC Pending, Total Users, Approved KYC.
- Added a **Users by Role** breakdown grid (Farmer, Distributor, Transporter, Retailer, Consumer, Admin counts).
- Removed all crop/transaction/blockchain stats from the admin dashboard view.
- Admin dashboard is now fully translated via i18next keys.

#### Admin Layout Dark Mode
- Admin portal sidebar and header now fully support **dark mode** with proper color classes.
- Language switcher and dark mode toggle added to Admin sidebar header (desktop) and mobile header.

---

## Project Structure

```
src/
├── i18n.js                        # i18next configuration
├── locales/
│   ├── en.json                    # English translations
│   ├── hi.json                    # Hindi translations
│   └── mr.json                    # Marathi translations
├── hooks/
│   ├── useDarkMode.js             # Dark mode persistence hook
│   └── useLocalizedNumber.js      # Number localization hook (Intl.NumberFormat)
├── components/
│   ├── layout/
│   │   ├── TopNav.jsx             # Main navbar with lang/dark/settings
│   │   └── PublicTopNav.jsx       # Public pages navbar
│   ├── admin/
│   │   └── AdminLayout.jsx        # Admin portal layout with lang/dark controls
│   └── common/
│       └── SuspendModal.jsx       # Suspend modal with mandatory reason field
├── pages/
│   ├── admin/
│   │   ├── AdminDashboard.jsx     # User-only stats, no crop/tx data
│   │   ├── KYCManagement.jsx      # View document inline (no download)
│   │   └── UserManagement.jsx
│   ├── common/
│   │   └── Settings.jsx           # Language + dark mode settings
│   └── public/
│       └── LoginPage.jsx          # Proper dark/light mode toggle
```

---

## Getting Started

### Frontend
```bash
cd Frontend/agri-supply-chain
npm install
npm run dev
```

### Backend
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

---

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, React Router v6, i18next, Lucide Icons
- **Backend**: Django, Django REST Framework, Web3.py
- **Blockchain**: Ethereum (Ganache local / Sepolia testnet)
- **Database**: SQLite (dev) / PostgreSQL (prod)
