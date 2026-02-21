import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storeService, productService } from '../../Services/apiService'; // Pretpostavljam da je ovde getAllCategories

const IMAGE_BASE_URL = "http://localhost:3001/uploads/";

const Stores = () => {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    
    // Filter states
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCity, setSelectedCity] = useState("Svi gradovi");
    const [selectedCategory, setSelectedCategory] = useState("Sve kategorije"); // NOVO
    const [sortBy, setSortBy] = useState("name");
    
    const [availableCities, setAvailableCities] = useState([]);
    const [allCategories, setAllCategories] = useState([]); // NOVO

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Dohvatanje prodavnica
                const allRes = await storeService.getAllStores();
                let fetchedStores = allRes.data || [];
                
                // 2. Dohvatanje svih kategorija za filter dropdown
                const catsRes = await productService.getAllCategories();
                setAllCategories(catsRes.data || []);

                // 3. Za svaku prodavnicu dohvatamo njene kategorije (da bismo znali kako da filtriramo)
                const storesWithCats = await Promise.all(fetchedStores.map(async (store) => {
                    try {
                        const catRes = await storeService.getStoreCategories(store.id);
                        return { ...store, categories: catRes.data.map(c => c.name) };
                    } catch {
                        return { ...store, categories: [] };
                    }
                }));

                const cities = [...new Set(storesWithCats.map(s => s.city))];
                setAvailableCities(cities);
                setStores(storesWithCats);

            } catch (err) {
                console.error("Greška pri učitavanju:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getProcessedStores = () => {
        let result = [...stores];

        // Filter po nazivu
        if (searchTerm) {
            result = result.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        // Filter po gradu
        if (selectedCity !== "Svi gradovi") {
            result = result.filter(s => s.city === selectedCity);
        }

        // NOVO: Filter po kategoriji
        if (selectedCategory !== "Sve kategorije") {
            result = result.filter(s => s.categories && s.categories.includes(selectedCategory));
        }

        // Sortiranje
        if (sortBy === "name") {
            result.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === "rating") {
            result.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        }

        return result;
    };

    const filteredStores = getProcessedStores();

    // ... loading UI ostaje isti ...
    if (loading) return (
        <div style={{ textAlign: 'center', padding: '100px', fontSize: '1.2rem', color: '#888' }}>
            Učitavanje prodavnica...
        </div>
    );

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1 style={styles.mainTitle}>Naši Partneri</h1>
                <p style={styles.subtitle}>Istražite najbolje prodavnice po kategorijama</p>
            </header>

            <div style={styles.filterBar}>
                <div style={styles.searchBox}>
                    <input 
                        type="text" 
                        placeholder="Pretraži po nazivu..." 
                        style={styles.input}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div style={styles.selectGroup}>
                    {/* NOVI SELECT ZA KATEGORIJE */}
                    <select 
                        style={styles.select} 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        <option value="Sve kategorije">Sve kategorije</option>
                        {allCategories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                    </select>

                    <select 
                        style={styles.select} 
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                    >
                        <option value="Svi gradovi">Svi gradovi</option>
                        {availableCities.map(city => (
                            <option key={city} value={city}>{city}</option>
                        ))}
                    </select>

                    <select 
                        style={styles.select} 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="name">Sortiraj: A-Z</option>
                        <option value="rating">Sortiraj: Rejting</option>
                    </select>
                </div>
            </div>

            <div style={styles.grid}>
                {filteredStores.map(store => (
                    <div 
                        key={store.id} 
                        style={styles.card} 
                        onClick={() => navigate(`/store/${store.id}`)}
                    >
                        <div style={styles.imageContainer}>
                            <img 
                                src={store.logo ? `${IMAGE_BASE_URL}${store.logo}` : `${IMAGE_BASE_URL}default-store.png`} 
                                alt={store.name} 
                                style={styles.storeImage}
                                onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=No+Image'; }}
                            />
                        </div>
                        <h3 style={styles.cardTitle}>{store.name}</h3>
                        
                        {/* Prikaz kategorija prodavnice kao male tagove (opciono) */}
                        <div style={{display: 'flex', gap: '5px', marginBottom: '10px', flexWrap: 'wrap', justifyContent: 'center'}}>
                            {store.categories?.slice(0, 3).map(c => (
                                <span key={c} style={{fontSize: '10px', background: '#eee', padding: '2px 6px', borderRadius: '10px'}}>{c}</span>
                            ))}
                        </div>

                        <p style={styles.cardLocation}>
                            <span style={{fontWeight: '600'}}>{store.city}</span>, {store.address}
                        </p>
                        
                        <div style={styles.ratingBox}>
                            <span style={styles.star}>★</span>
                            <span style={styles.ratingValue}>
                                {store.averageRating ? Number(store.averageRating).toFixed(1) : "N/A"}
                            </span>
                            <span style={styles.ratingCount}>({store.ratingCount || 0})</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const styles = {
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '60px 20px',
        minHeight: '100vh',
        fontFamily: "'Inter', sans-serif"
    },
    header: {
        textAlign: 'center',
        marginBottom: '50px'
    },
    mainTitle: {
        fontSize: '32px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '2px',
        marginBottom: '10px'
    },
    subtitle: {
        color: '#888',
        fontSize: '16px'
    },
    filterBar: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '15px',
        marginBottom: '40px',
        padding: '20px',
        backgroundColor: '#fbfbfb',
        borderRadius: '8px'
    },
    searchBox: {
        flex: '2',
        minWidth: '250px'
    },
    selectGroup: {
        flex: '1',
        display: 'flex',
        gap: '10px',
        minWidth: '300px'
    },
    input: {
        width: '100%',
        padding: '12px 15px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        outline: 'none',
        fontSize: '14px',
        boxSizing: 'border-box'
    },
    select: {
        flex: '1',
        padding: '12px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        backgroundColor: '#fff',
        cursor: 'pointer',
        fontSize: '14px',
        outline: 'none'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '30px'
    },
    card: {
 backgroundColor: '#fff',
    padding: '20px', // Smanjen padding jer slika zauzima prostor
    border: '1px solid #eee',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderRadius: '12px', // Malo zaobljenije ivice za moderniji izgled
    overflow: 'hidden'
    },
    cardIcon: {
        fontSize: '32px',
        marginBottom: '15px'
    },
    cardTitle: {
        fontSize: '20px',
        fontWeight: '600',
        margin: '0 0 8px 0',
        color: '#000'
    },
    cardLocation: {
        color: '#666',
        fontSize: '14px',
        margin: '0 0 20px 0'
    },
    ratingBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        padding: '6px 12px',
        backgroundColor: '#f8f8f8',
        borderRadius: '20px',
        border: '1px solid #eee'
    },
    star: {
        color: '#000', // Crna zvezda za minimal izgled
        fontSize: '16px'
    },
    ratingValue: {
        fontWeight: '700',
        fontSize: '14px'
    },
    ratingCount: {
        color: '#999',
        fontSize: '12px'
    },
    noResults: {
        gridColumn: '1 / -1',
        textAlign: 'center',
        padding: '40px',
        color: '#999',
        fontSize: '16px'
    },
    imageContainer: {
    width: '100%',
    height: '160px',
    marginBottom: '15px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    overflow: 'hidden'
},
storeImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover', // Ovo obezbeđuje da slika ispuni prostor bez rastezanja
},
};

export default Stores;