import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Apartment from '../models/Apartment.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import User from '../models/User.js';

dotenv.config({ path: new URL('../../.env', import.meta.url) });

const baseDate = new Date();
const nextDate = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);

const runSeed = async () => {
  await connectDB();

  await Review.deleteMany({});
  await Booking.deleteMany({});
  await Apartment.deleteMany({});
  await User.deleteMany({});

  const admin = await User.create({
    fullName: 'System Admin',
    email: 'admin@apartment.local',
    password: 'Password@123',
    phone: '0900000000',
    role: 'ADMIN'
  });

  const agent = await User.create({
    fullName: 'Alice Agent',
    email: 'agent@apartment.local',
    password: 'Password@123',
    phone: '0900000001',
    role: 'AGENT',
    agentInfo: {
      location: 'Ho Chi Minh City',
      responseRate: 96,
      successDeals: 28,
      availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    }
  });

  const user = await User.create({
    fullName: 'Bob User',
    email: 'user@apartment.local',
    password: 'Password@123',
    phone: '0900000002',
    role: 'USER'
  });

  const apartments = await Apartment.insertMany([
    {
      agentId: agent._id,
      title: 'Riverside 2BR Apartment',
      description: 'Bright 2-bedroom apartment close to city center.',
      transactionType: 'RENT',
      price: 1200,
      area: 78,
      location: {
        city: 'Ho Chi Minh City',
        district: 'District 2',
        address: '12 River Park'
      },
      details: {
        pricePerSqm: 15.3,
        bedrooms: 2,
        bathrooms: 2,
        floorNumber: 12,
        buildingBlock: 'A',
        doorDirection: 'East',
        balconyDirection: 'South',
        furnitureStatus: 'Fully Furnished',
        legalStatus: 'Clear'
      },
      images: ['https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80'],
      status: 'AVAILABLE'
    },
    {
      agentId: agent._id,
      title: 'Urban Studio For Sale',
      description: 'Compact studio with modern design and great amenities.',
      transactionType: 'SALE',
      price: 89000,
      area: 42,
      location: {
        city: 'Ho Chi Minh City',
        district: 'District 7',
        address: '88 Sunrise Avenue'
      },
      details: {
        pricePerSqm: 2119,
        bedrooms: 1,
        bathrooms: 1,
        floorNumber: 18,
        buildingBlock: 'B',
        doorDirection: 'North',
        balconyDirection: 'West',
        furnitureStatus: 'Basic',
        legalStatus: 'Clear'
      },
      images: ['https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80'],
      status: 'AVAILABLE'
    }
  ]);

  user.favorites = [apartments[0]._id];
  await user.save();

  const completedBooking = await Booking.create({
    customerId: user._id,
    agentId: agent._id,
    apartmentId: apartments[0]._id,
    scheduledDate: nextDate,
    scheduledTime: '09:30',
    status: 'COMPLETED',
    customerNote: 'Seed completed booking'
  });

  await Booking.create({
    customerId: user._id,
    agentId: agent._id,
    apartmentId: apartments[1]._id,
    scheduledDate: nextDate,
    scheduledTime: '14:00',
    status: 'PENDING',
    customerNote: 'Seed pending booking'
  });

  await Review.create({
    customerId: user._id,
    agentId: agent._id,
    bookingId: completedBooking._id,
    rating: 5,
    comment: 'Very responsive and professional.'
  });

  console.log('Seed complete');
  console.log('ADMIN  admin@apartment.local / Password@123');
  console.log('AGENT  agent@apartment.local / Password@123');
  console.log('USER   user@apartment.local / Password@123');
  process.exit(0);
};

runSeed().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
