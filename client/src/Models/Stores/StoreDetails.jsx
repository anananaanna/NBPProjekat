import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { storeService, userService, ratingService, commentService } from '../../Services/apiService';
import ProductCard from '../Product/ProductCard';

const StoreDetails = () => {
    const { storeId } = useParams();
    const { user, isAuthenticated } = useSelector((state) => state.auth);
    
    const userData = user?.user || user;
    const userId = userData?.id || userData?._id;
    const currentUserName = userData?.username;
    const isVendor = userData?.role === 'vendor';

    const [store, setStore] = useState(null);
    const [categories, setCategories] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedCategory, setSelectedCategory] = useState('Sve');
    const [searchTerm, setSearchTerm] = useState('');
    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState(200000);
    const [sortOption, setSortOption] = useState('none');
    const [filterBrand, setFilterBrand] = useState('All');

    const [averageRating, setAverageRating] = useState(0);
    const [ratingCount, setRatingCount] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);
    const [comments, setComments] = useState([]);
    
    const [userRating, setUserRating] = useState(5);
    const [userComment, setUserComment] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const productsPerPage = 20;

    const IMAGE_BASE_URL = "http://localhost:3001/uploads/";

    useEffect(() => {
    const loadAllStoreData = async () => {
        if (!storeId) return;
        try {
            setLoading(true);
            console.log("--- START LOADING DATA ---");
             console.log("Current UserID:", userId);
            // Dodajemo i rejting u Promise.allSettled
            const [storeRes, catRes, prodRes, commRes, userRatingRes] = await Promise.allSettled([
                storeService.getStoreById(storeId, userId),
                storeService.getStoreCategories(storeId),
                storeService.getStoreProducts(storeId),
                storeService.getStoreComments(storeId),
                // Ako je korisnik ulogovan, vučemo njegovu ocenu
                (isAuthenticated && userId) ? ratingService.getUserRating(userId, storeId) : Promise.reject('Not auth')
            ]);

            if (storeRes.status === 'fulfilled' && storeRes.value.data) {

                const storeData = storeRes.value.data;
                setStore(storeData);
                setAverageRating(Number(storeData.averageRating) || 0);
                setRatingCount(Number(storeData.ratingCount) || 0);
                setIsFollowing(!!storeData.isFollowing);
            }
            
            // NOVO: Postavljanje userRating-a iz baze
            if (userRatingRes.status === 'fulfilled' && userRatingRes.value.data) {
                console.log("API RATING SUCCESS:", userRatingRes.value.data);
                const scoreFromDb = userRatingRes.value.data.score || userRatingRes.value.data.rating;
                console.log("Extracted Score:", scoreFromDb);
                if (scoreFromDb !== undefined) {
                        setUserRating(Number(scoreFromDb));
                    }
                } else {
                    console.log("API RATING REJECTED/MISSING:", userRatingRes.reason);
                }
        

            if (catRes.status === 'fulfilled') setCategories(catRes.value.data || []);
            if (prodRes.status === 'fulfilled') setAllProducts(prodRes.value.data || []);
            if (commRes.status === 'fulfilled') {
                    console.log("API COMMENTS SUCCESS:", commRes.value.data.length, "comments found");
                    setComments(commRes.value.data || []);
                }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };
    loadAllStoreData();
}, [storeId, userId, isAuthenticated]);

    const loadFeedback = async () => {
        const [storeRes, commRes] = await Promise.allSettled([
            storeService.getStoreById(storeId, userId),
            storeService.getStoreComments(storeId)
        ]);
        if (storeRes.status === 'fulfilled' && storeRes.value.data) {
            const data = storeRes.value.data;
            setStore(data);
            setAverageRating(Number(data.averageRating) || 0);
            setRatingCount(Number(data.ratingCount) || 0);
        }
        if (commRes.status === 'fulfilled') setComments(commRes.value.data || []);
    };

    // --- LOGIKA ZA RECENZIJE ---
    const myReview = useMemo(() => {
    if (!comments || !currentUserName) return null;

    // 1. Nađi komentar
    const comment = comments.find(c => 
        (c.username === currentUserName || c.user === currentUserName || c.author === currentUserName)
    );

    if (!comment) return null;

    // 2. Pošto su modeli odvojeni, komentar verovatno nema polje 'score'.
    // Uzimamo 'userRating' iz state-a (koji se puni pri učitavanju ili menjanju)
    return {
        ...comment,
        score: userRating // Ovde koristimo lokalni state koji drži vrednost iz Rating modela
    };
}, [comments, currentUserName, userRating]);


    const otherComments = useMemo(() => {
        if (!comments) return [];
        if (!currentUserName) return comments;
        return comments.filter(c => c.username !== currentUserName && c.user !== currentUserName && c.author !== currentUserName);
    }, [comments, currentUserName]);

    console.log("Komentari:", comments);
    console.log("MyReview:", myReview);
    // ---------------------------

    const filteredProducts = useMemo(() => {
        let temp = [...allProducts];
        if (selectedCategory !== 'Sve') {
            temp = temp.filter(p => (p.category?.name || p.category) === selectedCategory);
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            temp = temp.filter(p => p.name.toLowerCase().includes(term) || p.brand?.toLowerCase().includes(term));
        }
        if (filterBrand !== 'All') temp = temp.filter(p => p.brand === filterBrand);
        temp = temp.filter(p => {
            const price = p.discountPrice || p.price;
            return price >= minPrice && price <= maxPrice;
        });
        if (sortOption === 'priceAsc') temp.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
        else if (sortOption === 'priceDesc') temp.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
        return temp;
    }, [allProducts, selectedCategory, searchTerm, filterBrand, minPrice, maxPrice, sortOption]);

    const currentProducts = filteredProducts.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage);
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

    const handleFollow = async () => {
        if (!isAuthenticated) return alert("Moraš biti ulogovan!");
        try {
            const res = await userService.followStore({ userId, storeId });
            setIsFollowing(res.data.isFollowing);
            await loadFeedback();
        } catch (err) { console.error(err); }
    };

    const handleSubmitReview = async () => {
    if (!isAuthenticated || isVendor || !userComment.trim()) return;
    try {
        await Promise.all([
            storeService.addStoreRating({ userId, storeId, score: Number(userRating) }),
            storeService.addStoreComment({ userId, storeId, text: userComment })
        ]);
        
        // Ponovo učitaj prosek i komentare
        await loadFeedback(); 
        
        // Manuelno ažuriramo state da se odmah vidi promena bez osvežavanja
        // myReview useMemo će automatski reagovati na ovo
        setIsEditing(false);
        alert("Uspešno sačuvano!");
    } catch (err) { console.error(err); }
};

    const handleDeleteReview = async () => {
        if (!window.confirm("Obriši recenziju?")) return;
        try {
            const commentId = myReview.commentId || myReview._id || myReview.id;
            await Promise.all([
                ratingService.deleteRating(userId, storeId),
                commentService.deleteComment(commentId)
            ]);
            await loadFeedback();
            setUserComment("");
            setIsEditing(false);
        } catch (err) { console.error(err); }
    };

    if (loading) return <div style={{padding:'50px', textAlign:'center', fontWeight:'900'}}>UČITAVANJE...</div>;

    return (
        <div style={styles.container}>
            <div style={styles.fullLayout}>
                <aside style={styles.sidebar}>
                    <div style={styles.sticky}>
                        <div style={styles.storeCard}>
                            <img 
                                src={store?.logo ? `${IMAGE_BASE_URL}${store.logo}` : `${IMAGE_BASE_URL}stores/default-store.png`} 
                                alt={store?.name} 
                                style={styles.storeImg} 
                                onError={(e) => { e.target.src = "https://via.placeholder.com/400x250?text=No+Image"; }}
                            />
                            <div style={styles.storeContent}>
                                <h1 style={styles.title}>{store?.name}</h1>
                                <p style={styles.iconText}><strong>📍</strong> {store?.address}, {store?.city}</p>
                                <p style={styles.iconText}><strong>★</strong> {averageRating.toFixed(1)} <span style={{color:'#888'}}>({ratingCount})</span></p>
                                <p style={styles.iconText}>
                                    <strong>👥</strong> {store?.followers || 0} PRATIOCA
                                </p>

                                <button 
                                    onClick={handleFollow}
                                    style={{
                                        ...styles.blackBtn,
                                        backgroundColor: isFollowing ? '#f0f0f0' : '#000',
                                        color: isFollowing ? '#000' : '#fff',
                                        border: '1px solid #000'
                                    }}
                                >
                                    {isFollowing ? 'OTPRATI' : 'ZAPRATI'}
                                </button>
                            </div>
                        </div>

                        <div style={styles.categoryCard}>
                            <h4 style={styles.label}>KATEGORIJE</h4>
                            <div 
                                style={selectedCategory === 'Sve' ? styles.catActive : styles.catItem}
                                onClick={() => {setSelectedCategory('Sve'); setCurrentPage(1);}}
                            >
                                SVE PONUDE
                            </div>
                            {categories.map((cat, i) => (
                                <div 
                                    key={i}
                                    style={selectedCategory === (cat.name || cat) ? styles.catActive : styles.catItem}
                                    onClick={() => {setSelectedCategory(cat.name || cat); setCurrentPage(1);}}
                                >
                                    {(cat.name || cat).toUpperCase()}
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                <main style={styles.main}>
                    <div style={styles.filterBox}>
                        <input 
                            type="text" 
                            placeholder="PRETRAŽI ARTIKLE..." 
                            style={styles.search}
                            value={searchTerm}
                            onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                        />
                        <div style={styles.row}>
                            <select style={styles.select} value={filterBrand} onChange={(e) => {setFilterBrand(e.target.value); setCurrentPage(1);}}>
                                <option value="All">SVI BRENDOVI</option>
                                {[...new Set(allProducts.map(p => p.brand).filter(Boolean))].map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <input type="number" placeholder="MIN RSD" style={styles.price} value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value))} />
                            <input type="number" placeholder="MAX RSD" style={styles.price} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} />
                            <select style={styles.select} onChange={(e) => setSortOption(e.target.value)}>
                                <option value="none">SORTIRANJE</option>
                                <option value="priceAsc">CENA: RASTUĆE</option>
                                <option value="priceDesc">CENA: OPADAJUĆE</option>
                            </select>
                        </div>
                    </div>

                    <div style={styles.grid}>
                        {currentProducts.map(prod => <ProductCard key={prod.id || prod._id} product={prod} />)}
                    </div>

                    {totalPages > 1 && (
                        <div style={styles.pag}>
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={styles.pagBtn}>NAZAD</button>
                            <span style={{fontWeight:'900'}}>{currentPage} / {totalPages}</span>
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={styles.pagBtn}>NAPRED</button>
                        </div>
                    )}
                </main>
            </div>

            <div style={styles.bottomSection}>
                <div style={styles.reviewsContainer}>
                    <h2 style={styles.header}>RECENZIJE KORISNIKA</h2>
                    <div style={styles.scroll}>
                        {otherComments.length > 0 ? (
                            otherComments.map((c, i) => (
                                <div key={i} style={styles.revCard}>
                                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                                        <span style={{fontWeight:'900'}}>@{c.username || "Korisnik"}</span>
                                        <span><strong>★</strong> {c.score || 5}</span>
                                    </div>
                                    <p style={{fontSize:'0.9rem'}}>{c.text}</p>
                                </div>
                            ))
                        ) : (
                            <p style={{padding: '20px', color: '#888'}}>Nema drugih recenzija.</p>
                        )}
                    </div>
                </div>

                <div style={styles.formCardFull}>
                    <h2 style={styles.header}>VAŠ UTISAK</h2>
                    {isAuthenticated && !isVendor ? (
                        myReview && !isEditing ? (
                            <div style={styles.myReviewBox}>
    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
        {/* Koristimo userRating kao fallback ako score još nije stigao u myReview objektu */}
        <span style={{fontWeight:'900'}}>
    VAŠA OCENA: ★ {userRating}
</span>
    </div>
    <p style={{fontStyle:'italic', marginBottom:'25px', fontSize:'1.1rem'}}>"{myReview.text}"</p>
    <div style={{display:'flex', gap:'10px'}}>
        <button style={styles.editBtn} onClick={() => { 
            setIsEditing(true); 
            setUserComment(myReview.text);
            setUserRating(myReview.score || myReview.rating || userRating); 
        }}>IZMENI</button>
        <button style={styles.delBtn} onClick={handleDeleteReview}>OBRIŠI</button>
    </div>
</div>
                        ) : (
                            <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                                <div style={{width: '300px'}}>
                                    <label style={styles.label}>VAŠA OCENA</label>
                                    <select style={styles.select} value={userRating} onChange={(e)=>setUserRating(e.target.value)}>
                                        {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} ZVEZDICA</option>)}
                                    </select>
                                </div>
                                <textarea 
                                    style={styles.area} 
                                    placeholder="NAPRAVITE RECENZIJU..."
                                    value={userComment}
                                    onChange={(e)=>setUserComment(e.target.value)}
                                />
                                <div style={{display:'flex', gap:'10px'}}>
                                    <button style={styles.blackBtnReview} onClick={handleSubmitReview}>
                                        {isEditing ? "SAČUVAJ IZMENE" : "OBJAVI RECENZIJU"}
                                    </button>
                                    {isEditing && <button style={styles.whiteBtn} onClick={() => setIsEditing(false)}>OTKAŽI</button>}
                                </div>
                            </div>
                        )
                    ) : (
                        <p style={{color: '#888'}}>Morate biti prijavljeni kao kupac da biste ostavili recenziju.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { width: '100%', minHeight: '100vh', background: '#fff' },
    fullLayout: { display: 'flex', width: '100%', padding: '20px', boxSizing: 'border-box', gap: '20px' },
    sidebar: { width: '380px', flexShrink: 0 },
    sticky: { position: 'sticky', top: '10px' },
    storeCard: { border: '1px solid #000', marginBottom: '20px' },
    storeImg: { width: '100%', height: '250px', objectFit: 'cover', borderBottom: '1px solid #000' },
    storeContent: { padding: '20px' },
    title: { fontWeight: '900', fontSize: '1.7rem', textTransform: 'uppercase', margin: '0 0 15px 0' },
    iconText: { display: 'flex', gap: '8px', marginBottom: '10px', fontSize: '1rem' },
    categoryCard: { border: '1px solid #000', padding: '20px' },
    label: { fontSize: '0.7rem', letterSpacing: '2px', color: '#888', marginBottom: '5px', display: 'block' },
    catItem: { padding: '12px 0', borderBottom: '1px solid #eee', cursor: 'pointer', fontWeight: '500' },
    catActive: { padding: '12px 0', borderBottom: '2px solid #000', fontWeight: '900', cursor: 'pointer' },
    main: { flex: 1 },
    filterBox: { border: '1px solid #000', padding: '20px', marginBottom: '20px' },
    search: { width: '100%', padding: '15px', border: '1px solid #000', marginBottom: '15px', outline: 'none', fontWeight: 'bold' },
    row: { display: 'flex', gap: '10px' },
    select: { flex: 1, padding: '10px', border: '1px solid #000', background: '#fff', fontWeight: '900', width: '100%' },
    price: { width: '110px', padding: '10px', border: '1px solid #000' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' },
    pag: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '40px', padding: '40px' },
    pagBtn: { padding: '10px 30px', border: '1px solid #000', background: '#fff', fontWeight: '900', cursor: 'pointer' },
    bottomSection: { padding: '40px 20px', borderTop: '1px solid #000', marginTop: '40px' },
    reviewsContainer: { marginBottom: '50px' },
    header: { fontWeight: '900', fontSize: '1.5rem', textTransform: 'uppercase', borderBottom: '4px solid #000', display: 'inline-block', marginBottom: '30px' },
    scroll: { display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px' },
    revCard: { minWidth: '350px', border: '1px solid #000', padding: '25px', background: '#fff' },
    formCardFull: { border: '1px solid #000', padding: '40px', background: '#fafafa' },
    myReviewBox: { padding: '30px', border: '2px dashed #000', background: '#fff' },
    area: { width: '100%', height: '150px', padding: '20px', border: '1px solid #000', resize: 'none', outline: 'none', fontSize: '1rem' },
    blackBtn: { padding: '12px', background: '#000', color: '#fff', border: 'none', fontWeight: '900', cursor: 'pointer', width: '100%' },
    blackBtnReview: { padding: '20px 40px', background: '#000', color: '#fff', border: 'none', fontWeight: '900', cursor: 'pointer' },
    whiteBtn: { padding: '15px 30px', background: '#fff', color: '#000', border: '1px solid #000', fontWeight: '900', cursor: 'pointer' },
    editBtn: { padding: '10px 25px', background: '#000', color: '#fff', border: 'none', fontWeight: '900', cursor: 'pointer' },
    delBtn: { padding: '10px 25px', background: '#ff4757', color: '#fff', border: 'none', fontWeight: '900', cursor: 'pointer' }
};

export default StoreDetails;