import os
import time

import bcrypt
from dotenv import load_dotenv  # type: ignore[import-not-found]
from flask import Flask, jsonify, request
from flask_cors import CORS

from config import Config
from database.db import init_db, mysql
from routes.auth_routes import auth_bp
from routes.product_routes import product_bp

try:
    import razorpay  # type: ignore[import-not-found]
except ImportError:
    razorpay = None

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

app = Flask(__name__)
CORS(app)

app.config.from_object(Config)

init_db(app)

app.register_blueprint(auth_bp)
app.register_blueprint(product_bp)


def ensure_delivery_rating_schema():
    try:
        cur = mysql.connection.cursor()
        cur.execute(
            """
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA=%s AND TABLE_NAME='delivery_ratings' AND COLUMN_NAME='product_id'
            """,
            (app.config["MYSQL_DB"],),
        )

        if not cur.fetchone():
            cur.execute(
                "ALTER TABLE delivery_ratings ADD COLUMN product_id INT NULL AFTER order_id"
            )

        cur.execute(
            "SHOW INDEX FROM delivery_ratings WHERE Key_name = 'unique_delivery_rating'"
        )
        if not cur.fetchone():
            cur.execute(
                "ALTER TABLE delivery_ratings ADD UNIQUE KEY unique_delivery_rating (order_id, product_id, buyer_id)"
            )

        mysql.connection.commit()
    except Exception:
        try:
            mysql.connection.rollback()
        except Exception:
            pass


with app.app_context():
    ensure_delivery_rating_schema()


def get_razorpay_client():
    if razorpay is None:
        return None, ""

    key_id = os.getenv("RAZORPAY_KEY_ID", "").strip()
    key_secret = os.getenv("RAZORPAY_KEY_SECRET", "").strip()

    if not key_id or not key_secret:
        return None, key_id

    client = razorpay.Client(auth=(key_id, key_secret))
    return client, key_id


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "agrotrade-backend"})


@app.route("/farmer/dashboard/<int:farmer_id>", methods=["GET"])
def farmer_dashboard(farmer_id):
    try:
        cur = mysql.connection.cursor()

        cur.execute(
            """
            SELECT COUNT(DISTINCT oi.id) as total_items_sold,
                   SUM(o.total) as total_income
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.seller_id = %s AND o.status IN ('approved', 'completed')
            """,
            (farmer_id,),
        )
        sales_data = cur.fetchone()
        total_items = sales_data[0] or 0
        total_income = sales_data[1] or 0

        cur.execute(
            """
            SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings
            FROM delivery_ratings
            WHERE seller_id = %s
            """,
            (farmer_id,),
        )
        ratings_data = cur.fetchone()
        avg_rating = ratings_data[0] or 0
        total_ratings = ratings_data[1] or 0

        cur.execute(
            """
            SELECT o.id, o.total, o.created_at, u.name, o.status,
                 (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count,
                   (SELECT AVG(rating) FROM delivery_ratings WHERE order_id = o.id) as rating,
                   (SELECT comment FROM delivery_ratings WHERE order_id = o.id LIMIT 1) as comment
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE o.seller_id = %s
            ORDER BY o.created_at DESC
            LIMIT 10
            """,
            (farmer_id,),
        )
        orders = cur.fetchall()
        recent_orders = []
        for order in orders:
            recent_orders.append(
                {
                    "order_id": order[0],
                    "total": order[1],
                    "date": str(order[2]),
                    "customer_name": order[3],
                    "status": order[4],
                    "item_count": int(order[5] or 0),
                    "rating": float(order[6]) if order[6] else None,
                    "comment": order[7],
                }
            )

        return jsonify(
            {
                "total_items_sold": total_items,
                "total_income": float(total_income),
                "average_rating": float(avg_rating),
                "total_ratings": total_ratings,
                "recent_orders": recent_orders,
            }
        )
    except Exception as exc:
        return jsonify({"message": "Failed to fetch dashboard", "error": str(exc)}), 500


