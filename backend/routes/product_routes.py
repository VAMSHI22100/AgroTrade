from flask import Blueprint

from controllers.product_controller import (
    create_product,
    get_products,
    recover_images,
    serve_uploaded_image,
)

product_bp = Blueprint("product_bp", __name__)

product_bp.route("/uploaded-images/<path:filename>", methods=["GET"])(
    serve_uploaded_image
)
product_bp.route("/products/recover-images", methods=["PUT"])(recover_images)
product_bp.route("/add_product", methods=["POST"])(create_product)
product_bp.route("/products", methods=["GET"])(get_products)
