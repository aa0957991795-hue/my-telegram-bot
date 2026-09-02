import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import BottomNav from './components/BottomNav.jsx';

import TaskList from './pages/TaskList.jsx';
import TaskDetails from './pages/TaskDetails.jsx';
import CreateOrder from './pages/CreateOrder.jsx';
import MyOrders from './pages/MyOrders.jsx';
import Profile from './pages/Profile.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-ink flex flex-col">
      <Header />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<TaskList />} />
          <Route path="/tasks/:id" element={<TaskDetails />} />
          <Route path="/create" element={<CreateOrder />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>

      <BottomNav />
    </div>
  );
}