@app.route("/rating", methods=["POST"])
def add_delivery_rating():
    data = request.get_json(silent=True) or {}
    order_id = data.get("order_id")
    product_id = data.get("product_id")
    seller_id = data.get("seller_id")
    buyer_id = data.get("buyer_id")
    rating = data.get("rating")
    comment = data.get("comment", "")

    if not all([order_id, product_id, seller_id, buyer_id, rating]):
        return (
            jsonify(
                {
                    "message": "order_id, product_id, seller_id, buyer_id, and rating are required"
                }
            ),
            400,
        )

    try:
        order_id = int(order_id)
        product_id = int(product_id)
        seller_id = int(seller_id)
        buyer_id = int(buyer_id)
        rating = int(rating)
    except (TypeError, ValueError):
        return jsonify(
            {
                "message": "order_id, product_id, seller_id, buyer_id and rating must be valid numbers"
            }
        ), 400

    if rating < 1 or rating > 5:
        return jsonify({"message": "rating must be between 1 and 5"}), 400

    try:
        cur = mysql.connection.cursor()
        cur.execute(
            "SELECT user_id, seller_id, status FROM orders WHERE id=%s", (order_id,)
        )
        order_row = cur.fetchone()
        if not order_row:
            return jsonify({"message": "Order not found"}), 404

        if int(order_row[0]) != buyer_id:
            return jsonify({"message": "You can only review your own orders"}), 403

        if int(order_row[1]) != seller_id:
            return jsonify({"message": "Seller does not match this order"}), 400

        if (order_row[2] or "pending") not in {"approved", "completed"}:
            return jsonify(
                {"message": "You can review items only after the order is approved"}
            ), 400

        cur.execute(
            "SELECT 1 FROM order_items WHERE order_id=%s AND product_id=%s",
            (order_id, product_id),
        )
        if not cur.fetchone():
            return jsonify(
                {"message": "The selected product is not part of this order"}
            ), 400

        cur.execute(
            """
            INSERT INTO delivery_ratings(order_id, product_id, seller_id, buyer_id, rating, comment)
            VALUES(%s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                rating=VALUES(rating),
                comment=VALUES(comment),
                seller_id=VALUES(seller_id)
            """,
            (order_id, product_id, seller_id, buyer_id, rating, comment),
        )
        mysql.connection.commit()
        return jsonify(
            {"message": "Rating added", "product_id": product_id, "order_id": order_id}
        ), 201
    except Exception as exc:
        return jsonify({"message": "Failed to add rating", "error": str(exc)}), 500


@app.route("/order", methods=["POST"])
def place_order():
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    seller_id = data.get("seller_id")
    items = data.get("items")
    total = data.get("total")

    if not user_id or not isinstance(items, list) or not items or total is None:
        return jsonify({"message": "user_id, items and total are required"}), 400

    try:
        cur = mysql.connection.cursor()

        product_ids = [item.get("product_id") for item in items]
        if any(product_id is None for product_id in product_ids):
            return jsonify({"message": "Each item must include product_id"}), 400

        requested_quantities = {}
        for item in items:
            product_id = item.get("product_id")
            quantity = item.get("quantity", 1)
            if not isinstance(quantity, int) or quantity <= 0:
                return jsonify(
                    {"message": "Each item quantity must be a positive integer"}
                ), 400
            requested_quantities[product_id] = (
                requested_quantities.get(product_id, 0) + quantity
            )

        placeholders = ",".join(["%s"] * len(product_ids))
        cur.execute(
            f"SELECT id, quantity, seller_id FROM products WHERE id IN ({placeholders})",
            tuple(product_ids),
        )
        product_rows = cur.fetchall()
        existing_ids = {row[0] for row in product_rows}
        missing_ids = [
            product_id for product_id in product_ids if product_id not in existing_ids
        ]
        if missing_ids:
            return jsonify(
                {
                    "message": "Some products are not available in database",
                    "missing_product_ids": missing_ids,
                }
            ), 400

        insufficient_stock = []
        product_seller_ids = set()
        for row in product_rows:
            product_id = row[0]
            available_qty = int(row[1] or 0)
            requested_qty = requested_quantities.get(product_id, 0)

            if row[2] is not None:
                product_seller_ids.add(int(row[2]))

            if requested_qty > available_qty:
                insufficient_stock.append(
                    {
                        "product_id": product_id,
                        "requested": requested_qty,
                        "available": available_qty,
                    }
                )

        if insufficient_stock:
            return jsonify(
                {
                    "message": "Insufficient stock for one or more products",
                    "stock_issues": insufficient_stock,
                }
            ), 400

        effective_seller_id = seller_id
        if effective_seller_id is None and len(product_seller_ids) == 1:
            effective_seller_id = next(iter(product_seller_ids))

        cur.execute(
            "INSERT INTO orders(user_id,seller_id,total) VALUES(%s,%s,%s)",
            (user_id, effective_seller_id, total),
        )
        order_id = cur.lastrowid

        for item in items:
            cur.execute(
                "INSERT INTO order_items(order_id,product_id,quantity) VALUES(%s,%s,%s)",
                (order_id, item.get("product_id"), item.get("quantity", 1)),
            )

        for product_id, requested_qty in requested_quantities.items():
            cur.execute(
                "UPDATE products SET quantity = quantity - %s WHERE id = %s",
                (requested_qty, product_id),
            )

        mysql.connection.commit()
        return jsonify({"message": "Order placed", "order_id": order_id}), 201
    except Exception as exc:
        mysql.connection.rollback()
        return jsonify({"message": "Failed to place order", "error": str(exc)}), 500


