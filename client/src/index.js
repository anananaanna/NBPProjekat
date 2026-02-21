import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Ovo je tvoja glavna komponenta (nju ćemo sledeću srediti)
import { Provider } from 'react-redux';
import { store } from './store'; // Onaj fajl što smo napravili pre 10 minuta

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);