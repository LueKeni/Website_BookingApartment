import { Navigate, Route, Routes } from 'react-router-dom';
import Footer from './components/Footer.jsx';
import Navbar from './components/Navbar.jsx';
import AgentProfile from './pages/AgentProfile.jsx';
import ApartmentDetails from './pages/ApartmentDetails.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Home from './pages/Home.jsx';
import Inbox from './pages/Inbox.jsx';
import Login from './pages/Login.jsx';
import MomoReturn from './pages/MomoReturn.jsx';
import RoomTypeListings from './pages/RoomTypeListings.jsx';
import Profile from './pages/Profile.jsx';
import Register from './pages/Register.jsx';

const App = () => {
  return (
    <div className="relative min-h-screen overflow-x-clip text-slate-900">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[-120px] top-[-120px] h-72 w-72 rounded-full bg-orange-200/35 blur-3xl" />
        <div className="absolute bottom-[-90px] right-[-100px] h-72 w-72 rounded-full bg-teal-200/35 blur-3xl" />
      </div>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/apartments/:id" element={<ApartmentDetails />} />
          <Route path="/listings/:roomType" element={<RoomTypeListings />} />
          <Route path="/agents/:id" element={<AgentProfile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/payment/momo/return" element={<MomoReturn />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default App;