@app.route("/payments/create-order", methods=["POST"])
def create_payment_order():
    data = request.get_json(silent=True) or {}
    amount = data.get("amount")
    currency = (data.get("currency") or "INR").strip().upper()

    if amount is None:
        return jsonify({"message": "amount is required"}), 400

    try:
        amount_value = float(amount)
    except (TypeError, ValueError):
        return jsonify({"message": "amount must be a valid number"}), 400

    if amount_value <= 0:
        return jsonify({"message": "amount must be greater than 0"}), 400

    client, key_id = get_razorpay_client()
    if not client:
        return jsonify(
            {
                "message": "Razorpay is not configured on backend",
                "missing": ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
            }
        ), 500

    amount_in_paise = int(round(amount_value * 100))
    receipt_id = f"agrotrade_{int(time.time() * 1000)}"

    try:
        payment_order = client.order.create(
            {
                "amount": amount_in_paise,
                "currency": currency,
                "receipt": receipt_id,
            }
        )

        return jsonify(
            {
                "key_id": key_id,
                "order_id": payment_order.get("id"),
                "amount": payment_order.get("amount"),
                "currency": payment_order.get("currency"),
                "receipt": payment_order.get("receipt"),
            }
        )
    except Exception as exc:
        return jsonify(
            {"message": "Failed to create payment order", "error": str(exc)}
        ), 500


@app.route("/payments/verify", methods=["POST"])
def verify_payment():
    data = request.get_json(silent=True) or {}
    razorpay_order_id = data.get("razorpay_order_id")
    razorpay_payment_id = data.get("razorpay_payment_id")
    razorpay_signature = data.get("razorpay_signature")

    if not razorpay_order_id or not razorpay_payment_id or not razorpay_signature:
        return jsonify(
            {
                "message": "razorpay_order_id, razorpay_payment_id and razorpay_signature are required"
            }
        ), 400

    client, _ = get_razorpay_client()
    if not client:
        return jsonify(
            {
                "message": "Razorpay is not configured on backend",
                "missing": ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
            }
        ), 500

    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            }
        )
        return jsonify({"verified": True, "message": "Payment verified"})
    except Exception:
        return jsonify(
            {"verified": False, "message": "Payment verification failed"}
        ), 400


