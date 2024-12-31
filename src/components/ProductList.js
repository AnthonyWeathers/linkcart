import React, { useState, useEffect } from 'react';
import ProductForm from './ProductForm';

const ProductList = ({ user }) => {
    // State to check if user is editting data on form
    const [edittingData, setEdittingData] = useState(false);

    const [selectedProduct, setSelectedProduct] = useState(null)
    const [savedProducts, setSavedProducts] = useState([]);
    const [sortBy, setSortBy] = useState(''); // State for sorting criteria
    const [extraSortBy, setExtraSortBy] = useState(''); // State for sort ordering criteria
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');

    useEffect(() => {
        fetchProducts();
      }, []);

    const fetchProducts = () => {
        fetch(`http://localhost:8000/products`, {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => {
            if(!response.ok) {
                const data = response.json()
                alert(data.error)
            }
            return response.json()
        })
        .then(data => {
            alert(data.message)
            setSavedProducts(data.products);
        })
        .catch(error => console.error('Error loading videos:', error));
    };

    const handleSubmit = (productId, updatedData) => {
        fetch(`http://localhost:8000/edit-product`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json' // Set the Content-Type header
            },
            body: JSON.stringify({ 
                id: productId,
                user_id: user.id,
                ...updatedData,
                favorited: selectedProduct.favorited || false
            })
        })
        .then(response => {
            if(!response.ok){
                return response.json().then(errorData => { throw new Error(errorData.error); });
            }
            return response.json()
        })
        .then(data => {
            alert('Product edited');
            setSavedProducts(prevProducts => 
                prevProducts.map(product =>
                    product.productId === data.product.productId
                        ? { ...product, ...data.product } // Replace all fields with updated info
                        : product // Keep other products unchanged
                )
            );
            setEdittingData(false) // would hide the form after submitting and successful edit
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
        .then(response => {
            if (!response.ok) {
                const errorData = response.json();
                console.error(errorData.error);
            }
            return response.json()
        })
        .then(data => {
            alert(data.message);
            // setSavedProducts(data.products)
            setSavedProducts(prevProducts => 
                prevProducts.filter(p => p.productId !== product.productId)
            );
        })
        .catch(error => console.error('Error deleting product:', error));
    };
    const editProduct = product => {
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
            if (data) {
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
            productsArray.sort((a, b) => extraSortBy === 'descending' ? 
                parseFloat(b.price.replace(/[^0-9.]/g, '')) - parseFloat(a.price.replace(/[^0-9.]/g, '')) : 
                parseFloat(a.price.replace(/[^0-9.]/g, '')) - parseFloat(b.price.replace(/[^0-9.]/g, ''))
            );
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

    const handleFilterAndSort = () => {
        let filteredProducts = savedProducts.filter(product => {
            // Remove non-numeric characters except decimal point
            const price = parseFloat(product.price.replace(/[^0-9.]/g, ''));
            const min = parseFloat(minPrice) || 0;
            const max = parseFloat(maxPrice) || Infinity;
    
            return !isNaN(price) && price >= min && price <= max;
        });
    
        return handleSort(filteredProducts);
    };
    
    
    

    const Products = ({ products }) => {
        // const sortedProducts = handleSort(products);
        const filteredAndSortedProducts = handleFilterAndSort();

        return (
            <div className="product-list">
                {filteredAndSortedProducts
                    .filter(product => product !== '') // Exclude empty spots
                    .map(product => ( // add a line here to show the favorited status of each product, start as just a line, later maybe a star
                        // <div key={product.productId} className="product-item">
                        <div key={product.productId} className='product-container'>
                            {!(selectedProduct && edittingData && selectedProduct.productId === product.productId) && (
                                <div className="product-item">
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
                                    {/* Make the URL clickable and open in a new tab */}
                                    {/* setting rel="noopener noreferrer" is for tab-napping prevention purposes*/}
                                    <p className="product-url">
                                        URL: <a href={product.url} target="_blank" rel="noopener noreferrer">{product.url}</a>
                                    </p>
                                    <p className="product-price">Price: {product.price}</p>
                                    <p className="product-category">Category: {product.category}</p>
                                    <button className="product-button" onClick={() => deleteProduct(product)}>Delete</button>
                                    <button className="product-button" onClick={() => editProduct(product)}>Edit</button>
                                </div>
                            )}
                            {/* <div className="product-header">
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
                            </div> */}
                            {/* Make the URL clickable and open in a new tab */}
                            {/* setting rel="noopener noreferrer" is for tab-napping prevention purposes*/}
                            {/* <p className="product-url">
                                URL: <a href={product.url} target="_blank" rel="noopener noreferrer">{product.url}</a>
                            </p>
                            <p className="product-price">Price: {product.price}</p>
                            <p className="product-category">Category: {product.category}</p>
                            <button className="product-button" onClick={() => deleteProduct(product)}>Delete</button>
                            <button className="product-button" onClick={() => editProduct(product)}>Edit</button> */}

                            {selectedProduct && edittingData && selectedProduct.productId === product.productId && (
                                <ProductForm
                                    initialData={{
                                        url: selectedProduct.url,
                                        price: selectedProduct.price,
                                        productName: selectedProduct.productName,
                                        category: selectedProduct.category
                                    }}
                                    handleSubmit={(updatedData) => handleSubmit(selectedProduct.productId, updatedData)}
                                />
                            )}
                        </div>
                ))}
            </div>
        );
      };

    return (
        <div className="products-container">
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

                <input
                    type="number"
                    placeholder="Min Price"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                />
                <input
                    type="number"
                    placeholder="Max Price"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                />
            </div>

            <Products products={savedProducts}/>
        </div>
    )
}

export default ProductList