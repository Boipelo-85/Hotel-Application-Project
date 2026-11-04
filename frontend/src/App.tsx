import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import Navbar from './components/Navbar';
import { Footer } from './components/Footer';
import AppRoutes from './routes/AppRoutes';
import { getCurrentUser } from './redux/authSlice';
import type { AppDispatch } from './redux/store';

function App() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    void dispatch(getCurrentUser());
  }, [dispatch]);

  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <AppRoutes />
      </main>
      <Footer />
    </div>
  );
}

export default App;
