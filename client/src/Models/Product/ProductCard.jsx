import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { userService, storeService } from '../../Services/apiService'; 

const ProductCard = ({ product, isWishlist, onRemove, showStore }) => {
    const { user, isAuthenticated } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const location = useLocation();
    const isInitialMount = useRef(true); 
    
    const [storeName, setStoreName] = useState("");
    const [isHovered, setIsHovered] = useState(false);

    const getCleanId = (item) => {
        if (!item) return null;
        const id = item.id || item._id || item.neo4jId || item.identity;
        if (id && typeof id === 'object' && 'low' in id) return id.low;
        return id;
    };

    const actualUserId = getCleanId(user?.user || user);
    const actualProductId = getCleanId(product);

    const [isInWishlistLocal, setIsInWishlistLocal] = useState(() => {
        if (isWishlist) return true;
        const saved = localStorage.getItem(`wishlist_${actualProductId}`);
        return saved === 'true';
    });

    useEffect(() => {
        const checkStatus = async () => {
            if (isAuthenticated && actualUserId && actualProductId) {
                try {
                    const res = await userService.getWishlist(actualUserId);
                    const list = Array.isArray(res.data) ? res.data : [];
                    const found = list.some(item => String(getCleanId(item)) === String(actualProductId));
                    
                    setIsInWishlistLocal(found);
                    localStorage.setItem(`wishlist_${actualProductId}`, found);
                } catch (err) {
                    console.error("Greška pri proveri statusa:", err);
                }
            }
        };
        checkStatus();
    }, [actualProductId, actualUserId, isAuthenticated]);

    const handleWishlistAction = async (e) => {
        e.preventDefault();
        e.stopPropagation(); 

        if (!isAuthenticated) {
            alert("Moraš se prijaviti!");
            navigate('/login');
            return;
        }

        const requestData = { userId: actualUserId, productId: actualProductId };
        const wasInWishlist = isInWishlistLocal;

        setIsInWishlistLocal(!wasInWishlist);
        localStorage.setItem(`wishlist_${actualProductId}`, !wasInWishlist);

        try {
            if (wasInWishlist) {
                await userService.removeFromWishlist(requestData);
                localStorage.removeItem(`wishlist_${actualProductId}`);
                if (onRemove) onRemove(actualProductId);
            } else {
                await userService.addToWishlist(requestData);
            }
        } catch (err) {
            setIsInWishlistLocal(wasInWishlist);
            localStorage.setItem(`wishlist_${actualProductId}`, wasInWishlist);
            console.error("Greška u komunikaciji sa bazom:", err);
        }
    };

    return (
        <div 
            style={{...styles.card, ...(isHovered ? styles.cardHover : {})}}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => navigate(`/product/${actualProductId}`)}
        >
            <div style={styles.imageContainer}>
                {/* POPRAVLJEN BADGE: Koristi discountPrice kao u starom kodu */}
                {product.discountPrice && (
                    <div style={styles.badge}>
                        -{Math.round((1 - product.discountPrice / product.price) * 100)}%
                    </div>
                )}

                <img 
                    src={`http://localhost:3001/uploads/${product.image}`} 
                    alt={product.name} 
                    style={{...styles.image, transform: isHovered ? 'scale(1.08)' : 'scale(1)'}}
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/300x400'; }} 
                />
                
                {(user?.user?.role !== 'vendor' && user?.role !== 'vendor') && (
                    <button onClick={handleWishlistAction} style={styles.wishlistIconBtn}>
                        <svg width="22" height="22" viewBox="0 0 24 24" 
                             fill={isInWishlistLocal ? "#ff4757" : "none"} 
                             stroke={isInWishlistLocal ? "#ff4757" : "#000"} 
                             strokeWidth="1.5">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                    </button>
                )}
            </div>
            
            <div style={styles.content}>
                {/* PRIKAZ BRENDA: Kao u starom kodu */}
                <p style={styles.brand}>{product.brand || "Nepoznat brend"}</p>
                
                <h3 style={styles.title}>{product.name}</h3>
                
                <div style={styles.priceContainer}>
                    {/* POPRAVLJENE CENE: Koristi discountPrice */}
                    {product.discountPrice ? (
                        <>
                            <span style={styles.newPrice}>{product.discountPrice} RSD</span>
                            <span style={styles.oldPrice}>{product.price} RSD</span>
                        </>
                    ) : (
                        <span style={styles.regularPrice}>{product.price} RSD</span>
                    )}
                </div>
            </div>
        </div>
    );
};

const styles = {
    card: { background: '#fff', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', cursor: 'pointer', padding: '10px', transition: 'all 0.4s ease' },
    cardHover: { transform: 'translateY(-8px)', boxShadow: '0 12px 24px rgba(0,0,0,0.06)' },
    imageContainer: { position: 'relative', aspectRatio: '3 / 4', backgroundColor: '#f8f8f8', overflow: 'hidden', marginBottom: '14px' },
    image: { width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s ease' },
    badge: { position: 'absolute', top: '10px', left: '10px', background: '#ff4757', color: 'white', padding: '4px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold', zIndex: 5 },
    wishlistIconBtn: { position: 'absolute', top: '12px', right: '12px', background: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 2px 5px rgba(0,0,0,0.1)' },
    content: { padding: '0 2px' },
    brand: { fontSize: '11px', color: '#718096', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' },
    title: { fontSize: '14px', fontWeight: '500', margin: '0 0 8px 0', color: '#2d3748' },
    priceContainer: { display: 'flex', alignItems: 'baseline', gap: '8px' },
    regularPrice: { fontWeight: '800', fontSize: '16px', color: '#2d3748' },
    newPrice: { color: '#ff4757', fontWeight: '800', fontSize: '16px' },
    oldPrice: { textDecoration: 'line-through', color: '#a0aec0', fontSize: '12px' }
};

export default ProductCard;