const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event reference is required']
  },
  attendee: {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email'
      ]
    },
    phone: {
      type: String,
      trim: true
    }
  },
  ticketNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  ticketType: {
    type: String,
    enum: ['regular', 'early-bird', 'vip', 'student', 'group', 'complimentary'],
    default: 'regular'
  },
  price: {
    type: Number,
    required: [true, 'Ticket price is required'],
    min: [0, 'Price cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'refunded', 'checked-in'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['credit-card', 'debit-card', 'paypal', 'bank-transfer', 'cash', 'complimentary'],
    default: 'credit-card'
  },
  transactionId: {
    type: String,
    trim: true
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  checkInDate: {
    type: Date,
    default: null
  },
  qrCode: {
    type: String,
    required: true
  },
  specialRequests: {
    type: String,
    maxlength: [500, 'Special requests cannot exceed 500 characters']
  },
  dietaryRestrictions: [{
    type: String,
    enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'halal', 'kosher', 'other']
  }],
  emergencyContact: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    relationship: { type: String, trim: true }
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  refundAmount: {
    type: Number,
    default: 0,
    min: [0, 'Refund amount cannot be negative']
  },
  refundDate: {
    type: Date,
    default: null
  },
  refundReason: {
    type: String,
    maxlength: [200, 'Refund reason cannot exceed 200 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
ticketSchema.virtual('attendeeFullName').get(function() {
  return `${this.attendee.firstName} ${this.attendee.lastName}`;
});

// Indexes for performance
ticketSchema.index({ event: 1, createdAt: -1 });
ticketSchema.index({ 'attendee.email': 1 });
ticketSchema.index({ ticketNumber: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ paymentStatus: 1 });

// Pre-save middleware to generate ticket number and QR code
ticketSchema.pre('save', function(next) {
  if (!this.ticketNumber) {
    // Generate unique ticket number
    const prefix = 'TKT';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.ticketNumber = `${prefix}-${timestamp}-${random}`;
  }
  
  if (!this.qrCode) {
    // Generate QR code data (would be processed by frontend QR library)
    this.qrCode = JSON.stringify({
      ticketNumber: this.ticketNumber,
      eventId: this.event,
      attendeeEmail: this.attendee.email,
      timestamp: Date.now()
    });
  }
  
  next();
});

// Method to check in attendee
ticketSchema.methods.checkIn = function() {
  this.status = 'checked-in';
  this.checkInDate = new Date();
  return this.save();
};

// Method to cancel ticket
ticketSchema.methods.cancel = function(reason = '') {
  this.status = 'cancelled';
  if (reason) this.refundReason = reason;
  return this.save();
};

// Method to process refund
ticketSchema.methods.processRefund = function(amount, reason = '') {
  this.status = 'refunded';
  this.paymentStatus = 'refunded';
  this.refundAmount = amount;
  this.refundDate = new Date();
  this.refundReason = reason;
  return this.save();
};

module.exports = mongoose.model('Ticket', ticketSchema);