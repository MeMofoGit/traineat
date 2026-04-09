import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Diet from './pages/Diet';
import Training from './pages/Training';
import Profile from './pages/Profile';
import Layout from './components/Layout';

import { PlanProvider } from './hooks/usePlan';

function App() {
  return (
    <PlanProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="diet" element={<Diet />} />
            <Route path="training" element={<Training />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </PlanProvider>
  );
}

export default App;
