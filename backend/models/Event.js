const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Event title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    maxlength: [2000, 'Event description cannot exceed 2000 characters']
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Event host is required']
  },
  category: {
    type: String,
    required: [true, 'Event category is required'],
    enum: ['conference', 'workshop', 'seminar', 'concert', 'exhibition', 'sports', 'other']
  },
  status: {
    type: String,
    enum: ['draft', 'upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'draft'
  },
  startDate: {
    type: Date,
    required: [true, 'Event start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'Event end date is required']
  },
  venue: {
    name: {
      type: String,
      required: [true, 'Venue name is required']
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    isVirtual: {
      type: Boolean,
      default: false
    },
    virtualUrl: String
  },
  ticketInfo: {
    totalTickets: {
      type: Number,
      required: [true, 'Total tickets is required'],
      min: [1, 'Total tickets must be at least 1']
    },
    availableTickets: {
      type: Number,
      required: [true, 'Available tickets is required']
    },
    price: {
      type: Number,
      required: [true, 'Ticket price is required'],
      min: [0, 'Ticket price cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD'
    },
    earlyBirdPrice: Number,
    earlyBirdEndDate: Date
  },
  capacity: {
    type: Number,
    required: [true, 'Event capacity is required'],
    min: [1, 'Event capacity must be at least 1']
  },
  currentAttendees: {
    type: Number,
    default: 0
  },
  tags: [String],
  image: String,
  banner: String,
  isPublic: {
    type: Boolean,
    default: true
  },
  registrationDeadline: Date,
  cancellationPolicy: String,
  refundPolicy: String,
  contactInfo: {
    email: String,
    phone: String,
    website: String
  },
  socialMedia: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String
  },
  analytics: {
    views: { type: Number, default: 0 },
    registrations: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    averageSessionDuration: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
eventSchema.index({ host: 1, status: 1 });
eventSchema.index({ startDate: 1, status: 1 });
eventSchema.index({ category: 1, status: 1 });
eventSchema.index({ 'venue.city': 1, status: 1 });

// Virtual for event duration
eventSchema.virtual('duration').get(function() {
  if (this.startDate && this.endDate) {
    return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Virtual for registration percentage
eventSchema.virtual('registrationPercentage').get(function() {
  if (this.capacity > 0) {
    return Math.round((this.currentAttendees / this.capacity) * 100);
  }
  return 0;
});

// Virtual for days until event
eventSchema.virtual('daysUntilEvent').get(function() {
  if (this.startDate) {
    const now = new Date();
    const diffTime = this.startDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Method to check if event is sold out
eventSchema.methods.isSoldOut = function() {
  return this.currentAttendees >= this.capacity;
};

// Method to check if event is ongoing
eventSchema.methods.isOngoing = function() {
  const now = new Date();
  return this.startDate <= now && this.endDate >= now;
};

// Method to check if event is upcoming
eventSchema.methods.isUpcoming = function() {
  const now = new Date();
  return this.startDate > now;
};

// Method to check if event is completed
eventSchema.methods.isCompleted = function() {
  const now = new Date();
  return this.endDate < now;
};

module.exports = mongoose.model('Event', eventSchema);