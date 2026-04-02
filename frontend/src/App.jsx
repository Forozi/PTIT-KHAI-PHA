import { Routes, Route } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import RecipePage from './pages/RecipePage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<SearchPage />} />
      <Route path="/recipe/:recipeId" element={<RecipePage />} />
    </Routes>
  );
}

export default App;