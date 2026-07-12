import React, { useState } from 'react';
import { loadSession, clearSession } from './api.js';
import Auth, { ResetPassword } from './Auth.jsx';
import Portal from './Portal.jsx';
import Admin from './Admin.jsx';
import { LegalPage } from './Legal.jsx';

export default function App() {
  const [user, setUser] = useState(() => loadSession());
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get('reset');
  const legal = params.get('page');
  const [showReset, setShowReset] = useState(!!resetToken);

  function logout() { clearSession(); setUser(null); }
  function clearReset() {
    setShowReset(false);
    window.history.replaceState({}, '', window.location.pathname);
  }

  if (legal && ['terms', 'refunds', 'disclaimer'].includes(legal)) return <LegalPage page={legal} />;
  if (showReset && resetToken) return <ResetPassword token={resetToken} onDone={clearReset} />;
  if (!user) return <Auth onAuthed={setUser} />;
  if (user.role === 'admin') return <Admin user={user} onLogout={logout} onUpdated={setUser} />;
  return <Portal user={user} onLogout={logout} onUpdated={setUser} />;
}
