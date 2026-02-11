# Budget Dashboard 💰

A **privacy-first, local-only** Budget & Asset Tracking Dashboard built with React + Spring Boot.

## 🌟 Features

### Core Features
- **Net Worth Tracking**: Sum of all assets with real-time valuation
- **Budget Management**: Track income vs expenses with category breakdown
- **Asset Location Finder** ("Where Is It?"): Never forget where you stored valuables
- **Stale Data Reminders**: Get notified when asset information needs updating (30+ days)

### Technical Features
- 🔒 **100% Local**: No external API calls for data storage - all data stays on your device
- 💾 **H2 File Database**: Persistent storage at `~/budgetapp/data/`
- 🌍 **Multi-language**: English + हिंदी (Hindi) support
- 🌙 **Dark Theme**: Black/Red/White palette with light mode toggle
- 💱 **Live Currency Rates**: Via exchangerate.host API
- 📤 **Backup/Export**: Export your data to JSON anytime

## 🏗️ Architecture

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + Tailwind CSS |
| Backend | Java 17 + Spring Boot 3.2 |
| Database | H2 (File-based, persistent) |
| Persistence | `~/budgetapp/data/budget_db` |

## 🚀 Quick Start

### Prerequisites
- Java 17+
- Node.js 18+
- Maven 3.8+

### Run Backend
```bash
cd backend
mvn clean package -DskipTests
java -jar target/budget-backend-0.0.1-SNAPSHOT.jar
```
Backend runs on `http://localhost:8080`

### Run Frontend
```bash
cd frontend
npm install
npm start
```
Frontend runs on `http://localhost:3000`

## 📁 Project Structure

```
budget-dashboard/
├── backend/
│   └── src/main/java/com/pankaj/budgetapp/
│       ├── entity/        # Asset, BudgetItem entities
│       ├── repository/    # JPA repositories
│       ├── service/       # Business logic
│       ├── controller/    # REST API endpoints
│       └── config/        # CORS, WebConfig
├── frontend/
│   └── src/
│       ├── components/    # React components
│       ├── api/           # API service layer
│       ├── contexts/      # Theme context
│       └── locales/       # i18n translations
└── README.md
```

## 🔌 API Endpoints

### Dashboard
- `GET /api/dashboard/summary` - Full dashboard data

### Assets
- `GET /api/assets` - List all assets
- `POST /api/assets` - Create asset
- `PUT /api/assets/{id}` - Update asset
- `DELETE /api/assets/{id}` - Delete asset
- `GET /api/assets/search?query=` - Search assets
- `POST /api/assets/{id}/verify` - Verify asset location
- `GET /api/assets/stale` - Get stale assets (>30 days)
- `GET /api/assets/net-worth` - Calculate total net worth

### Budget
- `GET /api/budget` - List all transactions
- `POST /api/budget` - Create transaction
- `GET /api/budget/summary` - Income/Expense summary
- `GET /api/budget/monthly` - Monthly breakdown

### Notifications
- `GET /api/notifications/reminders` - Get reminder list
- `GET /api/notifications/count` - Get reminder count

### Backup
- `POST /api/backup/export` - Export database to JSON
- `POST /api/backup/import` - Import from JSON
- `GET /api/backup/list` - List backups

## 🎨 Asset Types
- 🏠 LAND, REAL_ESTATE
- 💍 GOLD, JEWELRY
- 🚗 CAR
- 💻 ELECTRONICS
- 📄 DOCUMENTS
- 💵 CASH
- 📦 OTHER

## 🔐 Security & Privacy

- All data stored locally at `~/budgetapp/data/`
- Backend only listens on `127.0.0.1:8080`
- CORS configured for localhost only
- No telemetry or cloud sync
- H2 console available at `/h2-console` (dev only)

## 📋 Database Access (Dev)

H2 Console: `http://localhost:8080/h2-console`
- JDBC URL: `jdbc:h2:file:~/budgetapp/data/budget_db`
- Username: `sa`
- Password: `budgetapp_secure_local`

## License

Copyright (c) 2026 Pankaj. All rights reserved.
