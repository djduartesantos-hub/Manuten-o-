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

## Theming conventions (Dark/Light)

This project uses theme tokens (CSS variables) + utility classes to ensure every page works in both light and dark mode.

- Prefer these primitives for layout:
   - `theme-bg` (page background)
   - `theme-card` + `theme-border` (cards/sections)
   - `theme-text` + `theme-text-muted` (typography)
   - `btn-primary` / `btn-secondary` (buttons)
   - `input` (inputs/selects/textareas)
- For neutral surfaces/lines, prefer CSS variables:
   - `bg-[color:var(--dash-panel)]`, `bg-[color:var(--dash-surface)]`
   - `border-[color:var(--dash-border)]`
   - `text-[color:var(--dash-text)]`, `text-[color:var(--dash-muted)]`
- Avoid hardcoded neutrals like `bg-white`, `text-gray-*`, `text-slate-*`, `border-slate-*` (these break dark mode).
- Semantic colors (emerald/amber/rose) are OK for status/alerts, but neutral UI should use the theme tokens above.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` if needed (optional):
   ```
   VITE_API_URL=http://localhost:3000/api/t
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Open browser at `http://localhost:5173`

## Available Pages

- **Login** - Authentication page (`/t/demo/login`)
- **Dashboard** - Main dashboard with metrics (`/t/demo/dashboard`)
- **Work Orders** - Order management (`/t/demo/work-orders`)
- **Assets** - Equipment management (`/t/demo/assets`)

## Demo Credentials

- **Tenant (slug)**: demo
- **Login (username or email)**: admin or admin@cmms.com
- **Password**: Admin@123456

Technician demo user:
- **Login (username or email)**: tech or tech@cmms.com
- **Password**: Tech@123456

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
| VITE_API_URL | http://localhost:3000/api/t | Backend API URL |

## License

MIT
