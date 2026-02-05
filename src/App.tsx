import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import HomePage from './pages/HomePage';
import UsdPage from './pages/UsdPage';
import JpyPage from './pages/JpyPage';
import TransactionHistoryPage from './pages/TransactionHistoryPage'; // Import new page
import { ThemeProvider } from './contexts/ThemeContext'; // Import ThemeProvider

function App() {
  return (
    <ThemeProvider> {/* Wrap the entire application with ThemeProvider */}
      <BrowserRouter>
        <NavBar />
        <div className="container mt-4">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/usd" element={<UsdPage />} />
            <Route path="/jpy" element={<JpyPage />} />
            <Route path="/history" element={<TransactionHistoryPage />} /> {/* New Route */}
          </Routes>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;