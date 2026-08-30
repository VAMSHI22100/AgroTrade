from flask import jsonify, request, send_from_directory

from models.product_model import (
    add_product,
    list_products,
    mock_products,
    recover_product_images,
)
from utils.helpers import UPLOAD_IMAGES_DIR


def serve_uploaded_image(filename):
    return send_from_directory(UPLOAD_IMAGES_DIR, filename)


def create_product():
    data = request.get_json(silent=True) or {}

    required_fields = ["name", "price", "description", "image", "seller_id", "quantity"]
    missing = [field for field in required_fields if field not in data]
    if missing:
        return jsonify(
            {"message": f"Missing required fields: {', '.join(missing)}"}
        ), 400

    try:
        product_id = add_product(data)
        return jsonify({"message": "Product added", "product_id": product_id}), 201
    except Exception as exc:
        if "Data too long for column 'image'" in str(exc):
            return jsonify(
                {
                    "message": "Image data is too large. Use a shorter image URL or increase DB column size.",
                    "error": str(exc),
                }
            ), 400
        return jsonify({"message": "Failed to add product", "error": str(exc)}), 500


def get_products():
    try:
        return jsonify(list_products())
    except Exception:
        return jsonify(mock_products())


def recover_images():
    data = request.get_json(silent=True) or {}
    products = data.get("products")

    if not isinstance(products, list) or not products:
        return jsonify({"message": "products array is required"}), 400

    try:
        updated_ids = recover_product_images(products)
        return jsonify(
            {
                "message": "Image recovery completed",
                "updated_count": len(updated_ids),
                "updated_product_ids": updated_ids,
            }
        )
    except Exception as exc:
        return jsonify({"message": "Failed to recover images", "error": str(exc)}), 500
