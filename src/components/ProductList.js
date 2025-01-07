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

    useEffect(() => {
        fetchProducts();
      }, []);

    // Fetch Products
    const fetchProducts = async () => {
        try {
            const params = new URLSearchParams();
            if (sortBy) params.append('sortBy', sortBy);
            if (extraSortBy) params.append('extraSortBy', extraSortBy);
            if (minPrice) params.append('minPrice', minPrice);
            if (maxPrice) params.append('maxPrice', maxPrice);
            if (categoryFilter.length > 0) {
                categoryFilter.forEach(cat => params.append('categoryFilter', cat));
            }

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
        } catch (error) {
            console.error('Error fetching products:', error);
            // alert("Failed to fetch the product: ${error.message}")
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

    // Function to apply sorting logic to an array of products
    // const sortProducts = (productsArray, sortBy, extraSortBy) => {
    //     if (sortBy === 'price') {
    //         productsArray.sort((a, b) => extraSortBy === 'descending' ? 
    //             parseFloat(b.price.replace(/[^0-9.]/g, '')) - parseFloat(a.price.replace(/[^0-9.]/g, '')) : 
    //             parseFloat(a.price.replace(/[^0-9.]/g, '')) - parseFloat(b.price.replace(/[^0-9.]/g, ''))
    //         );
    //     } else if (sortBy === 'category') {
    //         productsArray.sort((a, b) => {
    //             // const aCategory = a.category ? a.category.split(',')[0].trim().toLowerCase() : "zzzz"; // First subcategory or placeholder
    //             // const bCategory = b.category ? b.category.split(',')[0].trim().toLowerCase() : "zzzz";

    //             const aCategory = Array.isArray(a.category) && a.category.length > 0 ? a.category[0].toLowerCase() : "zzzz";
    //             const bCategory = Array.isArray(b.category) && b.category.length > 0 ? b.category[0].toLowerCase() : "zzzz";
    //             return extraSortBy === 'descending' 
    //                 ? bCategory.localeCompare(aCategory) 
    //                 : aCategory.localeCompare(bCategory);
    //         });
    //     }
    //     return productsArray;
    // };

    // Main sorting handler function
    // const handleSort = (products) => {
    //     const favoritedProducts = products.filter(product => product.favorited);
    //     const nonFavoritedProducts = products.filter(product => !product.favorited);

    //     // Sort the favorited and non-favorited products using the extracted function
    //     const sortedFavoritedProducts = sortProducts(favoritedProducts, sortBy, extraSortBy);
    //     const sortedNonFavoritedProducts = sortProducts(nonFavoritedProducts, sortBy, extraSortBy);

    //     // Re-merge the sorted arrays
    //     return [...sortedFavoritedProducts, ...sortedNonFavoritedProducts];
    // };

    // const handleFilterAndSort = () => {
    //     let filteredProducts = savedProducts;
        
    //     // 1️ Filter based on 'sortBy' selection
    //     if (sortBy === 'price') {
    //         filteredProducts = savedProducts.filter(product => {
    //             const price = parseFloat(product.price.replace(/[^0-9.]/g, '')) || 0;
    //             const min = parseFloat(minPrice) || 0;
    //             const max = parseFloat(maxPrice) || Infinity;
        
    //             return price >= min && price <= max;
    //         });
    //     } 
    //     else if (sortBy === 'category' && categoryFilter) {
    //         filteredProducts = savedProducts.filter(product => {
    //             const categories = Array.isArray(product.category) ? product.category.map(c => c.toLowerCase()) : [];
    //             return categories.includes(categoryFilter.toLowerCase());
    //         });
    //     }

    //     // 2️ Apply the further sorting logic
    //     return handleSort(filteredProducts);
    // };
    
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
                                    <p className="product-category">
                                        {/* Categories: {product.category} */}
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
                        <option value="electronics">Electronics</option>
                        <option value="books">Books</option>
                        <option value="fashion">Fashion</option>
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

            {/* Products Display */}
            <Products products={savedProducts}/>
        </div>
    )
}

export default ProductList