import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import {
  CalendarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  EyeIcon,
  ChartBarIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const { isConnected } = useSocket();
  const [overview, setOverview] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursorPositions, setCursorPositions] = useState([]);
  const [activeUsers, setActiveUsers] = useState(0);

  // Sample data for charts
  const chartData = [
    { name: 'Jan', events: 4, attendees: 120, revenue: 12000 },
    { name: 'Feb', events: 6, attendees: 180, revenue: 18000 },
    { name: 'Mar', events: 8, attendees: 240, revenue: 24000 },
    { name: 'Apr', events: 5, attendees: 150, revenue: 15000 },
    { name: 'May', events: 7, attendees: 210, revenue: 21000 },
    { name: 'Jun', events: 9, attendees: 270, revenue: 27000 },
  ];

  const categoryData = [
    { name: 'Conference', value: 35, color: '#3B82F6' },
    { name: 'Workshop', value: 25, color: '#10B981' },
    { name: 'Seminar', value: 20, color: '#F59E0B' },
    { name: 'Concert', value: 15, color: '#EF4444' },
    { name: 'Other', value: 5, color: '#8B5CF6' },
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch overview analytics
      const overviewResponse = await fetch('/api/analytics/overview', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (overviewResponse.ok) {
        const overviewData = await overviewResponse.json();
        setOverview(overviewData.overview);
        setRecentEvents(overviewData.events.slice(0, 5));
      }

      // Fetch recent events
      const eventsResponse = await fetch('/api/events?limit=5', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setRecentEvents(eventsData.events);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'upcoming':
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      case 'ongoing':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'ongoing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here's what's happening with your events today.
          </p>
        </div>
        <Link
          to="/events/new"
          className="btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Create Event</span>
        </Link>
      </div>

      {/* Connection Status */}
      <div className={`p-4 rounded-lg border ${
        isConnected 
          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
          : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
      }`}>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className={`text-sm font-medium ${
            isConnected ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
          }`}>
            {isConnected ? 'Real-time tracking active' : 'Real-time tracking disconnected'}
          </span>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarIcon className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Events</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {overview?.totalEvents || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Attendees</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {overview?.totalAttendees || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${overview?.totalRevenue?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <EyeIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Views</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {overview?.totalViews?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events Trend Chart */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Events & Revenue Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="events" stroke="#3B82F6" strokeWidth={2} />
              <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Events by Category
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Events */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Recent Events
          </h3>
          <Link
            to="/events"
            className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400"
          >
            View all events →
          </Link>
        </div>
        
        <div className="space-y-4">
          {recentEvents.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center space-x-4">
                {getStatusIcon(event.status)}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {event.title}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(event.startDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(event.status)}`}>
                  {event.status}
                </span>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {event.currentAttendees}/{event.capacity}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {Math.round((event.currentAttendees / event.capacity) * 100)}% full
                  </p>
                </div>
                <Link
                  to={`/events/${event.id}`}
                  className="text-primary-600 hover:text-primary-500 dark:text-primary-400"
                >
                  <ChartBarIcon className="h-5 w-5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Cursor Tracking Demo */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Live Cursor Tracking Demo
        </h3>
        <div className="relative h-64 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border">
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.122 2.122" />
                </svg>
              </div>
              <p className="text-sm font-medium">Move your cursor around this area</p>
              <p className="text-xs text-gray-400 mt-1">
                Real-time tracking will show cursor positions to other users
              </p>
            </div>
          </div>
          
          {/* Cursor positions will be rendered here */}
          {cursorPositions.map((cursor, index) => (
            <div
              key={index}
              className="absolute w-3 h-3 bg-red-500 rounded-full pointer-events-none animate-pulse"
              style={{
                left: cursor.x,
                top: cursor.y,
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}
        </div>
        
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Active users: {activeUsers}</span>
          <span>Connection: {isConnected ? 'Active' : 'Inactive'}</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;