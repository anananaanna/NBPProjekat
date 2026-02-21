import React, { useState, useEffect, useMemo } from 'react';
import { productService } from '../../Services/apiService';
import ProductCard from '../Product/ProductCard';
import './SaleProduct.css';

const SaleProduct = () => {
    const [allProducts, setAllProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filteri i stanja
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBrand, setFilterBrand] = useState('All');
    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState(200000);
    const [sortBy, setSortBy] = useState('none');
    const [visibleCount, setVisibleCount] = useState(8);

    useEffect(() => {
        const fetchSaleData = async () => {
            try {
                setLoading(true);
                const [prodRes, catRes] = await Promise.all([
                    productService.getAllProducts(),
                    productService.getAllCategories()
                ]);
                
                // Ključna logika: Filtriramo samo one koji imaju popust
                const discounted = (prodRes.data || []).filter(p => 
                    p.discountPrice && p.discountPrice < p.price
                );
                
                setAllProducts(discounted);
                setCategories(catRes.data || []);
            } catch (err) {
                console.error("Greška pri učitavanju sniženih proizvoda:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSaleData();
    }, []);

    // Logika za jedinstvene brendove među sniženim proizvodima
    const brands = useMemo(() => {
        return ['All', ...new Set(allProducts.map(p => p.brand).filter(Boolean))];
    }, [allProducts]);

    // Glavna filtracija
    const filteredProducts = useMemo(() => {
        let temp = [...allProducts];
        
        // Kategorija
        if (selectedCategory !== 'All') {
        temp = temp.filter(p => {
            // Proveravamo categoryName (koji stiže iz Neo4j relacije)
            // ili p.category.name (ako je u pitanju neki drugi format)
            const pCat = p.categoryName || p.category?.name || p.category;
            return pCat === selectedCategory;
        });
    }
        // Pretraga
        if (searchQuery) {
            temp = temp.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        // Brend
        if (filterBrand !== 'All') {
            temp = temp.filter(p => p.brand === filterBrand);
        }
        // Cena (proveravamo discountPrice jer je to trenutna cena)
        temp = temp.filter(p => {
            const currentPrice = p.discountPrice || p.price;
            return currentPrice >= minPrice && currentPrice <= maxPrice;
        });
        
        // Sortiranje
        if (sortBy === 'priceLow') temp.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
        if (sortBy === 'priceHigh') temp.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
        
        return temp;
    }, [allProducts, selectedCategory, searchQuery, filterBrand, minPrice, maxPrice, sortBy]);

    const handleLoadMore = () => setVisibleCount(prev => prev + 8);

    if (loading) return <div className="loading-state">UČITAVANJE SNIŽENJA...</div>;

    return (
        <div className="sale-page">
            <div className="sale-banner">
                <h1>SEZONSKO SNIŽENJE</h1>
                <p>Najbolje ponude na jednom mestu</p>
            </div>

            <div className="main-layout container-custom">
                <aside className="sidebar">
                    <div className="sticky-sidebar">
                        <div className="category-card-home">
                            <span className="sidebar-title-label">KATEGORIJE</span>
                            <div 
                                className={`cat-item ${selectedCategory === 'All' ? 'active-cat' : ''}`} 
                                onClick={() => { setSelectedCategory('All'); setVisibleCount(8); }}
                            >
                                SVA SNIŽENJA
                            </div>
                            {categories.map(cat => (
                                <div 
                                    key={cat.id || cat._id} 
                                    className={`cat-item ${selectedCategory === cat.name ? 'active-cat' : ''}`} 
                                    onClick={() => { setSelectedCategory(cat.name); setVisibleCount(8); }}
                                >
                                    {cat.name.toUpperCase()}
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                <main className="content-area">
                    {/* Discovery Header sa svim filterima kao u Home */}
                    <div className="discovery-header-inline">
                        <div className="search-row">
                            <input 
                                type="text" 
                                placeholder="PRETRAŽI SNIŽENE ARTIKLE..." 
                                value={searchQuery} 
                                onChange={(e) => {setSearchQuery(e.target.value); setVisibleCount(8);}}
                                className="inline-search-input" 
                            />
                        </div>
                        <div className="filters-row-inline">
                            <select 
                                className="inline-select" 
                                value={filterBrand} 
                                onChange={(e) => {setFilterBrand(e.target.value); setVisibleCount(8);}}
                            >
                                <option value="All">SVI BRENDOVI</option>
                                {brands.filter(b => b !== 'All').map(b => <option key={b} value={b}>{b}</option>)}
                            </select>

                            <div className="price-range-inline">
                                <input 
                                    type="number" 
                                    placeholder="MIN RSD" 
                                    value={minPrice === 0 ? '' : minPrice} 
                                    onChange={(e) => {setMinPrice(Number(e.target.value)); setVisibleCount(8);}} 
                                />
                                <input 
                                    type="number" 
                                    placeholder="MAX RSD" 
                                    value={maxPrice === 200000 ? '' : maxPrice} 
                                    onChange={(e) => {setMaxPrice(Number(e.target.value)); setVisibleCount(8);}} 
                                />
                            </div>

                            <select 
                                className="inline-select" 
                                value={sortBy} 
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="none">SORTIRANJE</option>
                                <option value="priceLow">CENA: NIŽA</option>
                                <option value="priceHigh">CENA: VIŠA</option>
                            </select>
                        </div>
                    </div>

                    <div className="products-grid">
                        {filteredProducts.slice(0, visibleCount).map(prod => (
                            <ProductCard key={prod.id || prod._id} product={prod} />
                        ))}
                    </div>

                    {filteredProducts.length === 0 && (
                        <div className="no-results">Nema pronađenih proizvoda na sniženju za izabrane filtere.</div>
                    )}

                    {visibleCount < filteredProducts.length && (
                        <div className="load-more-container">
                            <button className="load-more-btn" onClick={handleLoadMore}>
                                UČITAJ VIŠE
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default SaleProduct;