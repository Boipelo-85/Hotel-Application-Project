import React from 'react';
import Navbar from './components/Navbar';
import { Footer } from './components/Footer';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <AppRoutes />
      </main>
      <Footer />
    </div>
  );
}

export default App;
