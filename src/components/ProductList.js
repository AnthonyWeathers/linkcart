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
    const [categoryFilter, setCategoryFilter] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [totalProducts, setTotalProducts] = useState(0);

    // State for pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // State to store available categories
    const [categories] = useState([
        'Electronics',
        'Books',
        'Fashion',
        'Home',
        'Toys',
        'Sports',
        'Gadgets',
        'Accessories',
        'Kitchen',
        'Office',
        'Tools'
    ]);

    // Fetch Products
    // const fetchProducts = async () => {
    const fetchProducts = async (page = 1) => {
        setLoading(true);
        setError(null); // Clear previous errors
        try {
            const params = new URLSearchParams();
            if (sortBy) params.append('sortBy', sortBy);
            if (extraSortBy) params.append('extraSortBy', extraSortBy);
            if (minPrice) params.append('minPrice', minPrice);
            if (maxPrice) params.append('maxPrice', maxPrice);
            if (categoryFilter.length > 0) {
                categoryFilter.forEach(cat => params.append('categoryFilter', cat));
            }
            params.append('page', page);

            const response = await fetch(`http://localhost:8000/products?${params.toString()}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error);
            }

            const data = await response.json();
            setSavedProducts(data.products);
            setTotalPages(data.totalPages);
            setCurrentPage(page);
        } catch (error) {
            console.error('Error fetching products:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Edit Product
    const handleSubmit = async (productId, updatedData) => {
        try {
            const response = await fetch(`http://localhost:8000/edit-product`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    id: productId,
                    user_id: user.id,
                    ...updatedData,
                    favorited: selectedProduct?.favorited || false,
                    category: Array.isArray(updatedData.category) ? updatedData.category : [updatedData.category] // Ensure it's always an array
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error);
            }

            const data = await response.json();
            alert('Product edited');
            setSavedProducts(prevProducts => 
                prevProducts.map(product =>
                    product.productId === data.product.productId
                        ? { ...product, ...data.product }
                        : product
                )
            );
            setEdittingData(false);
        } catch (error) {
            console.error('Error editing the product:', error);
            // alert("Failed to edit the product: ${error.message}")
        }
    };

    // Delete Product
    const deleteProduct = async (product) => {
        try {
            const response = await fetch(`http://localhost:8000/delete-product`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: product.productId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error);
            }

            const data = await response.json();
            alert(data.message);
            setSavedProducts(prevProducts => 
                prevProducts.filter(p => p.productId !== product.productId)
            );
        } catch (error) {
            console.error('Error deleting product:', error);
            // alert("Failed to delete the product: ${error.message}")
        }
    };

    const editProduct = product => {
        // shows the form
        setEdittingData(true);
        setSelectedProduct(product);
    };

    const handleCancel = () => {
        setEdittingData(false);
        setSelectedProduct(null);
    }

    // Favorite Product
    const favoriteProduct = async (product) => {
        try {
            const response = await fetch(`http://localhost:8000/favorite-product`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: product.productId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error);
            }

            const data = await response.json();
            setSavedProducts(prevProducts => 
                prevProducts.map(p =>
                    p.productId === product.productId
                        ? { ...p, favorited: data.favorited }
                        : p
                )
            );
        } catch (error) {
            console.error('Error favoriting product:', error);
            // alert("Failed to favorite product: ${error.message}")
        }
    }
    
    // Handle Sort Apply
    const applySorting = () => {
        fetchProducts();
    };

    useEffect(() => {
        // Reset dependent filters when main sorting changes
        if (sortBy !== 'price') {
            setMinPrice('');
            setMaxPrice('');
        }
        if (sortBy !== 'category') {
            setCategoryFilter([]); // Clear category filter when sorting is not by category
        }
        if (sortBy === 'favorited') {
            setExtraSortBy(''); // Reset extraSortBy if favorited
        }
    }, [sortBy]);

    useEffect(() => {
        fetchProducts();
    }, []);

    function formatPrice(price) {
        return `$${price.toFixed(2)}`; // Format as "$4.99"
    }

    // Pagination controls
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            fetchProducts(newPage);
        }
    };
    

    const Products = ({ products }) => {
        // const sortedProducts = handleSort(products);
        // const filteredAndSortedProducts = handleFilterAndSort();

        return (
            <div className="product-list">
                {/* {filteredAndSortedProducts */}
                {products
                    .filter(product => product !== '') // Exclude empty spots
                    .map(product => ( // add a line here to show the favorited status of each product, start as just a line, later maybe a star
                        // <div key={product.productId} className="product-item">
                        <div key={product.productId} className={`product-container product-item ${product.favorited ? 'favorited' : ''}`}>
                            {/* {!(selectedProduct && edittingData && selectedProduct.productId === product.productId) && (
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
                                    </div> */}
                                    {/* Make the URL clickable and open in a new tab */}
                                    {/* setting rel="noopener noreferrer" is for tab-napping prevention purposes*/}
                                    {/* <p className="product-url">
                                        URL: <a href={product.url} target="_blank" rel="noopener noreferrer">{product.url}</a>
                                    </p>
                                    <p className="product-price">Price: {product.price}</p>
                                    <p className="product-category">
                                        Categories: {Array.isArray(product.category) ? product.category.join(', ') : 'No categories'}
                                    </p>
                                    <button className="product-button" onClick={() => deleteProduct(product)}>Delete</button>
                                    <button className="product-button" onClick={() => editProduct(product)}>Edit</button>
                                </div>
                            )}

                            {selectedProduct && edittingData && selectedProduct.productId === product.productId && (
                                <ProductForm
                                    initialData={{
                                        url: selectedProduct.url,
                                        price: selectedProduct.price,
                                        productName: selectedProduct.productName,
                                        category: Array.isArray(selectedProduct?.category)
                                            ? selectedProduct.category
                                            : selectedProduct?.category
                                            ? [selectedProduct.category]
                                            : [],
                                    }}
                                    handleSubmit={(updatedData) => handleSubmit(selectedProduct.productId, updatedData)}
                                    categories={categories} // Pass categories here
                                    showCancelButton={true}
                                    handleCancel={handleCancel} // Pass the custom cancel function
                                />
                            )} */}

                            {!(selectedProduct && edittingData && selectedProduct.productId === product.productId) ? (
                                <div className="product-item">
                                    <div className="product-header">
                                        <h2 className="product-name">
                                            {product.productName}
                                            <button
                                                title={product.favorited ? "Unfavorite" : "Favorite"}
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
                                    {/* <p className="product-price">Price: {product.price}</p> */}
                                    <p className="product-price">Price: {formatPrice(product.price)}</p>
                                    <p className="product-category">
                                        Categories: {Array.isArray(product.category) ? product.category.join(', ') : 'No categories'}
                                    </p>
                                    <button className="product-button" onClick={() => deleteProduct(product)}>Delete</button>
                                    <button className="product-button" onClick={() => editProduct(product)}>Edit</button>
                                </div>
                            ) : (
                                <div className="product-item">
                                    <ProductForm
                                        initialData={{
                                            url: selectedProduct.url,
                                            price: selectedProduct.price,
                                            productName: selectedProduct.productName,
                                            category: Array.isArray(selectedProduct?.category)
                                                ? selectedProduct.category
                                                : selectedProduct?.category
                                                ? [selectedProduct.category]
                                                : [],
                                        }}
                                        handleSubmit={(updatedData) => handleSubmit(selectedProduct.productId, updatedData)}
                                        categories={categories} // Pass categories here
                                        showCancelButton={true}
                                        handleCancel={handleCancel} // Pass the custom cancel function
                                    />
                                </div>
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
                {/* <select className="sort-select" onChange={(e) => setSortBy(e.target.value)} value={sortBy}> */}
                <select className="sort-select" onChange={(e) => setSortBy(e.target.value)} value={sortBy}>
                    <option value="">Sort by...</option>
                    <option value="price">Price</option>
                    <option value="category">Category</option>
                    <option value="favorited">Favorited</option>
                </select>

                {sortBy !== 'favorited' && (
                    <select className="sort-select" onChange={(e) => setExtraSortBy(e.target.value)} value={extraSortBy}>
                        <option value="">Sort Order...</option>
                        {sortBy === 'price' ? (
                            <>
                                <option value="descending">High to Low</option>
                                <option value="ascending">Low to High</option>
                            </>
                        ) : (
                            <>
                                <option value="descending">Newest</option>
                                <option value="ascending">Oldest</option>
                            </>
                        )}
                    </select>
                )}

                {/* Category Dropdown - Shown if sorting by category */}
                {sortBy === 'category' && (
                    <select className="sort-select" 
                        multiple 
                        onChange={(e) => setCategoryFilter([...e.target.selectedOptions].map(option => option.value))} 
                        value={categoryFilter}
                    >
                        <option value="">All Categories</option>
                        <option value='Accessories'>Accessories</option>
                        <option value="Books">Books</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Fashion">Fashion</option>
                        <option value='Gadgets'>Gadgets</option>
                        <option value="Home">Home</option>
                        <option value="Kitchen">Kitchen</option>
                        <option value="Sports">Sports</option>
                        <option value="Tools">Tools</option>
                        <option value="Toys">Toys</option>
                        <option value="Office">Office</option>
                    </select>
                )}

                {/* Min/Max Price Inputs - Shown if sorting by price */}
                {sortBy === 'price' && (
                    <>
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
                    </>
                )}
            </div>

            {/* Apply Sorting Button */}
            <button 
                className="apply-sort-button" 
                onClick={applySorting}
                style={{
                    marginTop: '10px',
                    padding: '8px 16px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                Apply Sorting
            </button>

            {error && <p className="error-message">{error}</p>}

            {/* Products Display */}
            {(!error && loading) ? <p>Loading Saved Products...</p> : <Products products={savedProducts} />}
            {/* <Products products={savedProducts}/> */}

            <div className="pagination-controls">
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    Previous
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    Next
                </button>
            </div>
        </div>
    )
}

export default ProductList