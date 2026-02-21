import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { storeService, productService } from '../../Services/apiService';
import ProductCard from '../Product/ProductCard';
import { useNavigate } from 'react-router-dom';
import './VendorDashboard.css';

const VendorDashboard = () => {
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const [stores, setStores] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeStoreId, setActiveStoreId] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [showForm, setShowForm] = useState(false);
    const [showProducts, setShowProducts] = useState(false);
    const [showStoreEdit, setShowStoreEdit] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const productsPerPage = 6; // Broj proizvoda po stranici
    
    const [selectedFile, setSelectedFile] = useState(null);
    const [newProduct, setNewProduct] = useState({ name: '', brand: '', price: '', categoryName: '' });
    const [editStoreData, setEditStoreData] = useState({ name: '', city: '', address: '' });

    const userData = user?.user || user;
    const vendorId = userData?.id || userData?._id;

    const fetchStores = async () => {
        try {
            const storesRes = await storeService.getAllStores();
            const myStores = storesRes.data.filter(s => String(s.vendorId) === String(vendorId));
            setStores(myStores);
        } catch (err) { console.error("Greška pri učitavanju prodavnica:", err); }
    };

    useEffect(() => {
        const initDashboard = async () => {
            if (!vendorId) return;
            setLoading(true);
            try {
                await fetchStores();
                const catsRes = await productService.getAllCategories();
                setCategories(catsRes.data || []);
            } catch (err) { console.error(err); } 
            finally { setLoading(false); }
        };
        initDashboard();
    }, [vendorId]);

    const handleViewProducts = async (storeId) => {
        setActiveStoreId(storeId);
        try {
            const res = await storeService.getStoreProducts(storeId);
            setProducts(res.data || []);
            setShowProducts(true);
            setShowForm(false);
            setShowStoreEdit(false);
        } catch (err) { console.error(err); }
    };

    const openAddProduct = (storeId) => {
        setActiveStoreId(storeId);
        setNewProduct({ name: '', brand: '', price: '', categoryName: '' });
        setSelectedFile(null);
        setShowForm(true);
        setShowProducts(false);
        setShowStoreEdit(false);
    };

    const openStoreSettings = (store) => {
        setActiveStoreId(store.id);
        setEditStoreData({ name: store.name, city: store.city, address: store.address });
        setShowStoreEdit(true);
        setShowForm(false);
        setShowProducts(false);
    };

    const handleUpdateStore = async (e) => {
        e.preventDefault();
        try {
            await storeService.updateStore({ id: activeStoreId, ...editStoreData });
            alert("Prodavnica uspešno ažurirana!");
            setShowStoreEdit(false);
            fetchStores();
        } catch (err) { alert("Greška pri ažuriranju."); }
    };

    const handleDeleteStore = async () => {
        if (window.confirm("Obriši prodavnicu i sve proizvode?")) {
            try {
                await storeService.deleteStore(activeStoreId);
                setShowStoreEdit(false);
                fetchStores();
            } catch (err) { alert("Greška pri brisanju."); }
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', newProduct.name);
        formData.append('brand', newProduct.brand);
        formData.append('price', newProduct.price);
        formData.append('categoryName', newProduct.categoryName);
        formData.append('storeId', activeStoreId);
        if (selectedFile) formData.append('image', selectedFile);

        try {
            await productService.createProduct(formData);
            alert("Proizvod dodat!");
            setShowForm(false);
            fetchStores();
        } catch (err) { alert("Greška pri dodavanju!"); }
    };

    if (loading) return <div className="loader-minimal">Učitavanje...</div>;

    return (
        <div className="dashboard-minimal-container">
            <header className="dashboard-header-centered">
                <h1 className="minimal-title">Vendor Dashboard</h1>
                <p className="minimal-subtitle">Upravljajte vašim prodajnim mestima</p>
            </header>

            <div className="stores-grid-minimal">
                {stores.map(store => (
                    <div key={store.id} className="store-card-minimal">
                        <div className="store-card-top">
                            <button className="settings-icon-btn" onClick={() => openStoreSettings(store)} title="Podešavanja">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                </svg>
                            </button>
                            <div className="store-info-side">
                                <h3>{store.name}</h3>
                                <p>{store.city}, {store.address}</p>
                            </div>
                        </div>
                        
                        <div className="store-actions-minimal">
                            <button className="btn-outline-wide" onClick={() => handleViewProducts(store.id)}>
                                📦 Proizvodi
                            </button>
                            <button className="btn-outline-wide" onClick={() => openAddProduct(store.id)}>
                                ✨ Dodaj Artikal
                            </button>
                        </div>
                        <div className="store-card-footer">
                             <span className="count-tag-minimal">{store.productCount || 0} Proizvoda u ponudi</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="centered-footer-action">
                <button className="black-btn-large" onClick={() => navigate('/create-store')}>
                    + Kreiraj Novu Prodavnicu
                </button>
            </div>

            {/* --- MODAL ZA PREGLED PROIZVODA --- */}
            {/* --- MODAL ZA PREGLED PROIZVODA --- */}
{showProducts && (
    <div className="overlay-minimal">
        <div className="modal-content-minimal">
            {/* DODATO/FIKSIRANO X DUGME ZA POVRATAK */}
            <button 
                className="close-modal-minimal" 
                onClick={() => { setShowProducts(false); setCurrentPage(1); }}
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

            <header className="dashboard-header-centered">
                <h2 className="minimal-title" style={{ fontSize: '24px' }}>
                    Proizvodi: {stores.find(s => s.id === activeStoreId)?.name}
                </h2>
                <p className="minimal-subtitle">Pregled zaliha</p>
            </header>

            <div className="modal-products-grid">
                {products.length > 0 ? (
                    products
                        .slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage)
                        .map(p => (
                            <div key={p.id} className="product-manage-wrapper">
                                <ProductCard product={p} />
                                {/* Dugme za brzu izmenu unutar modala */}
                                <button 
                                    className="btn-outline-wide" 
                                    style={{marginTop: '10px', borderTop: '1px solid #eee'}}
                                    onClick={() => navigate(`/manage-product/${p.id}`)}
                                >
                                    Uredi artikal
                                </button>
                            </div>
                        ))
                ) : (
                    <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#888' }}>
                        Nema dostupnih proizvoda za ovu prodavnicu.
                    </p>
                )}
            </div>

            {/* Paginacija */}
            {products.length > productsPerPage && (
                <div className="pagination-minimal">
                    <button 
                        disabled={currentPage === 1} 
                        onClick={() => setCurrentPage(prev => prev - 1)} 
                        className="pager-btn"
                    >
                        ← Nazad
                    </button>
                    <span className="page-info">
                        Stranica <strong>{currentPage}</strong> od {Math.ceil(products.length / productsPerPage)}
                    </span>
                    <button 
                        disabled={currentPage === Math.ceil(products.length / productsPerPage)} 
                        onClick={() => setCurrentPage(prev => prev + 1)} 
                        className="pager-btn"
                    >
                        Napred →
                    </button>
                </div>
            )}
        </div>
    </div>
)}

            {/* --- MODAL ZA DODAVANJE PROIZVODA (Ovo ti je falilo!) --- */}
            {showForm && (
                <div className="overlay-minimal">
                    <div className="modal-content-small">
                        <button className="close-modal-minimal" onClick={() => setShowForm(false)}>✕</button>
                        <h3 className="minimal-title" style={{ fontSize: '20px', marginBottom: '30px' }}>Dodaj novi artikal</h3>
                        <form className="minimal-form" onSubmit={handleAddProduct}>
                            <input type="text" placeholder="Naziv proizvoda" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required />
                            <input type="text" placeholder="Brend" value={newProduct.brand} onChange={e => setNewProduct({...newProduct, brand: e.target.value})} required />
                            <input type="number" placeholder="Cena (RSD)" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} required />
                            
                            <select value={newProduct.categoryName} onChange={e => setNewProduct({...newProduct, categoryName: e.target.value})} required>
                                <option value="">Izaberi kategoriju</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>

                            <div style={{marginTop: '10px'}}>
                                <label className="count-tag-minimal">Slika proizvoda</label>
                                <input type="file" onChange={e => setSelectedFile(e.target.files[0])} style={{border: 'none'}} />
                            </div>

                            <button type="submit" className="black-btn-small" style={{marginTop: '20px'}}>Dodaj u ponudu</button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL ZA PODEŠAVANJA PRODAVNICE --- */}
            {showStoreEdit && (
                <div className="overlay-minimal">
                    <div className="modal-content-small">
                        <button className="close-modal-minimal" onClick={() => setShowStoreEdit(false)}>✕</button>
                        <h3 className="minimal-title" style={{ fontSize: '20px', marginBottom: '30px' }}>Postavke prodavnice</h3>
                        <form className="minimal-form" onSubmit={handleUpdateStore}>
                            <label className="count-tag-minimal">Naziv</label>
                            <input type="text" value={editStoreData.name} onChange={e => setEditStoreData({...editStoreData, name: e.target.value})} required />
                            <label className="count-tag-minimal">Grad</label>
                            <input type="text" value={editStoreData.city} onChange={e => setEditStoreData({...editStoreData, city: e.target.value})} required />
                            <label className="count-tag-minimal">Adresa</label>
                            <input type="text" value={editStoreData.address} onChange={e => setEditStoreData({...editStoreData, address: e.target.value})} required />
                            
                            <div className="form-actions-row">
                                <button type="submit" className="black-btn-small">Sačuvaj</button>
                                <button type="button" className="btn-outline-red" onClick={handleDeleteStore}>Obriši</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendorDashboard;