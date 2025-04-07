import { useState } from "react";
import ProductForm from "./ProductForm";
import { toast } from "react-toastify";

const AddProduct = () => {
  const [submittedData, setSubmittedData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [categories] = useState([
    "Electronics",
    "Books",
    "Fashion",
    "Home",
    "Toys",
    "Sports",
    "Gadgets",
    "Accessories",
    "Kitchen",
    "Office",
    "Tools",
  ]);

  const clearForm = () => {
    setSubmittedData(null);
    toast.info("Data cleared");
  };

  const handleSubmit = (formData) => {
    const normalizedCategory = Array.isArray(formData.category)
      ? formData.category
      : formData.category
      ? [formData.category]
      : [];

    setSubmittedData({
      ...formData,
      category: normalizedCategory,
    });

    setIsEditing(false);
  };

  const confirmData = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(
        `http://localhost:8000/products/submit-product`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...submittedData,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      if (data.save) {
        toast.success(data.message);
        clearForm();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("There was a problem with the fetch operation:", error);
    }
  };

  const editData = () => {
    setIsEditing(true);
  };

  return (
    <div className="container">
      {(!submittedData || isEditing) && (
        <div className="add-product-container">
          <ProductForm
            initialData={{
              url: submittedData?.url || "",
              price: submittedData?.price || "",
              productName: submittedData?.productName || "",
              category: Array.isArray(submittedData?.category)
                ? submittedData.category
                : submittedData?.category
                ? [submittedData.category]
                : [],
            }}
            handleSubmit={handleSubmit}
            categories={categories}
          />
        </div>
      )}

      {submittedData && !isEditing && (
        <div className="submitted-data">
          <h2>Submitted Data:</h2>
          <p>
            <strong>URL:</strong> {submittedData.url}
          </p>
          <p>
            <strong>Price:</strong> {submittedData.price}
          </p>
          {submittedData.productName && (
            <p>
              <strong>Product Name:</strong> {submittedData.productName}
            </p>
          )}
          {submittedData.category && (
            <p>
              <strong>Category:</strong>{" "}
              {submittedData.category.map((cat, index) => (
                <span key={index} className="category-tag">
                  {cat}
                </span>
              ))}
            </p>
          )}
          <div className="data-btns">
            <button onClick={editData}>Edit</button>
            <button onClick={clearForm}>Clear</button>
            <button onClick={confirmData}>Confirm</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddProduct;
