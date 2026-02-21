import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { storeService } from '../../Services/apiService';
import { useNavigate } from 'react-router-dom';
import './CreateStore.css';

const CreateStore = () => {
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const userData = user?.user || user;
    const vendorId = userData?.id || userData?._id || userData?.uid;
    const [storeData, setStoreData] = useState({ name: '', address: '', city: '' });
    const [logoFile, setLogoFile] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!vendorId) return alert("Niste ulogovani!");
        const formData = new FormData();
        formData.append('name', storeData.name);
        formData.append('address', storeData.address);
        formData.append('city', storeData.city);
        formData.append('vendorId', vendorId);
        if (logoFile) formData.append('logo', logoFile);

        try {
            await storeService.createStore(formData);
            window.location.href = '/vendor-dashboard';
        } catch (error) { alert("Greška pri kreiranju."); }
    };

    return (
        <div className="auth-container-minimal">
            <div className="auth-box" style={{ position: 'relative' }}>
                {/* DUGME X ZA POVRATAK */}
                <button 
                    className="close-create-store" 
                    onClick={() => navigate('/vendor-dashboard')}
                    style={{ 
                    position: 'absolute', 
                    top: '20px', 
                    right: '20px', 
                    fontSize: '24px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    zIndex: 100
                }}
                >
                    ✕
                </button>
                <h2 className="auth-title">Registracija Prodavnice</h2>
                <form className="auth-form-minimal" onSubmit={handleSubmit}>
                    <div className="input-underlined">
                        <input type="text" name="name" placeholder="Naziv Lokala" onChange={e => setStoreData({...storeData, name: e.target.value})} required />
                        <span className="line"></span>
                    </div>
                    <div className="input-underlined">
                        <input type="text" name="address" placeholder="Adresa" onChange={e => setStoreData({...storeData, address: e.target.value})} required />
                        <span className="line"></span>
                    </div>
                    <div className="input-underlined">
                        <input type="text" name="city" placeholder="Grad" onChange={e => setStoreData({...storeData, city: e.target.value})} required />
                        <span className="line"></span>
                    </div>
                    <div className="file-input-wrapper">
                        <label>Logo Prodavnice</label>
                        <input type="file" onChange={e => setLogoFile(e.target.files[0])} required />
                    </div>
                    <button type="submit" className="btn-black-wide">Pokreni Biznis</button>
                </form>
            </div>
        </div>
    );
};

export default CreateStore;