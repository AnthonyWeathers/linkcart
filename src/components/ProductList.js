import React, { useState, useEffect } from 'react';
import ProductForm from './ProductForm';

const ProductList = ({ user }) => {
    // useEffect, and code interacting with other code of App, is in here before the return
    const [url, setUrl] = useState('');
    const [price, setPrice] = useState('');
    const [productName, setProductName] = useState('');
    const [category, setCategory] = useState('');

    // State to check if user is editting data on form
    const [edittingData, setEdittingData] = useState(false);

    const [selectedProduct, setSelectedProduct] = useState(null)
    const [savedProducts, setSavedProducts] = useState([]);
    const [sortBy, setSortBy] = useState(''); // State for sorting criteria
    const [extraSortBy, setExtraSortBy] = useState(''); // State for sort ordering criteria

    useEffect(() => {
        fetchProducts();
      }, []);

    const fetchProducts = () => {
        fetch(`http://localhost:8000/products`, {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                setSavedProducts(data.products);
            } else {
                alert(data.message);
            }
        })
        .catch(error => console.error('Error loading videos:', error));
    };

    const handleSubmit = (event) => {
        event.preventDefault(); // Prevent page reload on form submit

        fetch(`http://localhost:8000/edit-product`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json' // Set the Content-Type header
            },
            body: JSON.stringify({ 
                id: selectedProduct.productId,
                user_id: user.id,
                url, 
                price, 
                productName, 
                category,
                favorited: selectedProduct.favorited
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.ok) {
                alert('Product edited');
                setSavedProducts(data.products)
                setSavedProducts(prevProducts => 
                    prevProducts.map(product =>
                        product.productId === updatedProduct.id
                            ? { ...product, ...updatedProduct } // Replace all fields with updated info
                            : product // Keep other products unchanged
                    )
                );
                setEdittingData(false) // would hide the form after submitting and successful edit
            }
        })
        .catch(error => console.error('Error editing the product:', error));
    };

    const deleteProduct = product => {
        fetch(`http://localhost:8000/delete-product`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json' // Set the Content-Type header
            },
            body: JSON.stringify({ id: product.productId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.ok) {
                alert('Product deleted');
                setSavedProducts(data.products)
                setSavedProducts(prevProducts => 
                    prevProducts.filter(p => p.productId !== product.productId)
                );
            }
        })
        .catch(error => console.error('Error deleting product:', error));
    };
    const editProduct = product => {
        // grabs details of product and auto fills the form with said details
        setUrl(product.url);
        setPrice(product.price);
        setProductName(product.productName);
        setCategory(product.category);
        // shows the form
        setEdittingData(true);
        setSelectedProduct(product);
    };
    const favoriteProduct = product => {
        fetch(`http://localhost:8000/favorite-product`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json' // Set the Content-Type header
            },
            body: JSON.stringify({ id: product.productId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.ok) {
                setSavedProducts(prevProducts => 
                    prevProducts.map(p =>
                        p.productId === product.productId
                            ? { ...p, favorited: data.favorited } // Update favorited status of product
                            : p // Keep other products unchanged
                    )
                );
            } else {
                alert(data.error)
            }
        })
        .catch(error => console.error('Error favoriting product:', error));
    }

    // Function to apply sorting logic to an array of products
    const sortProducts = (productsArray, sortBy, extraSortBy) => {
        if (sortBy === 'price') {
            productsArray.sort((a, b) => extraSortBy === 'descending' ? b.price - a.price : a.price - b.price);
        } else if (sortBy === 'category') {
            productsArray.sort((a, b) => {
                const aCategory = a.category ? a.category.split(',')[0].trim().toLowerCase() : "zzzz"; // First subcategory or placeholder
                const bCategory = b.category ? b.category.split(',')[0].trim().toLowerCase() : "zzzz";
                return extraSortBy === 'descending' 
                    ? bCategory.localeCompare(aCategory) 
                    : aCategory.localeCompare(bCategory);
            });
        }
        return productsArray;
    };

    // Main sorting handler function
    const handleSort = (products) => {
        const favoritedProducts = products.filter(product => product.favorited);
        const nonFavoritedProducts = products.filter(product => !product.favorited);

        // Sort the favorited and non-favorited products using the extracted function
        const sortedFavoritedProducts = sortProducts(favoritedProducts, sortBy, extraSortBy);
        const sortedNonFavoritedProducts = sortProducts(nonFavoritedProducts, sortBy, extraSortBy);

        // Re-merge the sorted arrays
        return [...sortedFavoritedProducts, ...sortedNonFavoritedProducts];
    };

    const Products = ({ products }) => {
        const sortedProducts = handleSort(products);

        return (
            <div className="product-list">
                {sortedProducts
                    .filter(product => product !== '') // Exclude empty spots
                    .map(product => ( // add a line here to show the favorited status of each product, start as just a line, later maybe a star
                        <div key={product.productId} className="product-item">
                            <div className="product-header">
                                <h2 className="product-name">
                                    {product.productName}
                                    <button
                                        className={`favorite-star ${product.favorited ? 'filled' : 'empty'}`}
                                        onClick={() => favoriteProduct(product)}
                                        aria-label={product.favorited ? "Unfavorite" : "Favorite"}
                                    >
                                        {product.favorited ? '★' : '☆'}
                                    </button>
                                </h2>
                            </div>
                            {/* <div className="product-favorited">Favorited?{product.favorited ? "Yes" : "No"}</div> */}
                            {/* <p>URL: {product.url}</p> */}
                            {/* Make the URL clickable and open in a new tab */}
                            {/* setting rel="noopener noreferrer" is for tab-napping prevention purposes*/}
                            <p className="product-url">
                                URL: <a href={product.url} target="_blank" rel="noopener noreferrer">{product.url}</a>
                            </p>
                            <p className="product-price">Price: {product.price}</p>
                            <p className="product-category">Category: {product.category}</p>
                            <button className="product-button" onClick={() => deleteProduct(product)}>Delete</button>
                            <button className="product-button" onClick={() => editProduct(product)}>Edit</button>
                            {/* <button className="product-button" onClick={() => favoriteProduct(product)}>Favorite</button> */}

                            {selectedProduct && edittingData && selectedProduct.productId === product.productId && (
                                <ProductForm
                                    url={url}
                                    setUrl={setUrl}
                                    price={price}
                                    setPrice={setPrice}
                                    productName={productName}
                                    setProductName={setProductName}
                                    category={category}
                                    setCategory={setCategory}
                                    handleSubmit={handleSubmit}
                                />
                            )}
                        </div>
                ))}
            </div>
        );
      };

    return (
        <div className="product-container">
            {/* Dropdown for sorting */}
            <div className="sort-dropdowns">
                <select className="sort-select" onChange={(e) => setSortBy(e.target.value)} value={sortBy}>
                    <option value="">Sort by...</option>
                    <option value="price">Price</option>
                    <option value="category">Category</option>
                </select>

                <select className="sort-select" onChange={(e) => setExtraSortBy(e.target.value)} value={extraSortBy}>
                    <option value="">Sort Order...</option>
                    <option value="descending">Descending</option>
                    <option value="ascending">Ascending</option>
                </select>
            </div>

            <Products products={savedProducts}/>
        </div>
    )
}

export default ProductList