import MySQLdb
import os

# Database configuration
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "2210")

# Read the schema file
with open("../database/schema.sql", "r") as f:
    schema = f.read()


def column_exists(cursor, table_name, column_name):
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s
        """,
        ("agrotrade1", table_name, column_name),
    )
    return cursor.fetchone()[0] > 0


def table_exists(cursor, table_name):
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s
        """,
        ("agrotrade1", table_name),
    )
    return cursor.fetchone()[0] > 0


def apply_legacy_migrations(cursor):
    # Keep old databases compatible with new backend fields.
    if table_exists(cursor, "users") and not column_exists(cursor, "users", "role"):
        cursor.execute(
            "ALTER TABLE users ADD COLUMN role ENUM('buyer','farmer') NOT NULL DEFAULT 'buyer'"
        )

    if table_exists(cursor, "products"):
        if not column_exists(cursor, "products", "seller_id"):
            cursor.execute("ALTER TABLE products ADD COLUMN seller_id INT DEFAULT 0")
        if not column_exists(cursor, "products", "quantity"):
            cursor.execute("ALTER TABLE products ADD COLUMN quantity INT DEFAULT 0")

        # Uploaded images can be data URLs and exceed VARCHAR/TEXT limits.
        cursor.execute(
            """
            SELECT DATA_TYPE
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s
            """,
            ("agrotrade1", "products", "image"),
        )
        image_type_row = cursor.fetchone()
        if image_type_row and str(image_type_row[0]).lower() in (
            "varchar",
            "char",
            "text",
        ):
            cursor.execute("ALTER TABLE products MODIFY COLUMN image MEDIUMTEXT")

        # Keep uploaded data URLs intact so previously uploaded product images remain recoverable.

    if table_exists(cursor, "orders"):
        if not column_exists(cursor, "orders", "seller_id"):
            cursor.execute("ALTER TABLE orders ADD COLUMN seller_id INT")
        if not column_exists(cursor, "orders", "status"):
            cursor.execute(
                "ALTER TABLE orders ADD COLUMN status ENUM('pending','completed','cancelled') DEFAULT 'pending'"
            )
        if not column_exists(cursor, "orders", "created_at"):
            cursor.execute(
                "ALTER TABLE orders ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
            )

    if not table_exists(cursor, "delivery_ratings"):
        cursor.execute(
            """
            CREATE TABLE delivery_ratings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT,
                seller_id INT,
                buyer_id INT,
                rating INT CHECK (rating >= 1 AND rating <= 5),
                comment VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id),
                FOREIGN KEY (seller_id) REFERENCES users(id),
                FOREIGN KEY (buyer_id) REFERENCES users(id)
            )
            """
        )

    if not table_exists(cursor, "payments"):
        cursor.execute(
            """
            CREATE TABLE payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                user_id INT NOT NULL,
                amount FLOAT NOT NULL,
                currency VARCHAR(10) NOT NULL DEFAULT 'INR',
                provider ENUM('razorpay', 'cod') NOT NULL DEFAULT 'razorpay',
                payment_method VARCHAR(50),
                provider_order_id VARCHAR(100),
                provider_payment_id VARCHAR(100),
                provider_signature VARCHAR(255),
                status ENUM('created', 'authorized', 'captured', 'failed', 'refunded') DEFAULT 'created',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE KEY unique_provider_payment_id (provider_payment_id)
            )
            """
        )


try:
    # Connect to MySQL (without selecting a database initially)
    conn = MySQLdb.connect(host=MYSQL_HOST, user=MYSQL_USER, passwd=MYSQL_PASSWORD)
    cursor = conn.cursor()

    # Execute each SQL statement from the schema for fresh setup
    statements = schema.split(";")
    for statement in statements:
        statement = statement.strip()
        if statement:
            try:
                cursor.execute(statement)
            except MySQLdb.Error as statement_error:
                # Ignore "already exists" errors so setup remains re-runnable.
                if statement_error.args and statement_error.args[0] != 1050:
                    raise

    # Ensure existing databases get newer columns/tables.
    cursor.execute("USE agrotrade1")
    apply_legacy_migrations(cursor)

    conn.commit()
    print("✓ Database setup complete!")
    print("  - Database: agrotrade1")
    print(
        "  - Tables: users, products, orders, order_items, delivery_ratings, payments"
    )
    print("  - Legacy schema migrations applied")

except MySQLdb.Error as e:
    print(f"✗ Database error: {e}")
except Exception as e:
    print(f"✗ Error: {e}")
finally:
    if "cursor" in locals():
        cursor.close()
    if "conn" in locals():
        conn.close()
