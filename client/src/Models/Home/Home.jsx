import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux'; 
import { productService, storeService } from '../../Services/apiService';
import ProductCard from '../Product/ProductCard';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import { socket } from '../../socketClient'; 

const Home = () => {
    const [allProducts, setAllProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [trendingStores, setTrendingStores] = useState([]); 
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBrand, setFilterBrand] = useState('All');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState(200000);
    const [sortBy, setSortBy] = useState('popularity');
    const [loading, setLoading] = useState(false);
    
    // "Učitaj više" logika
    const [visibleCount, setVisibleCount] = useState(8);
    
    const navigate = useNavigate();
    const { user, isAuthenticated } = useSelector((state) => state.auth);
    const userData = user?.user || user;
    const userId = userData?.id || userData?._id;

    // 1. Definišemo fetchTrending bez previše komplikovanja
    const fetchTrending = async () => {
        try {
            // Dodajemo timestamp u query da "razbijemo" browser keš
            const trendRes = await storeService.getTop3Stores();
            if (trendRes.data) {
                console.log("Top 3 podaci osveženi:", trendRes.data);
                setTrendingStores(trendRes.data);
            }
        } catch (e) { 
            console.error("Greška pri osvežavanju Top 3:", e); 
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [prodRes, catRes] = await Promise.all([
                    productService.getAllProducts(),
                    productService.getAllCategories()
                ]);
                setAllProducts(prodRes.data || []);
                setCategories(catRes.data || []);
                
                // Inicijalno učitavanje top prodavnica
                await fetchTrending();
            } catch (err) { 
                console.error(err); 
            } finally { 
                setLoading(false); 
            }
        };
        
        fetchData();

        // KLJUČNA IZMENA: Slušamo "update_top_3" jer to backend šalje
        socket.on("update_top_3", (updatedTop3) => {
            console.log("Stigli novi trending podaci preko socketa:", updatedTop3);
            
            // Umesto da zovemo API, direktno setujemo podatke koje je backend poslao
            setTrendingStores(updatedTop3);
        });

        return () => {
            socket.off("update_top_3");
        };
    }, []); // Prazan niz jer socket listener postavljamo samo jednom// Prazan array osigurava da se listener postavi samo jednom pri mount-u

// ... ostatak koda ispod je isti

    // Filtriranje i sortiranje
    const filteredProducts = useMemo(() => {
        let temp = [...allProducts];
        if (selectedCategory !== 'All') {
        console.log("Filtriram po kategoriji:", selectedCategory);
        
        temp = temp.filter(p => {
            // 1. Proveravamo da li je kategorija unutar objekta (npr. p.category.name)
            // 2. Proveravamo da li je kategorija direktan string (npr. p.category)
            // 3. Proveravamo polje categoryName koje se često koristi u Neo4j mapiranju
            const productCategory = p.category?.name || p.categoryName || p.category;
            
            console.log(`Proizvod: ${p.name}, Kategorija u objektu:`, productCategory);
            
            return productCategory === selectedCategory;
        });
    }
        if (searchQuery) {
            temp = temp.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        if (filterBrand !== 'All') {
            temp = temp.filter(p => p.brand === filterBrand);
        }
        temp = temp.filter(p => {
            const price = p.discountPrice || p.price;
            return price >= minPrice && price <= maxPrice;
        });
        
        if (sortBy === 'priceLow') temp.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
        if (sortBy === 'priceHigh') temp.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
        if (sortBy === 'newest') temp.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        return temp;
    }, [allProducts, selectedCategory, searchQuery, filterBrand, minPrice, maxPrice, sortBy]);

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + 8);
    };

    const brands = ['All', ...new Set(allProducts.map(p => p.brand).filter(Boolean))];

    return (
        <div className="home-page">
            {/* TOP 3 SEKCIJA */}
            {trendingStores.length > 0 && (
                <div className="top-stores-full-width">
                    <div className="container-custom">
                        <h2 className="top-stores-title">Top 3 Prodavnice</h2>
                        <div className="top-grid-home">
                            {trendingStores.map((s, i) => (
                                <div key={`store-${s.id || i}`} className="top-card-home" onClick={() => navigate(`/store/${s.id}`)}>
                                    <div className="rank-badge-home">#{i + 1}</div>
                                    <h3 className="top-store-name">{s.name}</h3>
                                    <div className="top-rating-box">
                                        <span className="top-star">★</span>
                                        <span className="top-rating-value">{Number(s.avgRating || 0).toFixed(1)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="main-layout container-custom">
                {/* STICKY SIDEBAR (Kao na StoreDetails) */}
                <aside className="sidebar">
                    <div className="sticky-sidebar">
                        <h4 className="sidebar-title">Kategorije</h4>
                        <div 
                            className={`cat-item ${selectedCategory === 'All' ? 'active-cat' : ''}`} 
                            onClick={() => { setSelectedCategory('All'); setVisibleCount(8); }}
                        >
                            Sve ponude
                        </div>
                        {categories.map((cat, i) => (
    <div 
        key={cat.id || i} // Dodato || i za svaki slučaj
        className={`cat-item ${selectedCategory === cat.name ? 'active-cat' : ''}`} 
        onClick={() => { 
            setSelectedCategory(cat.name); 
            setVisibleCount(8); 
        }}
    >
        {cat.name}
    </div>
))}
                    </div>
                </aside>

                {/* DESNA STRANA */}
                <main className="content-area">
                    <div className="discovery-header-inline">
                        <div className="search-row">
                            <input 
                                type="text" 
                                placeholder="Pretraži artikle..." 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="inline-search-input" 
                            />
                        </div>
                        <div className="filters-row-inline">
                            <select className="inline-select" value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}>
                                <option value="All">SVI BRENDOVI</option>
                                {brands.filter(b => b !== 'All').map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <div className="price-range-inline">
                                <input type="number" placeholder="OD" onChange={(e) => setMinPrice(Number(e.target.value))} />
                                <input type="number" placeholder="DO" onChange={(e) => setMaxPrice(Number(e.target.value))} />
                            </div>
                            <select className="inline-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                <option value="popularity">SORTIRANJE</option>
                                <option value="priceLow">Cena: Niža</option>
                                <option value="priceHigh">Cena: Viša</option>
                            </select>
                        </div>
                    </div>

                    <div className="products-section">
                        <div className="products-grid">
                            {filteredProducts.slice(0, visibleCount).map(prod => (
                                <ProductCard key={prod.id} product={prod} />
                            ))}
                        </div>

                        {/* LOAD MORE DUGME */}
                        {visibleCount < filteredProducts.length && (
                            <div className="load-more-container">
                                <button className="load-more-btn" onClick={handleLoadMore}>
                                    UCITAJ VIŠE
                                </button>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Home;