import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productService } from '../../Services/apiService';
import './ManageProduct.css';

const ManageProduct = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState({ name: '', brand: '', price: '', discountPrice: '', storeName: '' });
    const [loading, setLoading] = useState(true);
    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await productService.getAllProducts();
                const found = res.data.find(p => String(p.id?.low || p.id || p.neo4jId) === id);
                if (found) {
                    setProduct({
                        ...found,
                        price: Number(found.price),
                        discountPrice: found.discountPrice || '',
                        storeName: found.storeName || 'Moja Prodavnica'
                    });
                }
            } catch (err) { console.error(err); }
            setLoading(false);
        };
        fetchProduct();
    }, [id]);

    const handleBasicUpdate = async () => {
    try {
        const formData = new FormData();
        // Uzimamo ID ispravno
        const productId = product.id?.low || product.id || id;
        
        formData.append('id', productId);
        formData.append('name', product.name);
        formData.append('brand', product.brand);
        formData.append('price', Number(product.price));
        
        if (selectedFile) {
            formData.append('image', selectedFile);
        }

        console.log("Šaljem podatke:", Object.fromEntries(formData)); // Ovo će ispisati u konzoli šta šalješ

        await productService.updateProduct(formData);
        alert("Uspešno ažurirano!");
        window.location.reload();
    } catch (err) { 
        // OVE DVE LINIJE SU KLJUČNE ZA DIJAGNOSTIKU:
        console.error("DETALJNA GREŠKA:", err.response?.data || err.message);
        alert("Greška: " + (err.response?.data?.error || err.message)); 
    }
};

    // LOGIKA ZA AKTIVIRANJE POPUSTA
    const handleDiscountUpdate = async () => {
        try {
            await productService.setDiscount({
                amount: Number(product.discountPrice),
                productName: product.name.trim(),
                storeName: product.storeName.trim()
            });
            alert("Popust aktiviran!");
        } catch (err) {
            console.error(err);
            alert("Greška pri aktiviranju popusta.");
        }
    };

    // LOGIKA ZA UKLANJANJE POPUSTA
    const handleRemoveDiscount = async () => {
        if (!window.confirm(`Da li ste sigurni da želite da uklonite popust za ${product.name}?`)) return;
        try {
            await productService.removeDiscount({ productName: product.name });
            setProduct({ ...product, discountPrice: '' });
            alert("Popust uklonjen!");
        } catch (err) {
            console.error(err);
            alert("Greška pri uklanjanju popusta.");
        }
    };

    return (
        <div className="manage-wrapper-minimal">
            <div className="manage-content-minimal">
                <header className="manage-header-minimal">
                    <button onClick={() => navigate(-1)} className="btn-text">← Nazad</button>
                    <h2>Uredi Proizvod</h2>
                </header>

                <section className="form-section-minimal">
                    <h3>Osnovne informacije</h3>
                    <div className="input-underlined">
                        <label>Naziv artikla</label>
                        <input type="text" value={product.name} onChange={e => setProduct({...product, name: e.target.value})} />
                        <span className="line"></span>
                    </div>
                    <div className="input-underlined">
                        <label>Brend</label>
                        <input type="text" value={product.brand} onChange={e => setProduct({...product, brand: e.target.value})} />
                        <span className="line"></span>
                    </div>
                    <div className="input-underlined">
                        <label>Cena (RSD)</label>
                        <input type="number" value={product.price} onChange={e => setProduct({...product, price: e.target.value})} />
                        <span className="line"></span>
                    </div>
                    <div className="input-underlined">
    <label>Nova slika proizvoda</label>
    <input 
        type="file" 
        accept="image/*" 
        onChange={e => setSelectedFile(e.target.files[0])} 
    />
    <span className="line"></span>
</div>
                    <button onClick={handleBasicUpdate} className="btn-black-wide">Sačuvaj Izmene</button>
                </section>

                <section className="form-section-minimal discount-box">
                    <h3>Akcijska Ponuda</h3>
                    <div className="input-underlined">
                        <input type="number" placeholder="Nova akcijska cena" value={product.discountPrice} onChange={e => setProduct({...product, discountPrice: e.target.value})} />
                        <span className="line"></span>
                    </div>
                    <button onClick={handleDiscountUpdate} className="btn-black-small">Aktiviraj Popust</button>
                    <button onClick={handleRemoveDiscount} className="btn-text-red">Ukloni popust</button>
                </section>

                <div className="danger-zone-minimal">
                    <button className="btn-outline-red" onClick={() => {
                        if(window.confirm("Obriši trajno?")) {
                            productService.deleteProduct(id).then(() => navigate('/vendor-dashboard'));
                        }
                    }}>Obriši proizvod iz baze</button>
                </div>
            </div>
        </div>
    );
};

export default ManageProduct;