# 🏭 CMMS Enterprise - Computerized Maintenance Management System

## 📚 Overview
CMMS Enterprise is a full-stack Computerized Maintenance Management System designed to streamline asset management, work orders, and maintenance planning. The project is built with a modern tech stack and follows best practices for scalability and maintainability.

---

## 📂 Project Structure

```
Manuten-o-/
├── backend/
│   ├── src/
│   │   ├── app.ts                    Express app
│   │   ├── server.ts                 Entry point
│   │   ├── auth/                     JWT utilities
│   │   ├── config/                   Database + Logger
│   │   ├── controllers/              HTTP handlers
│   │   ├── services/                 Business logic
│   │   ├── middlewares/              Auth + Error handling
│   │   ├── routes/                   API routes
│   │   ├── db/                       Database schema
│   │   └── types/                    Type definitions
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── pages/                    React pages
│   │   ├── components/               UI components
│   │   ├── layouts/                  Layout components
│   │   ├── hooks/                    Custom hooks
│   │   ├── context/                  Zustand stores
│   │   ├── services/                 API client
│   │   ├── App.tsx                   Root component
│   │   ├── main.tsx                  Entry point
│   │   └── index.css                 Tailwind styles
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── docs/                             Documentation
├── scripts/                          Setup and utility scripts
├── README.md                         This file
└── .gitignore
```

---

## 🚀 Features

### ✅ Implemented
- **Authentication**: JWT-based login with RBAC middleware.
- **Dashboard**: Metrics and KPIs for maintenance.
- **Work Orders**: CRUD operations for work orders.
- **Asset Management**: Manage equipment and assets.
- **Database**: PostgreSQL with Drizzle ORM.
- **Frontend**: React with Zustand for state management.
- **API**: RESTful API with Express.
- **TypeScript**: Full-stack strict typing.

### 🔄 In Progress
- **Data Seeding**: More comprehensive demo data.
- **Validation**: Zod-based schema validation.
- **Notifications**: Real-time updates.
- **File Uploads**: Asset-related documents.
- **PWA Integration**: Offline capabilities.

---

## 📦 Tech Stack

### Backend
- **Express**: Web framework.
- **Drizzle ORM**: Database abstraction.
- **PostgreSQL**: Relational database.
- **JWT + Bcrypt**: Authentication.
- **Winston**: Logging.

### Frontend
- **React**: UI library.
- **Vite**: Build tool.
- **TailwindCSS**: Styling.
- **Zustand**: State management.
- **React Router**: Routing.

---

## 🛠️ Setup

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with DATABASE_URL
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Testing

### Backend
```bash
cd backend
npm run type-check    # Validate TypeScript
npm run build         # Build for production
npm run dev           # Development server
```

### Frontend
```bash
cd frontend
npm run type-check    # Validate TypeScript
npm run build         # Build for production
npm run dev           # Development server
```

---

## 📊 Statistics

- **Files**: 65+
- **Lines of Code**: 5200+
- **Backend Packages**: 360
- **Frontend Packages**: 277
- **Database Tables**: 17
- **API Endpoints**: 25+
- **React Components**: 30+
- **TypeScript Files**: 100% (strict mode)
- **Compilation Errors**: 0 ✅

---

## 📞 Support & Documentation

- [Project Structure](./docs/ARCHITECTURE/PROJECT_STRUCTURE.md)
- [Development Guide](./docs/ARCHITECTURE/DEVELOPMENT_STATUS.md)
- [Deployment Guide](./docs/ARCHITECTURE/RENDER_DEPLOYMENT.md)
- [API Documentation](./docs/ARCHITECTURE/DOCUMENTATION.md)

---

## 📋 License
MIT
