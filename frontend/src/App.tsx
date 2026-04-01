import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { Home } from "./pages/Home";
import { MissionControl } from "./pages/MissionControl";
import { TaskChat } from "./pages/TaskChat";
import { TaskSummary } from "./pages/TaskSummary";
import { PlanningScreen } from "./pages/PlanningScreen";
import { Directory } from "./pages/Directory";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="mission-control/:id" element={<MissionControl />} />
          <Route path="planning" element={<PlanningScreen />} />
          <Route path="chat/:id" element={<TaskChat />} />
          <Route path="summary/:id" element={<TaskSummary />} />
          <Route path="directory" element={<Directory />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
