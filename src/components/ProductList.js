import React, { useState, useEffect } from 'react';
import ProductForm from './ProductForm';

const ProductList = ({ user }) => {
    // useEffect, and code interacting with other code of App, is in here before the return
    const [url, setUrl] = useState('');
    const [price, setPrice] = useState('');
    const [productName, setProductName] = useState('');
    const [category, setCategory] = useState('');
    //const [favorited, setFavorited] = useState(''); // might not need since I'm using the favorited attribute of the product

    // State to store the submitted data
    //const [submittedData, setSubmittedData] = useState(null);
    // State to check if user is editting data on form
    const [edittingData, setEdittingData] = useState(false);

    const [selectedProduct, setSelectedProduct] = useState(null)
    const [savedProducts, setSavedProducts] = useState([]);

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
                console.log(data.products)
            } else {
                alert(data.message);
            }
        })
        .catch(error => console.error('Error loading videos:', error));
    };

    // Function to handle form submission
    // const updateFormData = () => {
    //     const formData = {
    //         url,
    //         price,
    //         productName,
    //         category
    //     };
    //     if(edittingData) {
    //     setEdittingData(false)
    //     }

    //     setSubmittedData(formData);
    // }
    const handleSubmit = (event) => {
        event.preventDefault(); // Prevent page reload on form submit

        // On this page, should edit product details according to changes made by user
        // updateFormData()
        // console.log('Entered the deleteProduct function')
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
            if (data.success) {
                alert('Product edited');
                setSavedProducts(data.products)
                setEdittingData(false) // would hide the form after submitting and successful edit
            }
        })
        .catch(error => console.error('Error editing the product:', error));

        // console.log('Form Data:', submittedData);
    };

    const deleteProduct = product => {
        // goes to delete product endpoint, likely needs index or product id/#
        console.log('Entered the deleteProduct function')
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
            if (data.success) {
                alert('Product deleted');
                setSavedProducts(data.products)
            }
        })
        .catch(error => console.error('Error loading videos:', error));
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
            if (data.success) {
                // alert('Product deleted');
                setSavedProducts(data.products) // should update the favorite status of 
            }
        })
        .catch(error => console.error('Error favoriting product:', error));
    }

    const Products = ({ products }) => {
        return (
            <div>
                {products
                    .filter(product => product !== '') // Exclude empty spots
                    .map(product => ( // add a line here to show the favorited status of each product, start as just a line, later maybe a star
                        <div key={product.productId}>
                            <span><h2>{product.productName}</h2>{/*<div>Favorited?{product.favorited}</div>*/}</span>
                            {/* Perhaps have a ternary: product.favorited ? Yes : No to pick the test based off the favorited value*/}
                            {/* Then time to start working on the profile component/page */}
                            <div>Favorited?{product.favorited ? "Yes" : "No"}</div>
                            <p>URL: {product.url}</p>
                            <p>Price: {product.price}</p>
                            <p>Category: {product.category}</p>
                            {/* Add your edit and delete buttons here */}
                            <button onClick={() => deleteProduct(product)}>Delete</button>
                            <button onClick={() => editProduct(product)}>Edit</button>
                            <button onClick={() => favoriteProduct(product)}>Favorite</button>
                        </div>
                ))}
            </div>
        );
      };

    return (
        <div>
            <Products products={savedProducts}/>
            {edittingData && (
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
    )
}

export default ProductList