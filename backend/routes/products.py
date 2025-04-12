from flask import Blueprint, request, jsonify
from extensions import csrf, limiter
from token_utils import token_required
import crud
import logging
import re

products_bp = Blueprint('products', __name__, url_prefix='/products')
    
@products_bp.route("/submit-product", methods=["POST"])
@csrf.exempt
@token_required
@limiter.limit("10/minute")
def save():
    try:
        user = request.user_payload
        currentUser_id = user['user_id']
        logging.info("User %s is attempting to save a product", currentUser_id)
        
        url = request.json.get("url")
        price = request.json.get("price")
        productName = request.json.get("productName")
        category = request.json.get("category", [])

        if price is None:
            return jsonify({"error": "Invalid price format"}), 400

        product = crud.create_product(currentUser_id, url, price, productName, category)
        if product:
            logging.info("User %s successfully saved a product", currentUser_id)
            return jsonify({
                    "save": True,
                    "message": 'Product added'
            }), 201
        else:
            logging.error("Failed to save product for user %s", currentUser_id)
            return jsonify({
                "save": False,
                "message": 'Failed to add product'
            })
    except Exception as e:
        logging.exception("Error saving product for user %s", currentUser_id)
        return jsonify({"error": "An error occurred while adding the product", "details": str(e)}), 500

@products_bp.route("/delete-product", methods=["DELETE"])
@csrf.exempt
@token_required
@limiter.limit("5/minute")
def delete():
    try:
        user = request.user_payload
        currentUser_id = user['user_id']
        logging.info("User %s is attempting to delete a product", currentUser_id)
        
        productId = int(request.json.get("id"))
        if not productId:
            logging.warning("User %s failed to provide a product ID for deletion", currentUser_id)
            return jsonify({"error": "Product ID is required"}), 400

        product = crud.get_product_by_id(user_id=currentUser_id, id=productId)
        if not product:
            logging.warning("User %s attempted to delete a nonexistent product", currentUser_id)
            return jsonify({"error": "Product not found"}), 404
        
        if product.user_id != currentUser_id:
            logging.warning("User %s attempted to delete an unauthorized product", currentUser_id)
            return jsonify({"error": "Access denied"}), 403

        crud.delete_product(productId)
        logging.info("User %s successfully deleted product %s", currentUser_id, productId)

        return jsonify({
            "message": "Product deleted",
        })
    except Exception as e:
        logging.exception("Error deleting product for user %s", currentUser_id)
        return jsonify({"error": "Failed to delete product", "details": str(e)}), 500

@products_bp.route("/", methods=["GET"])
@token_required
@limiter.limit("20/minute")
def getProducts():
    try:
        user = request.user_payload
        currentUser_id = user['user_id']
        logging.info("User %s is fetching their products", currentUser_id)

        sort_by = request.args.get('sortBy', default=None, type=str)
        extra_sort_by = request.args.get('extraSortBy', default=None, type=str)
        min_price = request.args.get('minPrice', default=None, type=float)
        max_price = request.args.get('maxPrice', default=None, type=float)
        category_filter = request.args.get('categoryFilter', default=None, type=str)
        page = request.args.get('page', default=1, type=int)
        limit = request.args.get('limit', default=10, type=int)
        
        offset = (page - 1) * limit

        favorited = True if sort_by == 'favorited' else None

        total_products = crud.count_products(
            user_id=currentUser_id,
            min_price=min_price,
            max_price=max_price,
            category_filter=category_filter,
            favorited=favorited,
        )

        total_pages = (total_products + limit - 1) // limit

        user_products = crud.get_products(
            user_id=currentUser_id,
            sort_by=sort_by,
            extra_sort_by=extra_sort_by,
            min_price=min_price,
            max_price=max_price,
            category_filter=category_filter,
            favorited=favorited,
            limit=limit,
            offset=offset
        )

        user_products_data = [product.to_dict() for product in user_products]

        return jsonify({
            "message": "User products fetched successfully",
            "products": user_products_data,
            "page": page,
            "totalPages": total_pages
        })

    except Exception as e:
        logging.exception("Error fetching products for user %s", currentUser_id)
        return jsonify({"error": "Failed to fetch products", "details": str(e)}), 500

@products_bp.route("/edit-product", methods=["PUT"])
@csrf.exempt
@token_required
@limiter.limit("5/minute")
def editProduct():
    try:
        user = request.user_payload
        currentUser_id = user['user_id']
        logging.info("User %s is attempting to edit a product", currentUser_id)

        product_id = int(request.json.get("id"))
        if not product_id: #or not all([url, price, productName, category]):
            logging.warning("User %s failed to provide a product ID for editing", currentUser_id)
            return jsonify({"error": "Missing product or required fields"}), 400

        product = crud.get_product_by_id(user_id=currentUser_id, product_id=product_id)
        if not product:
            logging.warning("User %s attempted to edit a nonexistent product", currentUser_id)
            return jsonify({"error": "Product not found"}), 404
        
        if product.user_id != currentUser_id:
            logging.warning("User %s attempted to edit an unauthorized product", currentUser_id)
            return jsonify({"error": "Access denied"}), 403
        
        price = request.json.get("price")

        if price is None:
            return jsonify({"error": "Invalid price format"}), 400

        updated_product = crud.update_product(
            product_id, 
            url=request.json.get("url"), 
            price=price, 
            productName=request.json.get("productName"), 
            category=request.json.get("category")
        )
        if updated_product:
            logging.info("User %s successfully edited product %s", currentUser_id, product_id)
            return jsonify({
                "product": updated_product.to_dict()
            })

        logging.error("Failed to edit product %s for user %s", product_id, currentUser_id)
        return jsonify({
            "error": 'Error occurred while updating product'
        }), 400
    except Exception as e:
        logging.exception("Error editing product for user %s", currentUser_id)
        return jsonify({"error": "Failed to edit product", "details": str(e)}), 500
    
@products_bp.route("/favorite-product", methods=["PUT"])
@csrf.exempt
@token_required
@limiter.limit("5/minute")
def favoriteProduct():
    try:
        user = request.user_payload
        currentUser_id = user['user_id']
        productId = int(request.json.get("id"))
        if not productId:
            logging.warning("User %s failed to provide a product ID for favoriting", currentUser_id)
            return jsonify({"error": "Product ID is required"}), 400
        
        product = crud.get_product_by_id(user_id=currentUser_id, product_id=productId)
        if not product:
            logging.warning("User %s attempted to favorite a nonexistent product", currentUser_id)
            return jsonify({"error": "Product not found"}), 404
        
        if product.user_id != currentUser_id:
            logging.warning("User %s attempted to favorite an unauthorized product", currentUser_id)
            return jsonify({"error": "Access denied"}), 403
        
        updated_product = crud.toggle_favorited(productId)
        if updated_product:
            logging.info("User %s successfully favorited product %s", currentUser_id, productId)
            return jsonify({
                    "favorited": updated_product.favorited
            })
        logging.error("Failed to favorite product %s for user %s", productId, currentUser_id)
        return jsonify({
            "error": "Product favoriting process failed"
        }), 400
    except Exception as e:
        logging.exception("Error favoriting product for user %s", currentUser_id)
        return jsonify({"error": "Failed to toggle favorite", "details": str(e)}), 500