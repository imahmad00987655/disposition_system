# Disposition System - Call Center Management Platform

A comprehensive Customer Relationship Management (CRM) system designed for call centers to manage complaints, customer registrations, orders, and door-to-door service appointments. The system features real-time call integration, automatic customer data matching, and a modern, responsive user interface.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### Core Modules

1. **Complaint Management**
   - Track and manage customer complaints
   - View complaint history and timeline
   - Add comments and dispositions
   - Tag complaints to team members
   - Export complaint data

2. **New Customer Registration**
   - Register new customers with detailed information
   - Track interaction channels (Call, WhatsApp, Facebook, Instagram)
   - Manage customer status and follow-ups

3. **Order Management**
   - View and manage customer orders
   - Track order status
   - Search orders by phone number, order ID, or customer name

4. **Door-to-Door (DDS) Management**
   - Schedule and manage door-to-door service appointments
   - Track appointment status
   - Update delivery status

5. **Team Dashboard** (Manager Access)
   - View team statistics and performance metrics
   - Monitor team activity
   - Analytics and reporting

### Advanced Features

- **Real-time Call Integration**: Automatic popups when calls arrive matching customer data
- **Smart Customer Matching**: Automatically matches incoming calls with existing complaints, customers, orders, and DDS appointments
- **Multi-Popup System**: Handle multiple simultaneous customer interactions with stackable popups
- **Global Search**: Search across all modules (complaints, customers, orders, DDS)
- **Export Functionality**: Export data to Excel and PDF formats
- **Responsive Design**: Fully responsive UI that works on desktop, tablet, and mobile devices
- **Authentication & Authorization**: Role-based access control with department restrictions
- **Database-Driven Comment System**: Dynamic comment types and options managed through database

## 🛠 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **React 18** - UI library
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **TanStack Query** - Data fetching and caching
- **TanStack Table** - Data table component
- **React Hook Form** - Form management
- **Zod** - Schema validation
- **Socket.IO Client** - Real-time communication
- **Lucide React** - Icon library

### Backend
- **PHP** - Server-side scripting
- **SQL Server** - Primary database
- **MySQL** - Secondary database

### Additional Libraries
- **XLSX** - Excel file generation
- **jsPDF** - PDF generation
- **Sonner** - Toast notifications
- **Zustand** - State management

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20.x or higher
- **npm** or **yarn**
- **XAMPP** (for PHP backend and MySQL) or equivalent PHP server
- **SQL Server** (for primary database)
- **Git** (for version control)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/imahmad00987655/disposition_system.git
cd Disposition-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup PHP Backend

1. Ensure XAMPP is installed and running
2. Copy the project to your XAMPP htdocs directory:
   ```bash
   # Windows
   C:\xampp\htdocs\Disposition-system\
   
   # Or use the setup script
   setup-xampp.bat
   ```

3. Configure database connections in PHP files:
   - Update SQL Server connection in PHP files (default: `192.168.1.6:1433`)
   - Update MySQL connection if needed (default: `192.168.1.209`)

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost/Disposition-system/
NEXT_PUBLIC_COMPLAINTS_API=http://192.168.1.209:6004/callcenterreportdata
NEXT_PUBLIC_ORDERS_API=http://192.168.1.209:5125/api_data

# Socket.IO Configuration (if applicable)
NEXT_PUBLIC_SOCKET_URL=your-socket-server-url
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:6126`

## ⚙️ Configuration

### Port Configuration

The application runs on port **6126** by default. You can change this in:

- `package.json` - Update the port in scripts
- `docker-compose.yml` - For Docker deployments

### Database Configuration

Update database connections in PHP files:

- **SQL Server**: Update connection strings in PHP files (e.g., `authenticate_user.php`)
- **MySQL**: Update connection strings for MySQL-based features

### Authentication

The system supports multiple authentication methods:

1. **URL Parameters**: `?user_no=XXX&department=XXX`
2. **Session Storage**: Stores agent information in browser session
3. **Department-based Access**: Restricts access based on department (dds, orders, all)

## 📖 Usage

### Accessing the Application

1. **Login Page**: Navigate to `http://localhost:6126/login`
2. **Direct Access**: Use URL parameters: `http://localhost:6126?user_no=XXX&department=XXX`

### Main Features

#### Complaint Management
- View all complaints in a searchable, sortable table
- Click on a complaint to view details and add dispositions
- Use the disposition form to add comments, tag users, and set timelines
- Export complaint data to Excel or PDF

#### New Customer Registration
- Register new customers with complete information
- Track interaction channels and reasons for calls
- View and manage registered customers

#### Order Management
- View all orders with status tracking
- Search orders by various criteria
- View order details and history

#### Door-to-Door Service
- Manage DDS appointments
- Update appointment status
- Track delivery progress

#### Real-time Call Integration
- When a call arrives, the system automatically:
  - Matches the phone number with existing data
  - Shows popups for matching complaints, customers, orders, or DDS appointments
  - Prompts for new customer registration if no match is found

## 📁 Project Structure

```
Disposition-system/
├── app/                      # Next.js app directory
│   ├── api/                  # API routes
│   ├── login/                # Login page
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main dashboard page
├── components/               # React components
│   ├── modules/              # Feature modules
│   │   ├── ComplaintManagement.tsx
│   │   ├── NewCustomerRegistration.tsx
│   │   ├── OrderManagement.tsx
│   │   ├── DDSManagement.tsx
│   │   ├── TeamDashboard.tsx
│   │   └── DispositionForm.tsx
│   ├── ui/                   # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── DataTable.tsx
│   │   ├── Input.tsx
│   │   └── ...
│   ├── CallPopup.tsx         # Call event popup
│   ├── CustomerDataPopup.tsx
│   ├── DDSDataPopup.tsx
│   ├── OrderDataPopup.tsx
│   └── SocketIOIntegration.tsx
├── lib/                      # Utilities and API
│   ├── api.ts                # API client functions
│   ├── types.ts              # TypeScript type definitions
│   ├── utils.ts              # Utility functions
│   └── export.ts             # Export functionality
├── public/                   # Static files
├── *.php                     # PHP backend files
│   ├── authenticate_user.php
│   ├── fetch_*.php
│   ├── submit_*.php
│   └── ...
├── Dockerfile                # Docker configuration
├── docker-compose.yml        # Docker Compose configuration
├── package.json              # Node.js dependencies
├── tsconfig.json             # TypeScript configuration
├── tailwind.config.js        # Tailwind CSS configuration
└── README.md                 # This file
```

## 🐳 Deployment

### Docker Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed Docker deployment instructions.

#### Quick Docker Setup

```bash
# Using Docker Compose
docker-compose up -d --build

# Access at http://YOUR_SERVER_IP:6126
```

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🔌 API Endpoints

### PHP Backend Endpoints

- `authenticate_user.php` - User authentication
- `fetch_agent_name.php` - Get agent information
- `fetch_complaints.php` - Fetch complaints data
- `fetch_new_customers.php` - Fetch customer data
- `fetch_dds_data.php` - Fetch DDS appointments
- `fetch_team_stats.php` - Fetch team statistics
- `submit_comment.php` - Submit complaint comments
- `submit_new_customer.php` - Submit new customer registration
- `update_dds_status.php` - Update DDS appointment status
- `load_history.php` - Load complaint history

### External APIs

- **Complaints API**: `http://192.168.1.209:6004/callcenterreportdata`
- **Orders API**: `http://192.168.1.209:5125/api_data`

## 🧪 Development

### Available Scripts

```bash
# Development server (port 6126)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Development Guidelines

- Follow TypeScript best practices
- Use functional components with hooks
- Maintain consistent code formatting
- Write meaningful commit messages
- Test changes thoroughly before committing

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Windows - Find process using port 6126
netstat -ano | findstr :6126

# Kill the process
taskkill /PID <PID> /F
```

#### PHP Backend Not Working
- Check if XAMPP Apache is running
- Verify PHP files are in correct directory
- Check `lib/api.ts` for correct API_BASE_URL

#### Database Connection Issues
- Verify SQL Server is accessible
- Check MySQL connection settings
- Verify network connectivity to database servers

#### Socket.IO Connection Issues
- Verify Socket.IO server is running
- Check Socket.IO URL configuration
- Review browser console for connection errors

## 📝 License

This project is proprietary software developed for Master Group of Industries.

## 👥 Contributing

This is a private project. For contributions or issues, please contact the development team.

## 📞 Support

For support and inquiries, please contact:
- **Organization**: Master Group of Industries
- **Brands**: Molty | Celeste | Dura | Superstar | CHF | Chemical | Offisys

---

**© 2025 Master Group of Industries. All rights reserved.**

