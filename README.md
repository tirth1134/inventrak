<p align="center">
  <h1 align="center">🖥️ InvenTrack</h1>
  <p align="center">
    <strong>Modern IT Asset & Subscription Management System</strong>
  </p>
  <p align="center">
    Built with Next.js 16 · Prisma · PostgreSQL · TypeScript
  </p>
</p>

---

## ✨ Overview

**InvenTrack** is a full-stack IT inventory management system designed for organizations to track hardware assets, software subscriptions, employee assignments, and more — all from a single, beautiful dashboard.

Built as an internal tool to replace Excel-based inventory tracking, InvenTrack provides real-time insights, automated alerts, and a modern UI that makes asset management effortless.

## 🚀 Features

### 📊 Dashboard
- Real-time KPI cards (total assets, active subscriptions, alerts)
- Interactive charts powered by Recharts (asset distribution, department breakdown)
- Recent activity feed with audit trail

### 🖥️ Hardware Management
- Full lifecycle tracking: procurement → assignment → maintenance → scrap
- Detailed asset profiles (CPU, RAM, storage, serial numbers, warranty info)
- Accessory tracking per asset
- Vendor management with invoice attachments
- Hardware invoice management with file uploads

### 📦 Software & Subscriptions
- Track all SaaS subscriptions (billing cycle, renewal dates, costs)
- Per-user license assignment
- Encrypted credential storage (AES-256-GCM)
- Invoice management with document uploads
- Multi-currency support

### 👥 Employee Management
- Employee directory with department & designation
- View assets and subscriptions assigned to each employee
- Team lead tracking

### 🗺️ Floor Map
- Visual desk/workstation mapping
- Drag-and-drop desk assignment
- Link desks to employees and assets

### ⚠️ Alerts & Notifications
- Automated warranty expiry alerts
- Subscription renewal reminders
- Low stock warnings
- Email notifications via SMTP (optional)

### 📈 Reports & Analytics
- Asset distribution reports
- Subscription cost analysis
- Department-wise breakdowns
- CSV/Excel export

### ⚙️ Settings
- Company branding (name, logo)
- SMTP configuration
- Alert thresholds
- Admin profile management

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Database** | PostgreSQL 16 |
| **ORM** | Prisma 7 with `@prisma/adapter-pg` |
| **Auth** | NextAuth.js v5 (Credentials provider) |
| **UI Components** | Radix UI + shadcn/ui |
| **Styling** | Tailwind CSS 4 |
| **Charts** | Recharts |
| **Animations** | Framer Motion |
| **Forms** | React Hook Form + Zod validation |
| **Data Tables** | TanStack Table v8 |
| **Icons** | Lucide React |
| **Containerization** | Docker + Docker Compose |

## 📋 Prerequisites

- **Node.js** ≥ 18.x
- **PostgreSQL** 16+ (or use Docker)
- **npm** or **yarn**

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/tirth1134/inventrak.git
cd inventrak
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your database credentials and secrets. See `.env.example` for all available options.

### 4. Set up the database

```bash
# Run migrations
npx prisma migrate dev

# Seed initial data (admin user, departments, etc.)
npm run db:seed
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

### Default Login
- **Email:** `admin@company.com`
- **Password:** `admin123`

> ⚠️ **Change the default credentials immediately in production!**

## 🐳 Docker Deployment

```bash
# Start everything (app + PostgreSQL)
docker compose up -d

# Run migrations inside the container
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run db:seed
```

## 📁 Project Structure

```
inventrak/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login page
│   ├── (dashboard)/        # All dashboard pages
│   │   ├── alerts/         # Alert management
│   │   ├── employees/      # Employee CRUD
│   │   ├── floor-map/      # Visual floor mapping
│   │   ├── hardware/       # Asset management
│   │   ├── reports/        # Analytics & reports
│   │   ├── scrap/          # Scrapped assets
│   │   ├── settings/       # App settings
│   │   ├── stock/          # Stock management
│   │   ├── subscriptions/  # Software subscriptions
│   │   └── vendors/        # Vendor management
│   └── api/                # API routes
├── components/             # React components
│   ├── dashboard/          # Dashboard widgets
│   ├── employees/          # Employee components
│   ├── hardware/           # Hardware forms & tables
│   ├── layout/             # Sidebar, Topbar
│   ├── shared/             # Reusable components
│   ├── subscriptions/      # Subscription components
│   ├── ui/                 # shadcn/ui primitives
│   └── vendors/            # Vendor components
├── lib/                    # Utilities & helpers
│   ├── prisma.ts           # Prisma client singleton
│   ├── auth.ts             # Auth configuration
│   ├── validators.ts       # Zod schemas
│   ├── api.ts              # API client functions
│   ├── crypto.ts           # AES encryption helpers
│   └── mailer.ts           # SMTP email service
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Seed script
├── docker-compose.yml      # Docker orchestration
├── Dockerfile              # Production build
└── package.json
```

## 🔒 Security

- **Authentication**: Session-based auth via NextAuth.js v5
- **Password hashing**: bcrypt with 10 salt rounds
- **Credential encryption**: AES-256-GCM for stored subscription passwords
- **Environment variables**: All secrets stored in `.env` (never committed)
- **Input validation**: Zod schemas on both client and server

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 3001) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed the database |
| `npm run db:reset` | Reset database (⚠️ destructive) |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Tirth Vora**

- GitHub: [@tirth1134](https://github.com/tirth1134)
- LinkedIn: [Your LinkedIn Profile](https://www.linkedin.com/in/tirth-vora-37a0b1333/)

---

<p align="center">
  Made with ❤️ for better IT asset management
</p>
