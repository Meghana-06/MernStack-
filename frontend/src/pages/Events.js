import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'ongoing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Events</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and monitor your events
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search events..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-field sm:w-48"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            className="card hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                {event.title}
              </h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(event.status)}`}>
                {event.status}
              </span>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
              {event.description}
            </p>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date(event.startDate).toLocaleDateString()}
              </div>
              
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {event.venue?.name || 'Virtual Event'}
              </div>
              
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                {event.currentAttendees}/{event.capacity} attendees
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">Revenue: </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ${event.analytics?.revenue?.toLocaleString() || 0}
                </span>
              </div>
              
              <div className="flex space-x-2">
                <Link
                  to={`/events/${event.id}`}
                  className="text-primary-600 hover:text-primary-500 dark:text-primary-400 text-sm font-medium"
                >
                  View
                </Link>
                <Link
                  to={`/events/${event.id}/edit`}
                  className="text-gray-600 hover:text-gray-500 dark:text-gray-400 text-sm font-medium"
                >
                  Edit
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No events found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filters.'
              : 'Get started by creating your first event.'
            }
          </p>
          {!searchTerm && filterStatus === 'all' && (
            <div className="mt-6">
              <Link
                to="/events/new"
                className="btn-primary inline-flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Event
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Events;