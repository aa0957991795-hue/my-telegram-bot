import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import BottomNav from './components/BottomNav.jsx';
import SplashScreen from './components/SplashScreen.jsx';

import TaskList from './pages/TaskList.jsx';
import TaskDetails from './pages/TaskDetails.jsx';
import CreateOrder from './pages/CreateOrder.jsx';
import MyOrders from './pages/MyOrders.jsx';
import Profile from './pages/Profile.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // If already shown in this tab session, we can skip or show once
    const alreadyShown = sessionStorage.getItem('gig_splash_shown');
    if (alreadyShown) {
      setShowSplash(false);
    }
  }, []);

  const handleFinishSplash = () => {
    sessionStorage.setItem('gig_splash_shown', 'true');
    setShowSplash(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {showSplash && <SplashScreen onFinish={handleFinishSplash} />}

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