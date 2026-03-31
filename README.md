# Website Booking Apartment

Real Estate Appointment Booking application built with MERN stack and TailwindCSS.

## Tech Stack

- Backend: Node.js, Express.js, MongoDB, Mongoose, JWT
- Frontend: React (Vite), TailwindCSS, Axios, React Router DOM

## Project Structure

ApartmentBookingProject/

- server/
  - src/
    - config/
    - controllers/
    - middlewares/
    - models/
    - routes/
    - scripts/
    - server.js
  - .env
  - package.json
- client/
  - src/
    - components/
    - context/
    - pages/
    - services/
    - App.jsx
    - main.jsx
  - .env
  - package.json

## Requirements

- Node.js 18+
- MongoDB running locally on default port or custom URI in server/.env

## Environment Variables

### server/.env

PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/apartment_booking
JWT_SECRET=change_this_secret
GOOGLE_CLIENT_ID=your_google_web_client_id
MOMO_PARTNER_CODE=your_momo_partner_code
MOMO_ACCESS_KEY=your_momo_access_key
MOMO_SECRET_KEY=your_momo_secret_key
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_REDIRECT_URL=http://localhost:5173/payment/momo/return
MOMO_IPN_URL=http://localhost:5000/api/payments/momo/ipn
MOMO_REQUEST_TYPE=captureWallet
POINTS_PER_BOOST=1

# Optional: ASP.NET-style MoMo key aliases are also supported
# MomoAPI__MomoApiUrl=https://test-payment.momo.vn/gw_payment/transactionProcessor
# MomoAPI__SecretKey=your_secret_key
# MomoAPI__AccessKey=your_access_key
# MomoAPI__ReturnUrl=http://localhost:5173/payment/momo/return
# MomoAPI__NotifyUrl=http://localhost:5000/api/payments/momo/ipn
# MomoAPI__PartnerCode=MOMO
# MomoAPI__RequestType=captureMoMoWallet

### client/.env

VITE_API_BASE_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_web_client_id

### Google OAuth Setup (Required For Google Login)

If you see a browser error like `The given origin is not allowed for the given client ID`, configure your OAuth client in Google Cloud Console:

1. Go to Google Cloud Console > APIs & Services > Credentials.
2. Open your OAuth 2.0 Client ID (type: Web application).
3. In Authorized JavaScript origins, add your frontend origins, for example:
  - http://localhost:5173
  - http://127.0.0.1:5173
4. Save and wait a few minutes for changes to propagate.
5. Make sure `GOOGLE_CLIENT_ID` (server) and `VITE_GOOGLE_CLIENT_ID` (client) are the same Web client ID.
6. Restart backend and frontend dev servers after env/config changes.

## Install

- Backend: Node.js, Express.js, MongoDB, Mongoose, JWT, Socket.io
- Frontend: React (Vite), TailwindCSS, Axios, React Router DOM, Socket.io Client

1. `cd server && npm install`
2. `cd ../client && npm install`

- Use inbox to chat with users in real time

1. `npm run seed`

This creates test data:

- USER: user@apartment.local / Password@123

### REAL-TIME CHAT

- User can open sticky chatbox on apartment details page
- Conversation is tracked by participants and apartmentId
- Socket.io room per conversationId for real-time messaging
- User and Agent can manage all conversations in Inbox page
- Initial message fetch supports pagination (default 30, max 50)

## Run Application

- Chats: /api/chats/\*

## Chat API

- POST /api/chats/conversations/start
- GET /api/chats/conversations
- GET /api/chats/conversations/:id/messages?page=1&limit=30
- POST /api/chats/conversations/:id/messages

2. `npm run dev`

Terminal 2 (frontend):

1. `cd client`
2. `npm run dev`

Frontend default URL: http://localhost:5173

## Smoke Test API

Start backend first, then from server folder:

1. `npm run smoke`

Optional overrides:

- SMOKE_BASE_URL
- SMOKE_USER_EMAIL
- SMOKE_USER_PASSWORD
- SMOKE_AGENT_EMAIL
- SMOKE_AGENT_PASSWORD
- SMOKE_ADMIN_EMAIL
- SMOKE_ADMIN_PASSWORD

## Implemented Workflows

### Authentication

- Shared login/register flow for USER and AGENT
- JWT token auth
- Role-based UI and API access control

### USER

- Browse/filter apartments
- View apartment details and agent information
- Book appointment
- Manage favorites
- View booking history
- Leave review only after booking is COMPLETED

### AGENT

- View dashboard stats
- Create/manage own listings
- Manage booking requests and status transitions
- Update agent profile and availability days

### ADMIN

- View system overview metrics
- Manage users and ban/unban
- Moderate listings (hide/unhide/delete)

## Backend API Summary

- Auth: /api/auth/\*
- Apartments: /api/apartments/\*
- Bookings: /api/bookings/\*
- Payments: /api/payments/*
- Reviews: /api/reviews/\*
- Users: /api/users/\*

## Notes

- Backend expects MongoDB availability during runtime.
- Default apartment listing endpoint returns AVAILABLE apartments unless `status=ALL` or explicit status is provided.
