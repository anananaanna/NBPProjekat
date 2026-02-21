import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../Slices/authSlice';
import { userService } from '../../Services/apiService'; 
import './Profile.css';

const Profile = () => {
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [showSettings, setShowSettings] = useState(false);
    
    const [formData, setFormData] = useState({
        username: user?.user?.username || user?.username || '',
        email: user?.user?.email || user?.email || '',
        newPassword: ''
    });

    const userData = user?.user || user;
    const isVendor = userData?.role === 'vendor';

    const handleLogout = () => {
        dispatch(logout());
        navigate('/');
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        
        try {
            const updateData = {
                userId: userData.id || userData._id,
                newUsername: formData.username,
                newEmail: formData.email,
                newPassword: formData.newPassword || undefined
            };

            await userService.updateUser(updateData);
            
            alert("Profil uspešno ažuriran! Prijavite se ponovo sa novim podacima.");
            handleLogout();
        } catch (err) {
            alert(err.response?.data?.message || "Greška pri ažuriranju.");
        }
    };

    return (
        <div className="profile-minimal-wrapper">
            <div className="profile-content-container">
                <div className="profile-header-minimal">
                    <div className="minimal-avatar">
                        {userData?.username?.charAt(0).toUpperCase()}
                    </div>
                    <h1 className="profile-username">{userData?.username}</h1>
                    <p className="profile-email">{userData?.email}</p>
                    <span className="profile-role-tag">
                        {isVendor ? 'PRODAVAC' : 'KUPAC'}
                    </span>
                </div>

                <div className="profile-actions-main">
                    {isVendor ? (
                        <button className="black-action-btn" onClick={() => navigate('/vendor-dashboard')}>
                            Dashboard Prodavnice
                        </button>
                    ) : (
                        <button className="black-action-btn" onClick={() => navigate('/wishlist')}>
                            Moja Lista Želja
                        </button>
                    )}
                </div>

                <div className="profile-footer-nav">
                    <button className="text-toggle-btn" onClick={() => setShowSettings(!showSettings)}>
                        {showSettings ? 'Zatvori postavke' : 'Izmeni profil'}
                    </button>
                    <button className="text-logout-btn" onClick={handleLogout}>Odjavi se</button>
                </div>

                {showSettings && (
                    <div className="settings-section-minimal">
                        <h3 className="settings-title">Novi podaci</h3>
                        <form className="settings-form-minimal" onSubmit={handleUpdate}>
                            
                            <div className="input-field-minimal">
                                <label>Novo korisničko ime</label>
                                <input 
                                    type="text" 
                                    value={formData.username} 
                                    onChange={(e) => setFormData({...formData, username: e.target.value})} 
                                />
                                <span className="input-underline"></span>
                            </div>

                            <div className="input-field-minimal">
                                <label>Nova email adresa</label>
                                <input 
                                    type="email" 
                                    value={formData.email} 
                                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                                />
                                <span className="input-underline"></span>
                            </div>

                            <div className="input-field-minimal">
                                <label>Nova lozinka (ostavi prazno ako ne menjaš)</label>
                                <input 
                                    type="password" 
                                    placeholder="Unesite novu lozinku"
                                    value={formData.newPassword}
                                    onChange={(e) => setFormData({...formData, newPassword: e.target.value})} 
                                />
                                <span className="input-underline"></span>
                            </div>

                            <button type="submit" className="save-black-btn">Ažuriraj profil</button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;