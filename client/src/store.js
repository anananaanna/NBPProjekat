import { configureStore } from '@reduxjs/toolkit';
// Ovde uvozimo onaj authSlice koji smo napravili
import authReducer from './Slices/authSlice'; 

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // Ovde ćemo kasnije dopisivati ostale (npr. products: productReducer)
  },
});