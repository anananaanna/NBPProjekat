import React, { useEffect, useState } from 'react';
import { productService } from '../../Services/apiService';
import ProductCard from './ProductCard';

const ProductList = () => {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await productService.getAllProducts();
                // response.data bi trebalo da bude niz proizvoda iz Neo4j
                setProducts(response.data);
            } catch (err) {
                console.error("Greška pri dohvatanju proizvoda:", err);
            }
        };
        fetchProducts();
    }, []);

    return (
        <div style={{ padding: '20px' }}>
            <h2>Naši Proizvodi</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                {products.map(p => (
                    <ProductCard key={p.id} product={p} />
                ))}
            </div>
        </div>
    );
};

export default ProductList;