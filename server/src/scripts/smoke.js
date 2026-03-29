const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:5000/api';

const credentials = {
  user: {
    email: process.env.SMOKE_USER_EMAIL || 'user@apartment.local',
    password: process.env.SMOKE_USER_PASSWORD || 'Password@123'
  },
  agent: {
    email: process.env.SMOKE_AGENT_EMAIL || 'agent@apartment.local',
    password: process.env.SMOKE_AGENT_PASSWORD || 'Password@123'
  },
  admin: {
    email: process.env.SMOKE_ADMIN_EMAIL || 'admin@apartment.local',
    password: process.env.SMOKE_ADMIN_PASSWORD || 'Password@123'
  }
};

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof data === 'object' ? data.message : String(data);
    throw new Error(`${response.status} ${path} ${message}`);
  }

  return data;
};

const login = async (role) => {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials[role])
  });
  return data?.data?.token;
};

const run = async () => {
  await request('/health');

  const userToken = await login('user');
  const agentToken = await login('agent');
  const adminToken = await login('admin');

  const apartmentsResponse = await request('/apartments');
  const apartments = apartmentsResponse?.data || [];

  if (apartments.length === 0) {
    throw new Error('No apartments available for smoke checks');
  }

  const apartmentId = apartments[0]._id;

  const bookingPayload = {
    apartmentId,
    scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    scheduledTime: '10:00',
    customerNote: 'Smoke booking'
  };

  const createdBooking = await request('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify(bookingPayload)
  });

  const bookingId = createdBooking?.data?._id;

  if (!bookingId) {
    throw new Error('Booking creation failed in smoke checks');
  }

  await request(`/bookings/${bookingId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${agentToken}` },
    body: JSON.stringify({ status: 'CONFIRMED' })
  });

  await request(`/bookings/${bookingId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${agentToken}` },
    body: JSON.stringify({ status: 'COMPLETED' })
  });

  await request('/reviews', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({ bookingId, rating: 5, comment: 'Smoke review' })
  });

  await request('/users', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  console.log('Smoke test passed');
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
