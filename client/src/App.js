import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { socket } from './socketClient'; 

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './App.css'; 
import Home from './Models/Home/Home'; 
import Login from './Models/Login/Login';
import Register from './Models/Register/Register';
import Wishlist from './Models/Wishlist/Wishlist';
import Stores from './Models/Stores/Stores'; 
import StoreDetails from './Models/Stores/StoreDetails';
import Profile from './Models/Profile/Profile';
import VendorDashboard from './Models/Vendor/VendorDashboard';
import CreateStore from './Models/Stores/CreateStore';
import Navbar from './Models/Navbar/Navbar'; 
import ManageProduct from './Models/Product/ManageProduct';
import Recommended from './Models/Product/Recommended';
import SaleProduct from './Models/Product/SaleProduct';

function App() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user) {
      const userData = user?.user || user;
      const actualId = userData?.id || userData?._id;

      if (actualId) {
        socket.emit("join", actualId); 
        console.log(`App.js: Korisnik ${actualId} se pridružio sobi.`);
      }
    }

  }, [isAuthenticated, user]);

  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <ToastContainer />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/stores" element={<Stores />} />
            <Route path="/store/:storeId" element={<StoreDetails />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/vendor-dashboard" element={<VendorDashboard />} />
            <Route path="/create-store" element={<CreateStore />} />
            <Route path="/manage-product/:id" element={<ManageProduct />} />
            <Route path="/preporuceno" element={<Recommended />} />
            <Route path="/sale" element={<SaleProduct />} />
          </Routes>
        </main>

        <footer className="global-footer">
          <div className="footer-inner">
            <div className="footer-logo">MyMarket</div>
            <p>&copy; 2026 Sva prava zadržana</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;