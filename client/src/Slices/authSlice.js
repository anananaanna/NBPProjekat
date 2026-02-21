import { createSlice } from '@reduxjs/toolkit';

// Proveravamo da li u browseru već postoji sačuvan korisnik
const savedUser = JSON.parse(localStorage.getItem('user'));

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: savedUser || null,
    isAuthenticated: !!savedUser,
  },
  reducers: {
    loginSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload;
      // Čuvamo ga u browseru da se ne obriše na refresh
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      localStorage.removeItem('user');
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;