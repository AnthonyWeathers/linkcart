import React, { useState, useEffect } from 'react';

const ProductForm = ({ 
  initialData, 
  handleSubmit, 
  categories, 
  showCancelButton = false,
  handleCancel = null, // Default value 
}) => {
  const [url, setUrl] = useState('');
  const [price, setPrice] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState([]);

  // Initialize the form with product data
  useEffect(() => {
    if (initialData) {
      setUrl(initialData.url || '');
      setPrice(initialData.price || '');
      setProductName(initialData.productName || '');
      setCategory(initialData.category || []);
    }
  }, [initialData]);

  const handleLocalSubmit = (e) => {
    e.preventDefault();
    handleSubmit({ url, price, productName, category });
  };

  return (
    <form className='product-link' onSubmit={handleLocalSubmit}>
      <div>
        <label>Product URL:</label>
        <input 
          type='url' 
          required 
          placeholder='Enter url link of a product' 
          value={url} 
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      <div>
        <label>Price:</label>
        <input 
          type='number' 
          placeholder='Price of the product' 
          value={price} 
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>

      <div>
        <label>Product Name:</label>
        <input 
          type='text' 
          placeholder='Product name (optional)' 
          value={productName} 
          onChange={(e) => setProductName(e.target.value)}
        />
      </div>

      <div>
        <label>Categories:</label>
        <select
          multiple
          value={category}
          onChange={(e) =>
            setCategory([...e.target.selectedOptions].map((opt) => opt.value))
          }
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <button type='submit'>Submit</button>

      {showCancelButton && (
        <button
          type="button"
          onClick={() => {
            if (handleCancel) {
              handleCancel(); // Call the passed-in function
            }
          }}
        >
          Cancel
        </button>
      )}
    </form>
  );
};

export default ProductForm;