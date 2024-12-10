import React, { useState } from 'react';
import ProductForm from './ProductForm';

const AddProduct = ({ user }) => {
  // useEffect, and code interacting with other code of App, is in here before the return
  const [url, setUrl] = useState('');
  const [price, setPrice] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');

  // State to store the submitted data
  const [submittedData, setSubmittedData] = useState(null);
  // State to check if user is editting data on form
  const [edittingData, setEdittingData] = useState(false);

  if (!user) {
    return <p>Please log in to add a product.</p>;
  }

  // Function to handle form submission
  const updateFormData = () => {
    const formData = {
      url,
      price,
      productName,
      category
    };
    if(edittingData) {
      setEdittingData(false)
    }

    setSubmittedData(formData);
  }
  const handleSubmit = (event) => {
    event.preventDefault(); // Prevent page reload on form submit

    // Handle the form data here, e.g., sending it to an API or processing it
    updateFormData()

    // validate if url is of an accepted/supported link (maybe use regex to check if the link is correctly an amazon product link)

    console.log('Form Data:', submittedData);
  };

  const clearForm = () => {
    // Clear the form inputs if desired
    setUrl('');
    setPrice('');
    setProductName('');
    setCategory('');
  }

  const clearData = (event) => {
    event.preventDefault();
    clearForm();
    setSubmittedData(null);
    alert('Data cleared')
  };
  const confirmData = (event) => {
    event.preventDefault();
    clearForm();
    setSubmittedData(null);

    fetch(`http://localhost:8000/submit-product`, {
      method: 'POST',
      credentials: 'include', // Include credentials for session management
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, url, price, productName, category }),
      credentials: 'include'
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Network response was not ok');
        }
        return res.json();
      })
      .then((data) => {
        if (data.save) {
          alert(data.message);
        } else {
          alert(data.error);
        }
      })
      .catch((error) => {
        console.error('There was a problem with the fetch operation:', error);
      });
  };
  const editData = event => {
    event.preventDefault();
    setEdittingData(true)
  }
  return (
    <div className='container'>
      {(!submittedData || edittingData) && (
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

      {/* Conditionally render the submitted data */}
      {submittedData && (
        <div className="submitted-data">
          <h2>Submitted Data:</h2>
          <p><strong>URL:</strong> {submittedData.url}</p>
          <p><strong>Price:</strong> {submittedData.price}</p>
          {submittedData.productName && <p><strong>Product Name:</strong> {submittedData.productName}</p>}
          {submittedData.category && <p><strong>Category:</strong> {submittedData.category}</p>}
          <div className='data-btns'>
            <button onClick={editData}>Edit</button>
            <button onClick={clearData}>Clear</button>
            <button onClick={confirmData}>Confirm</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddProduct;