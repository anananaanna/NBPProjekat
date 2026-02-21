import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { productService } from '../../Services/apiService';
import ProductCard from '../Product/ProductCard';
import './Recommended.css';

const Recommended = () => {
    const [recommended, setRecommended] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const productsPerPage = 8; 
    
    const navigate = useNavigate();
    const { user, isAuthenticated } = useSelector((state) => state.auth);
    const userData = user?.user || user;
    const userId = userData?.id || userData?._id;

    useEffect(() => {
        const fetchRecommended = async () => {
            setLoading(true);
            try {
                let res;
                if (isAuthenticated && userId) {
                    res = await productService.getRecommendedProducts(userId);
                } else {
                    res = await productService.getRecommendedProducts("null"); 
                }
                setRecommended(res.data || []);
            } catch (e) {
                console.error("Greška pri preuzimanju preporuka:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchRecommended();
    }, [isAuthenticated, userId]);

    // Logika za paginaciju
    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    const currentProducts = recommended.slice(indexOfFirstProduct, indexOfLastProduct);
    const totalPages = Math.ceil(recommended.length / productsPerPage);

    const paginate = (pageNumber) => {
        setCurrentPage(pageNumber);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const isPersonalized = recommended.length > 0 && recommended[0].hasOwnProperty('strength');

    return (
        <div className="recommended-page">
            <header className="recommended-hero">
                <h1>{isPersonalized ? "Preporučeno za Vas" : "Popularno na marketu"}</h1>
                <p>
                    {isPersonalized 
                        ? "Personalizovana selekcija proizvoda na osnovu Vaših interesovanja." 
                        : "Najtraženiji proizvodi koje korisnici dodaju u svoje liste želja."}
                </p>
            </header>

            <div className="recommended-container">
                {loading ? (
                    <div className="loading-box">
                        <div className="loading-spinner"></div>
                        <p>Učitavanje...</p>
                    </div>
                ) : (
                    <>
                        <div className="recommended-grid">
                            {currentProducts.length > 0 ? (
                                currentProducts.map((prod) => (
                                    <ProductCard key={prod.id} product={prod} />
                                ))
                            ) : (
                                <div className="empty-recommendations">
                                    <h3>Trenutno nema proizvoda</h3>
                                    <p>Vratite se kasnije dok osvežimo ponudu.</p>
                                </div>
                            )}
                        </div>

                        {/* Paginacija */}
                        {totalPages > 1 && (
                            <div className="pagination">
                                {Array.from({ length: totalPages }, (_, i) => (
                                    <button 
                                        key={i + 1} 
                                        onClick={() => paginate(i + 1)}
                                        className={currentPage === i + 1 ? 'active' : ''}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Explore More Dugme */}
                        <div className="explore-more-container">
                            <button 
                                className="explore-btn" 
                                onClick={() => navigate('/')}
                            >
                                Istražite još proizvoda
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Recommended;