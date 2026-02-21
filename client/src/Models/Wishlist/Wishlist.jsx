import React, { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../Services/apiService';
import ProductCard from '../Product/ProductCard';

const Wishlist = () => {
    const [wishlistItems, setWishlistItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user, isAuthenticated } = useSelector((state) => state.auth);
    const navigate = useNavigate();

    const getCleanId = (item) => {
        if (!item) return null;
        const id = item.id || item._id || item.neo4jId || item.identity;
        if (id && typeof id === 'object' && 'low' in id) return id.low;
        return id;
    };

    const fetchWishlist = useCallback(async () => {
        const userData = user?.user || user;
        const actualUserId = getCleanId(userData);

        if (actualUserId && isAuthenticated) {
            try {
                // Ne gasimo loading ovde da ne bi blicalo, samo povučemo sveže podatke
                const response = await userService.getWishlist(actualUserId);
                const rawData = Array.isArray(response.data) ? response.data : [];
                const cleanedData = rawData.map(item => ({
                    ...item,
                    id: getCleanId(item)
                }));
                setWishlistItems(cleanedData);
                // U Wishlist.jsx, unutar fetchWishlist funkcije, nakon setWishlistItems:
                cleanedData.forEach(item => {
                localStorage.setItem(`wishlist_${item.id}`, 'true');
                });
            } catch (err) {
                console.error("Greška pri učitavanju:", err);
            } finally {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, [user, isAuthenticated]);

    // OVO JE KLJUČ: Osvežava listu svaki put kada se korisnik vrati na ovaj tab
    useEffect(() => {
        fetchWishlist();
        window.addEventListener('focus', fetchWishlist);
        return () => window.removeEventListener('focus', fetchWishlist);
    }, [fetchWishlist]);

    const handleRemove = async (productId) => {
        const userData = user?.user || user;
        const actualUserId = getCleanId(userData);
        try {
            await userService.removeFromWishlist({ userId: actualUserId, productId });
            // Odmah sklanjamo iz stanja
            setWishlistItems(prev => prev.filter(item => String(item.id) !== String(productId)));
        } catch (err) {
            alert("Greška pri brisanju.");
        }
    };

    if (loading) return <div style={styles.loadingText}>UČITAVAM... 🚀</div>;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h2 style={styles.title}>MOJA LISTA ŽELJA ❤️</h2>
                <p style={styles.subtitle}>{wishlistItems.length} proizvoda</p>
            </header>
            <hr style={styles.divider} />
            {wishlistItems.length === 0 ? (
                <div style={styles.emptyState}>
                    <h3>Prazno je... 🛍️</h3>
                    <button onClick={() => navigate('/')} style={styles.shopBtn}>Dodaj nešto</button>
                </div>
            ) : (
                <div style={styles.grid}>
                    {wishlistItems.map(item => (
                        <div key={`wish-${item.id}`} style={styles.gridItem}>
                            <ProductCard product={item} isWishlist={true} onRemove={handleRemove} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const styles = {
    container: { maxWidth: '1200px', margin: '0 auto', padding: '60px 20px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '30px' },
    header: { textAlign: 'center', marginBottom: '30px' },
    title: { fontSize: '1.8rem', fontWeight: 'bold' },
    subtitle: { color: '#666' },
    divider: { border: '0', height: '1px', background: '#eee', marginBottom: '40px' },
    emptyState: { textAlign: 'center', padding: '100px 0' },
    shopBtn: { padding: '12px 30px', background: '#000', color: '#fff', border: 'none', cursor: 'pointer', marginTop: '20px' },
    loadingText: { textAlign: 'center', padding: '100px' }
};

export default Wishlist;