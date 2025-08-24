# 🚀 Event Analytics Dashboard

A professional **Event Analytics Dashboard for Hosts** built with the **MERN stack** (MongoDB, Express.js, React, Node.js) featuring **real-time cursor tracking** and comprehensive attendee interaction analytics.

![Event Analytics Dashboard](https://img.shields.io/badge/MERN-Stack-success?style=for-the-badge)
![Real-time](https://img.shields.io/badge/Real--time-Socket.IO-blue?style=for-the-badge)
![Analytics](https://img.shields.io/badge/Analytics-Recharts-orange?style=for-the-badge)

## ✨ Features

### 🔐 **User Authentication & Authorization**
- Secure user registration and login
- JWT-based authentication with refresh tokens
- Password hashing with bcrypt (12 salt rounds)
- Role-based access control (Host, Admin)
- Password reset functionality

### 📅 **Event Management**
- Complete CRUD operations for events
- Event status tracking: `draft`, `published`, `upcoming`, `ongoing`, `completed`, `cancelled`
- Comprehensive event details: venue, capacity, pricing, categories
- Image uploads and event galleries
- Real-time event status updates

### 📊 **Advanced Analytics Dashboard**
- **Real-time Statistics**: Live attendee count, ticket sales, revenue tracking
- **Interactive Charts**: Line charts, bar charts, pie charts using Recharts
- **Filtering & Sorting**: By date, category, location, status
- **Performance Metrics**: Conversion rates, attendance rates, engagement analytics
- **Export Functionality**: CSV and PDF export capabilities

### 🖱️ **Real-time Cursor Tracking**
- **Live Cursor Positions**: See real-time mouse movements of active users
- **User Identification**: Display user names and avatars with cursors
- **Click Tracking**: Visual click effects and heatmap data
- **Session Analytics**: Track user behavior, page visits, scroll depth
- **WebSocket Integration**: Powered by Socket.IO for real-time communication

### 🎨 **Modern UI/UX**
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark/Light Mode**: Toggle between themes with system preference detection
- **Smooth Animations**: Framer Motion for enhanced user experience
- **Glass Morphism**: Modern design elements with backdrop blur effects
- **Accessibility**: WCAG compliant with proper focus management

### 🔧 **Technical Features**
- **Real-time Notifications**: Toast notifications for user actions
- **Error Handling**: Comprehensive error boundaries and validation
- **Loading States**: Skeleton loaders and progress indicators
- **Form Validation**: React Hook Form with Yup schema validation
- **State Management**: Redux Toolkit for predictable state updates
- **API Integration**: Axios with React Query for efficient data fetching

## 🏗️ **Architecture Overview**

```
event-analytics-dashboard/
├── backend/                 # Node.js + Express API
│   ├── controllers/        # Route handlers
│   ├── middleware/         # Authentication, validation, error handling
│   ├── models/            # MongoDB schemas (User, Event, Ticket, CursorLog)
│   ├── routes/            # API routes
│   ├── sockets/           # Socket.IO handlers for real-time features
│   ├── config/            # Database and environment configuration
│   └── utils/             # Utility functions and helpers
├── frontend/               # React.js application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API service functions
│   │   ├── store/         # Redux store and slices
│   │   ├── styles/        # CSS and Tailwind configurations
│   │   └── utils/         # Frontend utility functions
│   └── public/            # Static assets
└── docs/                  # Documentation and guides
```

## 🚀 **Quick Start**

### Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (v5.0 or higher)
- **npm** or **yarn**

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/event-analytics-dashboard.git
cd event-analytics-dashboard
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Update .env with your configuration
# MONGODB_URI=mongodb://localhost:27017/event-analytics
# JWT_SECRET=your-super-secret-jwt-key-change-in-production
# PORT=5000
# FRONTEND_URL=http://localhost:3000

# Start MongoDB (if running locally)
mongod

# Start the backend server
npm run dev
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory (in a new terminal)
cd frontend

# Install dependencies
npm install

# Start the React development server
npm start
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000 (shows available endpoints)

## 🔧 **Environment Variables**

### Backend (.env)
```env
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/event-analytics

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_REFRESH_EXPIRE=30d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Analytics
ANALYTICS_RETENTION_DAYS=90
```

## 📊 **API Endpoints**

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user profile

### Events
- `GET /api/events` - Get all events (with pagination & filters)
- `GET /api/events/:id` - Get single event
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `GET /api/events/:id/analytics` - Get event analytics

### Analytics
- `GET /api/analytics/dashboard` - Dashboard statistics
- `GET /api/analytics/events/:id` - Event-specific analytics
- `GET /api/analytics/cursor/:eventId` - Cursor tracking data

## 🌐 **Real-time Features**

### Socket.IO Events

**Client to Server:**
- `join-event` - Join event room for real-time updates
- `cursor-move` - Send cursor position updates
- `cursor-click` - Send click events
- `page-scroll` - Track scroll behavior
- `page-visit` - Track page visits

**Server to Client:**
- `user-joined` - New user joined event
- `user-left` - User left event
- `cursor-update` - Real-time cursor positions
- `cursor-click` - Click events from other users
- `notification` - Real-time notifications

## 🎨 **UI Components**

### Dashboard Components
- **StatCard**: Display key metrics with trend indicators
- **EventsChart**: Interactive charts for event analytics
- **CursorHeatmap**: Visual representation of user interactions
- **RealTimeUsers**: Live user activity feed
- **EventsList**: Sortable and filterable events table

### Common Components
- **Navbar**: Navigation with user menu and theme toggle
- **Sidebar**: Collapsible navigation sidebar
- **LoadingSpinner**: Animated loading indicators
- **Modal**: Reusable modal component
- **Button**: Styled button variants
- **FormInput**: Validated form inputs

## 📱 **Responsive Design**

- **Mobile First**: Optimized for mobile devices
- **Breakpoints**: 
  - `xs`: 475px
  - `sm`: 640px
  - `md`: 768px
  - `lg`: 1024px
  - `xl`: 1280px
  - `2xl`: 1536px

## 🔒 **Security Features**

- **JWT Authentication** with secure HTTP-only cookies
- **Password Hashing** with bcrypt (12 salt rounds)
- **Rate Limiting** to prevent abuse
- **CORS Protection** with configurable origins
- **Helmet.js** for security headers
- **Input Validation** with express-validator
- **XSS Protection** with sanitized inputs

## 🚀 **Deployment**

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build individual containers
docker build -t event-analytics-backend ./backend
docker build -t event-analytics-frontend ./frontend
```

### Production Environment

1. **Backend Deployment** (Heroku, AWS, DigitalOcean)
   ```bash
   # Set production environment variables
   export NODE_ENV=production
   export MONGODB_URI=your-production-mongodb-uri
   export JWT_SECRET=your-production-jwt-secret
   
   # Build and start
   npm run build
   npm start
   ```

2. **Frontend Deployment** (Netlify, Vercel, AWS S3)
   ```bash
   # Build for production
   npm run build
   
   # Deploy build folder
   ```

3. **Database Setup**
   - MongoDB Atlas for cloud deployment
   - Local MongoDB for development

## 🧪 **Testing**

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Run all tests
npm run test:all
```

## 📈 **Performance Optimization**

- **Code Splitting**: React.lazy for route-based splitting
- **Image Optimization**: WebP format with fallbacks
- **Bundle Analysis**: webpack-bundle-analyzer
- **Caching**: Redis for session storage (optional)
- **CDN Integration**: Static asset delivery
- **Database Indexing**: Optimized MongoDB queries

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 **Team**

- **Frontend Development**: React.js, Redux, Tailwind CSS
- **Backend Development**: Node.js, Express.js, MongoDB
- **Real-time Features**: Socket.IO implementation
- **UI/UX Design**: Modern dashboard interface
- **DevOps**: Docker, deployment configurations

## 🔗 **Links**

- [Live Demo](https://event-analytics-dashboard.vercel.app)
- [API Documentation](https://event-analytics-api.herokuapp.com)
- [GitHub Repository](https://github.com/yourusername/event-analytics-dashboard)

## 📞 **Support**

For support, email support@event-analytics.com or join our [Discord community](https://discord.gg/event-analytics).

---

**Built with ❤️ using the MERN stack and modern web technologies**