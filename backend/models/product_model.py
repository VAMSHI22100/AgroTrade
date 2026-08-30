from database.db import mysql
from utils.helpers import normalize_product_image


def migrate_inline_product_images(cur):
    cur.execute("SELECT id, image FROM products WHERE image LIKE 'data:image/%'")
    rows = cur.fetchall()
    for row in rows:
        product_id = row[0]
        image_value = row[1]
        normalized = normalize_product_image(image_value)
        if normalized and normalized.startswith("/uploaded-images/"):
            cur.execute(
                "UPDATE products SET image=%s WHERE id=%s", (normalized, product_id)
            )


def mock_products():
    return [
        {
            "id": 1,
            "name": "Fresh Tomatoes",
            "price": 45,
            "description": "Organic red tomatoes from local farms",
            "image": "tomato.jpg",
            "seller_id": 0,
            "quantity": 0,
        },
        {
            "id": 2,
            "name": "Carrots",
            "price": 30,
            "description": "Sweet orange carrots",
            "image": "carrot.jpg",
            "seller_id": 0,
            "quantity": 0,
        },
        {
            "id": 3,
            "name": "Wheat Flour",
            "price": 120,
            "description": "Fine wheat flour 5kg",
            "image": "wheat.jpg",
            "seller_id": 0,
            "quantity": 0,
        },
    ]


def seed_products_if_empty(cur):
    cur.execute("SELECT COUNT(*) FROM products")
    count = cur.fetchone()[0]
    if count > 0:
        return

    for product in mock_products():
        cur.execute(
            "INSERT INTO products(name,price,description,image,seller_id,quantity) VALUES(%s,%s,%s,%s,%s,%s)",
            (
                product["name"],
                product["price"],
                product["description"],
                product["image"],
                product.get("seller_id", 0),
                product["quantity"],
            ),
        )


def add_product(data):
    image_value = normalize_product_image(data.get("image"))
    cur = mysql.connection.cursor()
    cur.execute(
        "INSERT INTO products(name,price,description,image,seller_id,quantity) VALUES(%s,%s,%s,%s,%s,%s)",
        (
            data["name"],
            data["price"],
            data["description"],
            image_value,
            data["seller_id"],
            data["quantity"],
        ),
    )
    product_id = cur.lastrowid
    mysql.connection.commit()
    return product_id


def list_products():
    cur = mysql.connection.cursor()
    seed_products_if_empty(cur)
    migrate_inline_product_images(cur)
    mysql.connection.commit()

    cur.execute(
        "SELECT id, name, price, description, image, seller_id, quantity FROM products"
    )
    rows = cur.fetchall()

    if not rows:
        return mock_products()

    products = []
    for row in rows:
        products.append(
            {
                "id": row[0],
                "name": row[1],
                "price": row[2],
                "description": row[3],
                "image": normalize_product_image(row[4]),
                "seller_id": row[5],
                "quantity": row[6],
            }
        )
    return products


def recover_product_images(products):
    cur = mysql.connection.cursor()
    updated_ids = []
    for item in products:
        product_id = item.get("product_id")
        image_value = item.get("image")

        if not product_id or not isinstance(image_value, str):
            continue

        image_value = image_value.strip()
        if not image_value.startswith("data:image/"):
            continue

        cur.execute(
            """
            UPDATE products
            SET image=%s
            WHERE id=%s AND image='uploaded-image'
            """,
            (image_value, product_id),
        )

        if cur.rowcount > 0:
            updated_ids.append(product_id)

    mysql.connection.commit()
    return updated_ids