@app.route("/orders/user/<int:user_id>", methods=["GET"])
def get_user_orders(user_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute(
            """
            SELECT id, total, status, created_at, seller_id
            FROM orders
            WHERE user_id=%s
            ORDER BY created_at DESC, id DESC
            """,
            (user_id,),
        )
        order_rows = cur.fetchall()

        orders = []
        for row in order_rows:
            order_id = row[0]
            cur.execute(
                """
                SELECT oi.product_id, oi.quantity, p.name, p.price,
                       dr.id, dr.rating, dr.comment
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
                LEFT JOIN delivery_ratings dr
                  ON dr.order_id = oi.order_id
                 AND dr.product_id = oi.product_id
                 AND dr.buyer_id = %s
                WHERE oi.order_id=%s
                """,
                (user_id, order_id),
            )
            item_rows = cur.fetchall()

            items = []
            for item in item_rows:
                item_price = float(item[3]) if item[3] is not None else 0.0
                quantity = int(item[1] or 0)
                review_id = item[4]
                review = None
                if review_id:
                    review = {
                        "id": review_id,
                        "rating": int(item[5]) if item[5] is not None else None,
                        "comment": item[6] or "",
                    }
                items.append(
                    {
                        "product_id": item[0],
                        "name": item[2] or "Unknown product",
                        "quantity": quantity,
                        "price": item_price,
                        "line_total": round(item_price * quantity, 2),
                        "review": review,
                    }
                )

            orders.append(
                {
                    "order_id": order_id,
                    "total": float(row[1] or 0),
                    "status": row[2] or "pending",
                    "created_at": str(row[3]),
                    "seller_id": row[4],
                    "items": items,
                }
            )

        return jsonify(orders)
    except Exception as exc:
        return jsonify(
            {"message": "Failed to fetch user orders", "error": str(exc)}
        ), 500


@app.route("/orders/<int:order_id>/approve", methods=["PUT"])
def approve_order(order_id):
    data = request.get_json(silent=True) or {}
    farmer_id = data.get("farmer_id")

    if not farmer_id:
        return jsonify({"message": "farmer_id is required"}), 400

    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT seller_id, status FROM orders WHERE id=%s", (order_id,))
        order_row = cur.fetchone()

        if not order_row:
            return jsonify({"message": "Order not found"}), 404

        if int(order_row[0]) != int(farmer_id):
            return jsonify({"message": "You can only approve your own orders"}), 403

        if order_row[1] != "pending":
            return jsonify(
                {
                    "message": f"Only pending orders can be approved. Current status: {order_row[1]}",
                    "status": order_row[1],
                }
            ), 400

        cur.execute("UPDATE orders SET status=%s WHERE id=%s", ("approved", order_id))
        mysql.connection.commit()

        return jsonify(
            {
                "message": "Order approved successfully",
                "order_id": order_id,
                "status": "approved",
            }
        )
    except Exception as exc:
        if "Data truncated for column 'status'" in str(exc):
            return jsonify(
                {
                    "message": "Order status enum does not include 'approved'. Update your database schema.",
                    "error": str(exc),
                }
            ), 500
        return jsonify({"message": "Failed to approve order", "error": str(exc)}), 500


@app.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    new_password = data.get("new_password")

    if not email or not new_password:
        return jsonify({"message": "email and new_password are required"}), 400

    if len(new_password) < 6:
        return jsonify({"message": "Password must be at least 6 characters long"}), 400

    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT id FROM users WHERE email=%s", (email,))
        user = cur.fetchone()

        if not user:
            return jsonify({"message": "User not found"}), 404

        hashed_password = bcrypt.hashpw(
            new_password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")
        cur.execute(
            "UPDATE users SET password=%s WHERE email=%s", (hashed_password, email)
        )
        mysql.connection.commit()

        return jsonify({"message": "Password reset successfully"}), 200
    except Exception as exc:
        return jsonify({"message": "Password reset failed", "error": str(exc)}), 500


@app.route("/profile", methods=["PUT"])
def update_profile():
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()

    if not user_id:
        return jsonify({"message": "user_id is required"}), 400

    if not name or not email:
        return jsonify({"message": "name and email are required"}), 400

    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT id FROM users WHERE id=%s", (user_id,))
        existing_user = cur.fetchone()

        if not existing_user:
            return jsonify({"message": "User not found"}), 404

        cur.execute("SELECT id FROM users WHERE email=%s AND id<>%s", (email, user_id))
        email_owner = cur.fetchone()
        if email_owner:
            return jsonify({"message": "Email is already in use"}), 409

        cur.execute(
            "UPDATE users SET name=%s, email=%s WHERE id=%s", (name, email, user_id)
        )
        mysql.connection.commit()

        return jsonify(
            {
                "message": "Profile updated successfully",
                "user": {"id": int(user_id), "name": name, "email": email},
            }
        ), 200
    except Exception as exc:
        return jsonify({"message": "Failed to update profile", "error": str(exc)}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
