const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Event = require('../models/Event');
const CursorLog = require('../models/CursorLog');

// Sample data
const sampleUsers = [
  {
    email: 'admin@eventanalytics.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    company: 'Event Analytics Inc.',
    phone: '+1-555-0100'
  },
  {
    email: 'host1@eventanalytics.com',
    password: 'host123',
    firstName: 'John',
    lastName: 'Smith',
    role: 'host',
    company: 'Tech Events Pro',
    phone: '+1-555-0101'
  },
  {
    email: 'host2@eventanalytics.com',
    password: 'host123',
    firstName: 'Sarah',
    lastName: 'Johnson',
    role: 'host',
    company: 'Creative Workshops',
    phone: '+1-555-0102'
  }
];

const sampleEvents = [
  {
    title: 'Tech Conference 2024',
    description: 'Join us for the biggest tech conference of the year featuring industry leaders, innovative workshops, and networking opportunities.',
    category: 'conference',
    startDate: new Date('2024-06-15T09:00:00Z'),
    endDate: new Date('2024-06-17T18:00:00Z'),
    venue: {
      name: 'Tech Convention Center',
      address: {
        street: '123 Innovation Drive',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        country: 'USA'
      },
      coordinates: {
        latitude: 37.7749,
        longitude: -122.4194
      },
      isVirtual: false
    },
    capacity: 500,
    ticketInfo: {
      totalTickets: 500,
      availableTickets: 350,
      price: 299,
      currency: 'USD',
      earlyBirdPrice: 249,
      earlyBirdEndDate: new Date('2024-05-15T23:59:59Z')
    },
    tags: ['technology', 'innovation', 'networking', 'workshops'],
    isPublic: true,
    registrationDeadline: new Date('2024-06-10T23:59:59Z'),
    cancellationPolicy: 'Full refund up to 30 days before event',
    refundPolicy: '90% refund up to 14 days before event',
    contactInfo: {
      email: 'info@techconference.com',
      phone: '+1-555-0200',
      website: 'https://techconference.com'
    },
    socialMedia: {
      facebook: 'https://facebook.com/techconference',
      twitter: 'https://twitter.com/techconference',
      linkedin: 'https://linkedin.com/company/techconference'
    },
    analytics: {
      views: 1250,
      registrations: 150,
      revenue: 44850,
      averageSessionDuration: 1800
    }
  },
  {
    title: 'Web Development Workshop',
    description: 'Learn modern web development techniques including React, Node.js, and MongoDB in this hands-on workshop.',
    category: 'workshop',
    startDate: new Date('2024-07-20T10:00:00Z'),
    endDate: new Date('2024-07-20T17:00:00Z'),
    venue: {
      name: 'Digital Learning Hub',
      address: {
        street: '456 Code Street',
        city: 'Austin',
        state: 'TX',
        zipCode: '73301',
        country: 'USA'
      },
      coordinates: {
        latitude: 30.2672,
        longitude: -97.7431
      },
      isVirtual: true,
      virtualUrl: 'https://zoom.us/j/webdevworkshop'
    },
    capacity: 50,
    ticketInfo: {
      totalTickets: 50,
      availableTickets: 25,
      price: 99,
      currency: 'USD'
    },
    tags: ['web development', 'react', 'nodejs', 'mongodb', 'hands-on'],
    isPublic: true,
    registrationDeadline: new Date('2024-07-15T23:59:59Z'),
    analytics: {
      views: 450,
      registrations: 25,
      revenue: 2475,
      averageSessionDuration: 2700
    }
  },
  {
    title: 'Music Festival 2024',
    description: 'A three-day celebration of music featuring top artists from around the world in multiple genres.',
    category: 'concert',
    startDate: new Date('2024-08-10T16:00:00Z'),
    endDate: new Date('2024-08-12T23:00:00Z'),
    venue: {
      name: 'Central Park Amphitheater',
      address: {
        street: '789 Music Avenue',
        city: 'New York',
        state: 'NY',
        zipCode: '10024',
        country: 'USA'
      },
      coordinates: {
        latitude: 40.7589,
        longitude: -73.9851
      },
      isVirtual: false
    },
    capacity: 1000,
    ticketInfo: {
      totalTickets: 1000,
      availableTickets: 600,
      price: 199,
      currency: 'USD',
      earlyBirdPrice: 149,
      earlyBirdEndDate: new Date('2024-07-01T23:59:59Z')
    },
    tags: ['music', 'festival', 'live performance', 'outdoor'],
    isPublic: true,
    registrationDeadline: new Date('2024-08-05T23:59:59Z'),
    analytics: {
      views: 2100,
      registrations: 400,
      revenue: 79600,
      averageSessionDuration: 1200
    }
  },
  {
    title: 'Business Strategy Seminar',
    description: 'Expert insights on business strategy, market analysis, and competitive positioning for modern businesses.',
    category: 'seminar',
    startDate: new Date('2024-09-05T13:00:00Z'),
    endDate: new Date('2024-09-05T17:00:00Z'),
    venue: {
      name: 'Business Center',
      address: {
        street: '321 Strategy Street',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
        country: 'USA'
      },
      coordinates: {
        latitude: 41.8781,
        longitude: -87.6298
      },
      isVirtual: false
    },
    capacity: 200,
    ticketInfo: {
      totalTickets: 200,
      availableTickets: 150,
      price: 149,
      currency: 'USD'
    },
    tags: ['business', 'strategy', 'marketing', 'leadership'],
    isPublic: true,
    registrationDeadline: new Date('2024-08-30T23:59:59Z'),
    analytics: {
      views: 800,
      registrations: 50,
      revenue: 7450,
      averageSessionDuration: 2400
    }
  }
];

