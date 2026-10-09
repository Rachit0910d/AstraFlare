import { useState } from 'react';
import './index.css';
import LandingPage from './pages/LandingPage';
import LiveMap from './pages/LiveMap';
import PredictiveAnalysis from './pages/PredictiveAnalysis';
import Report from './pages/Report';
import Alert from './pages/Alert';

const App = () => {
  const [currentPage, setCurrentPage] = useState<string>('LandingPage');
  const [selectedIncident, setSelectedIncident] = useState<any>(() => {
    try {
      const saved = sessionStorage.getItem('astraflare_selected_incident');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleNavigate = (page: string, incident?: any) => {
    if (incident) {
      setSelectedIncident(incident);
      try {
        sessionStorage.setItem('astraflare_selected_incident', JSON.stringify(incident));
      } catch {}
    }
    setCurrentPage(page);
  };

  const handleSelectIncident = (incident: any) => {
    setSelectedIncident(incident);
    try {
      sessionStorage.setItem('astraflare_selected_incident', JSON.stringify(incident));
    } catch {}
  };

  if (currentPage === 'Live Map') {
    return <LiveMap onNavigate={handleNavigate} onSelectIncident={handleSelectIncident} />;
  }

  if (currentPage === 'Predictive Analysis') {
    return (
      <PredictiveAnalysis
        onNavigate={handleNavigate}
        selectedIncident={selectedIncident}
        onSelectIncident={handleSelectIncident}
      />
    );
  }


  if (currentPage === 'Report') {
    return <Report onNavigate={handleNavigate} selectedIncident={selectedIncident} />;
  }

  if (currentPage === 'Alert') {
    return <Alert onNavigate={handleNavigate} />;
  }

  return <LandingPage onNavigate={handleNavigate} />;
};

export default App;