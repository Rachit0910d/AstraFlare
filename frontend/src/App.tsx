import { useState } from 'react';
import './index.css';
import LandingPage from './pages/LandingPage';
import LiveMap from './pages/LiveMap';
import PredictiveAnalysis from './pages/PredictiveAnalysis';
import Analytics from './pages/Analytics';
import Report from './pages/Report';
import Alert from './pages/Alert';

const App = () => {
  const [currentPage, setCurrentPage] = useState<string>('LandingPage');

  if (currentPage === 'Live Map') {
    return <LiveMap onNavigate={setCurrentPage} />;

  }

  if (currentPage === 'Predictive Analysis') {
    return <PredictiveAnalysis onNavigate={setCurrentPage} />;
  }

  if (currentPage === 'Analytics') {
    return <Analytics onNavigate={setCurrentPage} />;
  }

  if (currentPage === 'Report') {
    return <Report onNavigate={setCurrentPage} />;
  }

  if (currentPage === 'Alert') {
    return <Alert onNavigate={setCurrentPage} />;
  }

  return <LandingPage onNavigate={setCurrentPage} />;
};

export default App;