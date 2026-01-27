# CMMS Enterprise Frontend

Enterprise Computerized Maintenance Management System (CMMS) - Frontend Application

## Features

- 🎨 Modern, responsive UI with Tailwind CSS
- 📱 Mobile-first design
- 🔐 Protected routes with role-based access
- 📊 Dashboard with KPIs and metrics
- 🔄 Real-time data updates
- ⚡ Fast and optimized with Vite

## Tech Stack

- React 18
- TypeScript
- Vite
- TailwindCSS
- Zustand (State Management)
- React Router

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` if needed (optional):
   ```
   VITE_API_URL=http://localhost:3000/api
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Open browser at `http://localhost:5173`

## Available Pages

- **Login** - Authentication page (`/login`)
- **Dashboard** - Main dashboard with metrics (`/dashboard`)
- **Work Orders** - Order management (`/work-orders`)
- **Assets** - Equipment management (`/assets`)

## Demo Credentials

- **Empresa (ID)**: cmms-demo
- **Email**: admin@cmms.com
- **Senha**: Admin@123456

## Development

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run type-check` - TypeScript check
- `npm run lint` - Lint code

## Building for Production

```bash
npm run build
npm run preview
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| VITE_API_URL | http://localhost:3000/api | Backend API URL |

## License

MIT
