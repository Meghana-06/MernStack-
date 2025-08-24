const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
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
    description: 'Join us for the biggest tech conference of the year featuring keynote speakers, workshops, and networking opportunities.',
    category: 'conference',
    startDate: new Date('2024-06-15T09:00:00Z'),
    endDate: new Date('2024-06-17T18:00:00Z'),
    venue: {
      name: 'Convention Center',
      address: {
        street: '123 Main Street',
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
    tags: ['technology', 'networking', 'workshops'],
    isPublic: true,
    registrationDeadline: new Date('2024-06-10T23:59:59Z'),
    cancellationPolicy: 'Full refund up to 30 days before event',
    refundPolicy: 'Standard refund policy applies',
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
    title: 'Creative Design Workshop',
    description: 'Learn advanced design techniques from industry experts in this hands-on workshop.',
    category: 'workshop',
    startDate: new Date('2024-07-20T10:00:00Z'),
    endDate: new Date('2024-07-20T17:00:00Z'),
    venue: {
      name: 'Design Studio',
      address: {
        street: '456 Creative Avenue',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA'
      },
      coordinates: {
        latitude: 40.7505,
        longitude: -73.9934
      },
      isVirtual: false
    },
    capacity: 50,
    ticketInfo: {
      totalTickets: 50,
      availableTickets: 25,
      price: 199,
      currency: 'USD',
      earlyBirdPrice: 149,
      earlyBirdEndDate: new Date('2024-06-20T23:59:59Z')
    },
    tags: ['design', 'creative', 'workshop'],
    isPublic: true,
    registrationDeadline: new Date('2024-07-15T23:59:59Z'),
    cancellationPolicy: 'Full refund up to 7 days before event',
    refundPolicy: 'Standard refund policy applies',
    contactInfo: {
      email: 'workshop@designstudio.com',
      phone: '+1-555-0201',
      website: 'https://designstudio.com'
    },
    analytics: {
      views: 450,
      registrations: 25,
      revenue: 4975,
      averageSessionDuration: 1200
    }
  },
  {
    title: 'Virtual Marketing Seminar',
    description: 'Digital marketing strategies for the modern business landscape.',
    category: 'seminar',
    startDate: new Date('2024-08-10T14:00:00Z'),
    endDate: new Date('2024-08-10T16:00:00Z'),
    venue: {
      name: 'Virtual Platform',
      address: {
        city: 'Online',
        country: 'Global'
      },
      isVirtual: true,
      virtualUrl: 'https://zoom.us/j/123456789'
    },
    capacity: 200,
    ticketInfo: {
      totalTickets: 200,
      availableTickets: 150,
      price: 99,
      currency: 'USD',
      earlyBirdPrice: 79,
      earlyBirdEndDate: new Date('2024-07-10T23:59:59Z')
    },
    tags: ['marketing', 'digital', 'virtual'],
    isPublic: true,
    registrationDeadline: new Date('2024-08-05T23:59:59Z'),
    cancellationPolicy: 'Full refund up to 24 hours before event',
    refundPolicy: 'Standard refund policy applies',
    contactInfo: {
      email: 'seminar@marketingpro.com',
      phone: '+1-555-0202',
      website: 'https://marketingpro.com'
    },
    analytics: {
      views: 800,
      registrations: 50,
      revenue: 4950,
      averageSessionDuration: 900
    }
  }
];

const sampleCursorLogs = [
  {
    eventId: null, // Will be set after event creation
    userId: 'user123',
    sessionId: 'session123',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    ipAddress: '192.168.1.100',
    cursorData: [
      { x: 100, y: 200, timestamp: new Date(), action: 'move', element: 'body' },
      { x: 150, y: 250, timestamp: new Date(), action: 'click', element: 'button' },
      { x: 200, y: 300, timestamp: new Date(), action: 'move', element: 'div' }
    ],
    pageViews: [
      { page: '/events', timestamp: new Date(), duration: 120 },
      { page: '/event-details', timestamp: new Date(), duration: 300 }
    ],
    interactions: [
      { type: 'button_click', target: 'register-btn', timestamp: new Date(), metadata: { buttonText: 'Register Now' } },
      { type: 'scroll', target: 'page', timestamp: new Date(), metadata: { direction: 'down' } }
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

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/event_analytics');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Seed users
const seedUsers = async () => {
  try {
    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users');

    // Create users
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`Created user: ${user.email}`);
    }

    return createdUsers;
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
};

// Seed events
const seedEvents = async (users) => {
  try {
    // Clear existing events
    await Event.deleteMany({});
    console.log('Cleared existing events');

    // Create events
    const createdEvents = [];
    for (let i = 0; i < sampleEvents.length; i++) {
      const eventData = { ...sampleEvents[i] };
      eventData.host = users[i + 1]._id; // Skip admin user
      
      const event = new Event(eventData);
      await event.save();
      createdEvents.push(event);
      console.log(`Created event: ${event.title}`);
    }

    return createdEvents;
  } catch (error) {
    console.error('Error seeding events:', error);
    throw error;
  }
};

// Seed cursor logs
const seedCursorLogs = async (events) => {
  try {
    // Clear existing cursor logs
    await CursorLog.deleteMany({});
    console.log('Cleared existing cursor logs');

    // Create cursor logs
    for (const event of events) {
      const cursorLogData = { ...sampleCursorLogs[0] };
      cursorLogData.eventId = event._id;
      
      const cursorLog = new CursorLog(cursorLogData);
      await cursorLog.save();
      console.log(`Created cursor log for event: ${event.title}`);
    }
  } catch (error) {
    console.error('Error seeding cursor logs:', error);
    throw error;
  }
};

// Main seeding function
const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');
    
    await connectDB();
    
    const users = await seedUsers();
    const events = await seedEvents(users);
    await seedCursorLogs(events);
    
    console.log('Database seeding completed successfully!');
    console.log(`Created ${users.length} users`);
    console.log(`Created ${events.length} events`);
    console.log('Created sample cursor logs');
    
    process.exit(0);
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };