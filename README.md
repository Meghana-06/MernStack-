# Event Analytics Dashboard for Hosts

A professional web application for event hosts to manage events, track real-time analytics, and monitor attendee interactions with live cursor tracking capabilities.

## 🚀 Features

### 🔐 Authentication & Authorization
- **Secure User Management**: Host registration/login with bcrypt password hashing
- **JWT Authentication**: Secure token-based authentication with role-based access
- **Role Management**: Host and Admin roles with different permissions

### 📅 Event Management
- **CRUD Operations**: Create, read, update, and delete events
- **Event Status Tracking**: Draft, upcoming, ongoing, completed, and cancelled states
- **Comprehensive Event Details**: Venue, tickets, capacity, dates, categories, and more
- **Virtual & Physical Events**: Support for both in-person and online events

### 📊 Analytics Dashboard
- **Real-time Statistics**: Live attendee counts, ticket sales, and revenue tracking
- **Interactive Charts**: Line charts for trends, pie charts for category distribution
- **Advanced Filtering**: Filter events by date, category, location, and status
- **Export Capabilities**: CSV and JSON export for analytics data

### 🖱️ Real-time Cursor Tracking
- **Live User Monitoring**: See attendee mouse movements in real-time
- **Session Analytics**: Track user engagement, interactions, and page views
- **Device Information**: Monitor user devices, browsers, and locations
- **WebSocket Integration**: Real-time updates using Socket.IO

### 🎨 Modern UI/UX
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Dark/Light Mode**: Theme toggle for user preference
- **Professional Components**: Clean, modern interface with Heroicons
- **Real-time Notifications**: Toast notifications for user feedback

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **Socket.IO** for real-time communication
- **JWT** for authentication
- **bcryptjs** for password hashing
- **express-validator** for input validation
- **Helmet.js** for security headers

### Frontend
- **React 18** with modern hooks
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Socket.IO Client** for real-time updates
- **React Router** for navigation
- **React Hook Form** for form management

### Infrastructure
- **Docker** containerization
- **Nginx** reverse proxy
- **MongoDB** database
- **Health checks** and monitoring

## 📁 Project Structure

```
event-analytics-dashboard/
├── backend/                 # Backend Node.js application
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API endpoints
│   ├── middleware/         # Authentication & validation
│   ├── sockets/            # Socket.IO handlers
│   ├── scripts/            # Database seeding
│   └── server.js           # Main server file
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   └── App.js          # Main app component
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
├── docker-compose.yml      # Multi-container setup
├── Dockerfile              # Backend container
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB 6.0+
- Docker and Docker Compose (optional)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd event-analytics-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:6.0
   
   # Or install MongoDB locally
   ```

5. **Seed the database**
   ```bash
   cd backend
   npm run seed
   ```

6. **Start the application**
   ```bash
   # From root directory
   npm run dev
   
   # Or start separately
   npm run server    # Backend on port 5000
   npm run client    # Frontend on port 3000
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Health: http://localhost:5000/health

### Docker Deployment

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d --build
   ```

2. **Access the application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000
   - MongoDB: localhost:27017

3. **View logs**
   ```bash
   docker-compose logs -f
   ```

4. **Stop services**
   ```bash
   docker-compose down
   ```

## 🔑 Demo Accounts

After seeding the database, you can use these demo accounts:

- **Admin User**
  - Email: `admin@eventanalytics.com`
  - Password: `admin123`

- **Host User**
  - Email: `host1@eventanalytics.com`
  - Password: `host123`

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Events
- `GET /api/events` - List events with filtering
- `GET /api/events/:id` - Get single event
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `PUT /api/events/:id/status` - Update event status

### Analytics
- `GET /api/analytics/overview` - Dashboard overview
- `GET /api/analytics/event/:id` - Event-specific analytics
- `GET /api/analytics/events/compare` - Compare multiple events
- `GET /api/analytics/export/:id` - Export analytics data
- `GET /api/analytics/realtime/:id` - Real-time analytics

### Cursor Tracking
- `POST /api/cursor/start-session` - Start tracking session
- `POST /api/cursor/movement` - Log cursor movement
- `POST /api/cursor/interaction` - Log user interactions
- `POST /api/cursor/page-view` - Log page views
- `POST /api/cursor/end-session` - End tracking session

## 🔌 Real-time Features

### Socket.IO Events
- `join-event` - Join event room for real-time updates
- `cursor-move` - Broadcast cursor movements
- `user-interaction` - Track user interactions
- `user-joined` - Notify when users join
- `user-left` - Notify when users leave
- `active-users-update` - Update active user count

### Cursor Tracking
- Real-time mouse movement tracking
- Click and interaction logging
- Page view duration tracking
- Device and location information
- Session management

## 🎯 Key Features

### Event Management
- **Multi-category Support**: Conference, workshop, seminar, concert, exhibition, sports
- **Flexible Scheduling**: Start/end dates with validation
- **Venue Management**: Physical and virtual venue support
- **Ticket System**: Configurable pricing and capacity
- **Status Workflow**: Draft → Upcoming → Ongoing → Completed

### Analytics & Reporting
- **Real-time Dashboard**: Live updates of event metrics
- **Performance Tracking**: Views, registrations, revenue, engagement
- **User Behavior**: Session duration, interactions, cursor patterns
- **Export Options**: CSV and JSON data export
- **Comparative Analysis**: Multi-event performance comparison

### Security Features
- **JWT Authentication**: Secure token-based sessions
- **Password Hashing**: bcrypt with salt rounds
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Configurable cross-origin policies
- **Rate Limiting**: API request throttling
- **Security Headers**: Helmet.js protection

## 🚀 Production Deployment

### Environment Variables
```bash
# Server
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb://your-production-mongodb-uri

# Security
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# CORS
CORS_ORIGIN=https://yourdomain.com
```

### Docker Production
```bash
# Build production images
docker-compose -f docker-compose.prod.yml up -d --build

# Use production environment
docker-compose -f docker-compose.prod.yml -f docker-compose.override.yml up -d
```

### Nginx Configuration
- Reverse proxy for backend API
- Static file serving for frontend
- SSL termination
- Load balancing support

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing
```bash
cd frontend
npm test
```

### API Testing
```bash
# Using curl
curl -X GET http://localhost:5000/api/events \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Using Postman
# Import the provided Postman collection
```

## 📈 Performance & Monitoring

### Database Optimization
- Indexed queries for common operations
- Aggregation pipelines for analytics
- Connection pooling
- Query optimization

### Real-time Performance
- Socket.IO room management
- Event throttling for cursor tracking
- Connection cleanup and monitoring
- Memory leak prevention

### Health Monitoring
- `/health` endpoint for load balancers
- Database connection monitoring
- Socket connection tracking
- Error logging and monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions and ideas

## 🔮 Roadmap

- [ ] Advanced analytics with machine learning
- [ ] Multi-language support
- [ ] Mobile app development
- [ ] Advanced reporting and dashboards
- [ ] Integration with popular event platforms
- [ ] Advanced user segmentation
- [ ] A/B testing capabilities
- [ ] Advanced security features (2FA, SSO)

---

**Built with ❤️ for event organizers and hosts worldwide**