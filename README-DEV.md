# Local Development Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or higher
- XAMPP (for PHP backend)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server on port 6126
npm run dev
```

### Access Application
- **Local URL**: http://localhost:6126
- **Login Page**: http://localhost:6126/login

## 📝 Development Scripts

```bash
# Development server (port 6126)
npm run dev

# Production build
npm run build

# Start production server (port 6126)
npm start

# Lint code
npm run lint
```

## ⚙️ Configuration

### Port Configuration
- **Development**: Port 6126 (configured in `package.json`)
- **Production**: Port 6126 (configured in Docker files)

### Environment Variables
Create a `.env.local` file for local development:

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost/Disposition-system/
NEXT_PUBLIC_COMPLAINTS_API=http://192.168.1.209:6004/callcenterreportdata
NEXT_PUBLIC_ORDERS_API=http://192.168.1.209:5125/api_data
```

## 🔧 XAMPP Setup

1. Make sure XAMPP Apache and MySQL are running
2. PHP files should be in `C:\xampp\htdocs\Disposition-system\`
3. Access PHP directly: http://localhost/Disposition-system/

## 📦 Project Structure

```
Disposition-system/
├── app/                 # Next.js app directory
├── components/          # React components
├── lib/                 # Utilities and API
├── public/              # Static files
└── *.php               # PHP backend files
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Check what's using port 6126
netstat -ano | findstr :6126

# Kill the process (Windows)
taskkill /PID <PID> /F
```

### PHP Backend Not Working
- Check if XAMPP Apache is running
- Verify PHP files are in correct directory
- Check `lib/api.ts` for correct API_BASE_URL

### Database Connection Issues
- Verify SQL Server is accessible at 192.168.1.6:1433
- Verify MySQL is accessible at 192.168.1.209
- Check PHP connection strings in PHP files

