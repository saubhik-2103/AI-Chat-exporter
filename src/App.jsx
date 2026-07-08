import { HashRouter, Routes, Route } from 'react-router-dom';
import PopupPanel from './views/PopupPanel';
import GeminiPreview from './views/geminiPreview';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/popup" element={<PopupPanel />} />
        <Route path="/preview" element={<GeminiPreview />} />
        <Route path="*" element={<PopupPanel />} />
      </Routes>
    </HashRouter>
  );
}

export default App;