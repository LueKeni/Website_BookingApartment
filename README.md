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

### client/.env

VITE_API_BASE_URL=http://localhost:5000/api

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
- Reviews: /api/reviews/\*
- Users: /api/users/\*

## Notes

- Backend expects MongoDB availability during runtime.
- Default apartment listing endpoint returns AVAILABLE apartments unless `status=ALL` or explicit status is provided.
