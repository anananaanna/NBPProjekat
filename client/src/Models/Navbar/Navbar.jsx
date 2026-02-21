import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { notificationService } from '../../Services/apiService';
import { socket } from '../../socketClient';
import './Navbar.css';

const Navbar = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useSelector((state) => state.auth);
    const userData = user?.user || user;

    // Provera da li je u pitanju prodavac
    const isVendor = userData?.role === 'vendor';

    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    
    // --- LOGIKA ZA SAKRIVANJE NAVBARA NA SCROLL ---
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const controlNavbar = () => {
            if (window.scrollY > lastScrollY && window.scrollY > 100) { 
                setIsVisible(false); // Skroluješ na dole - sakrij
            } else {
                setIsVisible(true);  // Skroluješ na gore - prikaži
            }
            setLastScrollY(window.scrollY);
        };

        window.addEventListener('scroll', controlNavbar);
        return () => window.removeEventListener('scroll', controlNavbar);
    }, [lastScrollY]);
    // ----------------------------------------------

    const unreadCount = notifications.filter(n => !n.isRead).length;

    useEffect(() => {
        if (isAuthenticated && userData?.id) {
            const userIdStr = userData.id.toString();
            socket.emit("join", userIdStr); 
            socket.emit("join", `user:${userIdStr}`); 

            const handleIncoming = (notif) => {
                const standardized = {
                    id: notif.id || Date.now(),
                    message: notif.message || notif.text,
                    isRead: false,
                    timestamp: notif.timestamp || new Date().toISOString()
                };
                setNotifications(prev => [standardized, ...prev].slice(0, 10));
            };

            socket.on("getNotification", handleIncoming);
            socket.on("discount_notification", handleIncoming);

            return () => {
                socket.off("getNotification", handleIncoming);
                socket.off("discount_notification", handleIncoming);
            };
        }
    }, [isAuthenticated, userData?.id]);

    const handleBellClick = async () => {
        setShowDropdown(!showDropdown);
        if (!showDropdown && unreadCount > 0) {
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            try {
                await notificationService.markAsRead(userData.id);
            } catch (err) { console.error(err); }
        }
    };

    return (
        <nav className={`main-navbar ${isVisible ? 'visible' : 'hidden'}`}>
            {/* GORNJI NIVO */}
            <div className="nav-top">
                <div className="nav-top-left">
                    {/* Prazno za balans */}
                </div>

                <div className="nav-top-center">
                    <h1 onClick={() => navigate('/')} className="logo-text">MYMARKET</h1>
                </div>

                <div className="nav-top-right">
                    {/* OBAVEŠTENJA */}
                    {isAuthenticated && (
                        <div className="nav-icon-only" onClick={handleBellClick}>
                            <div className="icon-wrapper">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                </svg>
                                {unreadCount > 0 && <span className="badge-dot-small"></span>}
                            </div>
                            
                            {showDropdown && (
                                <div className="notif-dropdown" onClick={(e) => e.stopPropagation()}>
                                    <div className="notif-header"><h4>Obaveštenja</h4></div>
                                    <div className="notif-list">
                                        {notifications.length === 0 ? (
                                            <p className="empty-msg">Nema poruka</p>
                                        ) : (
                                            notifications.map(n => (
                                                <div key={n.id} className="notif-item">
                                                    <p>{n.message}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* NALOG / PRIJAVI SE */}
                    <div className="nav-icon-only" onClick={() => navigate(isAuthenticated ? '/profile' : '/login')}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>

                    {/* OMILJENO (WISHLIST) - Prikazuje se samo ako korisnik NIJE prodavac */}
                    {!isVendor && (
                        <div className="nav-icon-only" onClick={() => navigate('/wishlist')}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                        </div>
                    )}
                </div>
            </div>

            {/* DONJI NIVO */}
            <div className="nav-bottom">
                <div className="nav-links-container">
                    <button onClick={() => navigate('/preporuceno')} className="nav-btn">PREPORUČENO ZA TEBE</button>
                    <button onClick={() => navigate('/sale')} className="nav-btn highlight">SNIŽENO</button>
                    <button onClick={() => navigate('/stores')} className="nav-btn">SVE PRODAVNICE</button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;