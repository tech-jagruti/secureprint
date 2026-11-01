import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import ShopPage from './pages/ShopPage.jsx';
import UploadPage from './pages/UploadPage.jsx';

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <path d="M5 2h11l5 5v17H5z" fill="#0F1B2D" />
      <path d="M16 2l5 5h-5z" fill="#D81B6A" />
      <circle cx="13" cy="14" r="2.6" fill="#fff" />
      <rect x="12.1" y="14.5" width="1.8" height="5" rx=".9" fill="#fff" />
    </svg>
  );
}

export default function App() {
  return (
    <>
      <header className="site-header">
        <NavLink to="/" className="brand">
          <Logo />
          <span>SecurePrint</span>
        </NavLink>
        <nav>
          <NavLink to="/" end>
            Send a file
          </NavLink>
          <NavLink to="/shop">Print shop</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