const sampleCursorLogs = [
  {
    eventId: null, // Will be set after events are created
    userId: 'user_001',
    sessionId: 'session_001',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    ipAddress: '192.168.1.100',
    cursorData: [
      { x: 100, y: 200, timestamp: new Date(), action: 'move', element: 'body' },
      { x: 150, y: 250, timestamp: new Date(), action: 'click', element: 'button' },
      { x: 200, y: 300, timestamp: new Date(), action: 'move', element: 'div' }
    ],
    interactions: [
      { type: 'button_click', target: 'register-btn', timestamp: new Date(), metadata: { buttonText: 'Register Now' } },
      { type: 'scroll', target: 'page', timestamp: new Date(), metadata: { direction: 'down' } }
    ],
    pageViews: [
      { page: 'event-details', timestamp: new Date(), duration: 120 },
      { page: 'registration', timestamp: new Date(), duration: 180 }
    ],
    deviceInfo: {
      screenResolution: '1920x1080',
      viewportSize: '1200x800',
      deviceType: 'desktop',
      browser: 'Chrome',
      os: 'Windows'
    },
    location: {
      country: 'USA',
      region: 'California',
      city: 'San Francisco',
      timezone: 'America/Los_Angeles'
    }
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/event_analytics');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Event.deleteMany({});
    await CursorLog.deleteMany({});
    console.log('Cleared existing data');

    // Create users
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`Created user: ${user.email}`);
    }

    // Create events
    const createdEvents = [];
    for (const eventData of sampleEvents) {
      // Assign random host
      const randomHost = createdUsers[Math.floor(Math.random() * createdUsers.length)];
      eventData.host = randomHost._id;
      
      const event = new Event(eventData);
      await event.save();
      createdEvents.push(event);
      console.log(`Created event: ${event.title}`);
    }

    // Create cursor logs
    for (const logData of sampleCursorLogs) {
      // Assign random event
      const randomEvent = createdEvents[Math.floor(Math.random() * createdEvents.length)];
      logData.eventId = randomEvent._id;
      
      const cursorLog = new CursorLog(logData);
      await cursorLog.save();
      console.log(`Created cursor log for event: ${randomEvent.title}`);
    }

    // Create additional cursor logs for variety
    for (let i = 0; i < 20; i++) {
      const randomEvent = createdEvents[Math.floor(Math.random() * createdEvents.length)];
      const randomUser = `user_${String(i + 2).padStart(3, '0')}`;
      
      const cursorLog = new CursorLog({
        eventId: randomEvent._id,
        userId: randomUser,
        sessionId: `session_${String(i + 2).padStart(3, '0')}`,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        ipAddress: `192.168.1.${100 + i}`,
        cursorData: Array.from({ length: Math.floor(Math.random() * 50) + 10 }, (_, j) => ({
          x: Math.floor(Math.random() * 1200),
          y: Math.floor(Math.random() * 800),
          timestamp: new Date(Date.now() - Math.random() * 3600000),
          action: ['move', 'click', 'hover'][Math.floor(Math.random() * 3)],
          element: ['button', 'div', 'link', 'form'][Math.floor(Math.random() * 4)]
        })),
        interactions: Array.from({ length: Math.floor(Math.random() * 10) + 5 }, (_, j) => ({
          type: ['button_click', 'form_submit', 'link_click', 'scroll'][Math.floor(Math.random() * 4)],
          target: `element_${j}`,
          timestamp: new Date(Date.now() - Math.random() * 3600000),
          metadata: { interaction: j }
        })),
        pageViews: [
          { page: 'home', timestamp: new Date(Date.now() - Math.random() * 3600000), duration: Math.floor(Math.random() * 300) + 60 },
          { page: 'event-details', timestamp: new Date(Date.now() - Math.random() * 1800000), duration: Math.floor(Math.random() * 600) + 120 }
        ],
        deviceInfo: {
          screenResolution: ['1920x1080', '1366x768', '1440x900', '2560x1440'][Math.floor(Math.random() * 4)],
          viewportSize: ['1200x800', '1000x600', '1400x900'][Math.floor(Math.random() * 3)],
          deviceType: ['desktop', 'laptop', 'tablet'][Math.floor(Math.random() * 3)],
          browser: ['Chrome', 'Firefox', 'Safari', 'Edge'][Math.floor(Math.random() * 4)],
          os: ['Windows', 'macOS', 'Linux'][Math.floor(Math.random() * 3)]
        },
        location: {
          country: 'USA',
          region: ['California', 'Texas', 'New York', 'Florida'][Math.floor(Math.random() * 4)],
          city: ['San Francisco', 'Austin', 'New York', 'Miami'][Math.floor(Math.random() * 4)],
          timezone: 'America/New_York'
        },
        sessionStart: new Date(Date.now() - Math.random() * 7200000),
        isActive: Math.random() > 0.7 // 30% chance of being active
      });

      if (!cursorLog.isActive) {
        cursorLog.sessionEnd = new Date(cursorLog.sessionStart.getTime() + Math.random() * 3600000);
        cursorLog.totalDuration = Math.floor((cursorLog.sessionEnd - cursorLog.sessionStart) / 1000);
      }

      await cursorLog.save();
    }

    console.log('Database seeded successfully!');
    console.log(`Created ${createdUsers.length} users`);
    console.log(`Created ${createdEvents.length} events`);
    console.log(`Created ${sampleCursorLogs.length + 20} cursor logs`);

    // Display sample login credentials
    console.log('\nSample login credentials:');
    console.log('Admin: admin@eventanalytics.com / admin123');
    console.log('Host 1: host1@eventanalytics.com / host123');
    console.log('Host 2: host2@eventanalytics.com / host123');

  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function
seedDatabase();