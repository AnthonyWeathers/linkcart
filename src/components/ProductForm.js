// import React from 'react';

// const ProductForm = ({ url, setUrl, price, setPrice, productName, setProductName, category, setCategory, handleSubmit }) => (
//   <form className='product-link' onSubmit={handleSubmit}>
//     <input 
//       type='url' 
//       required 
//       placeholder='Enter url link of a product' 
//       value={url} 
//       onChange={(e) => setUrl(e.target.value)}
//     />
//     <input 
//       type='text' 
//       placeholder='Price of the product' 
//       value={price} 
//       onChange={(e) => setPrice(e.target.value)}
//     />
//     <input 
//       type='text' 
//       placeholder='Product name (optional)' 
//       value={productName} 
//       onChange={(e) => setProductName(e.target.value)}
//     />
//     <input 
//       type='text' 
//       placeholder='Category (optional)' 
//       value={category} 
//       onChange={(e) => setCategory(e.target.value)}
//     />
//     <button type='submit'>Submit</button>
//   </form>
// );

// export default ProductForm;

import React, { useState, useEffect } from 'react';

const ProductForm = ({ initialData, handleSubmit }) => {
  const [url, setUrl] = useState('');
  const [price, setPrice] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');

  // Initialize the form with product data
  useEffect(() => {
    if (initialData) {
      setUrl(initialData.url || '');
      setPrice(initialData.price || '');
      setProductName(initialData.productName || '');
      setCategory(initialData.category || '');
    }
  }, [initialData]);

  const handleLocalSubmit = (e) => {
    e.preventDefault();
    handleSubmit({ url, price, productName, category });
  };

  return (
    <form className='product-link' onSubmit={handleLocalSubmit}>
      <input 
        type='url' 
        required 
        placeholder='Enter url link of a product' 
        value={url} 
        onChange={(e) => setUrl(e.target.value)}
      />
      <input 
        type='text' 
        placeholder='Price of the product' 
        value={price} 
        onChange={(e) => setPrice(e.target.value)}
      />
      <input 
        type='text' 
        placeholder='Product name (optional)' 
        value={productName} 
        onChange={(e) => setProductName(e.target.value)}
      />
      <input 
        type='text' 
        placeholder='Category (optional)' 
        value={category} 
        onChange={(e) => setCategory(e.target.value)}
      />
      <button type='submit'>Submit</button>
    </form>
  );
};

export default ProductForm;