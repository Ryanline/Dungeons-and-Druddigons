import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { SiteLayout } from "./components/SiteLayout";
import { HomePage } from "./pages/HomePage";
import { CharacterCreationPage } from "./pages/CharacterCreationPage";
import { MovesPage } from "./pages/MovesPage";
import { AbilitiesPage } from "./pages/AbilitiesPage";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/character-creation" element={<CharacterCreationPage />} />
          <Route path="/moves" element={<MovesPage />} />
          <Route path="/abilities" element={<AbilitiesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}