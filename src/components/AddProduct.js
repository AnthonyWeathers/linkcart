import React, { useState } from 'react';
import ProductForm from './ProductForm';

const AddProduct = ({ user }) => {

  // State to store the submitted data
  const [submittedData, setSubmittedData] = useState(null);
  // State to check if user is editting data on form
  const [isEditing, setIsEditing] = useState(false);

  if (!user) {
    return <p>Please log in to add a product.</p>;
  }

  // Clear the form and submitted data
  const clearForm = () => {
    // (event) => {
    //   event.preventDefault();
    setSubmittedData(null);
    // setIsEditing(false);
    alert('Data cleared')
  };

  // Handle form submission
  const handleSubmit = (formData) => {
    setSubmittedData(formData);
    setIsEditing(false);
    console.log('Form Data:', formData);
  };

  const confirmData = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(`http://localhost:8000/submit-product`, {
        method: 'POST',
        credentials: 'include', // Include credentials for session management
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          ...submittedData,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      if (data.save) {
        alert(data.message);
        clearForm();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('There was a problem with the fetch operation:', error);
    }
  }

  // Enable editing mode
  const editData = () => {
    setIsEditing(true);
  };

  return (
    <div className='container'>
      {(!submittedData || isEditing) && (
        <ProductForm
          initialData={{
            url: submittedData?.url || '',
            price: submittedData?.price || '',
            productName: submittedData?.productName || '',
            category: submittedData?.category || '',
          }}
          handleSubmit={handleSubmit}
        />
      )}

      {/* Conditionally render the submitted data */}
      {submittedData && !isEditing && (
        <div className="submitted-data">
          <h2>Submitted Data:</h2>
          <p><strong>URL:</strong> {submittedData.url}</p>
          <p><strong>Price:</strong> {submittedData.price}</p>
          {submittedData.productName && <p><strong>Product Name:</strong> {submittedData.productName}</p>}
          {submittedData.category && <p><strong>Category:</strong> {submittedData.category}</p>}
          <div className='data-btns'>
            <button onClick={editData}>Edit</button>
            <button onClick={clearForm}>Clear</button>
            <button onClick={confirmData}>Confirm</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddProduct;