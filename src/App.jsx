import React from 'react';
import Login from './pages/Login';
import Profile from './pages/Profile';

export default function App() {
  // semplice routing condizionale per ora
  const [user, setUser] = React.useState(null);
  return user ? <Profile user={user} /> : <Login onLogin={setUser} />;
}
