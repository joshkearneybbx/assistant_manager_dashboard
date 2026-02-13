import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Performance } from './pages/Performance';
import { Capacity } from './pages/Capacity';
import { Clients } from './pages/Clients';
import { StuckTasks } from './pages/StuckTasks';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/capacity" element={<Capacity />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/stuck-tasks" element={<StuckTasks />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
