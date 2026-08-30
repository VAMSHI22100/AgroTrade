import MySQLdb

conn = MySQLdb.connect(host="127.0.0.1", user="root", passwd="2210", db="agrotrade1")
cur = conn.cursor()

try:
    # Check if role column exists
    cur.execute("SHOW COLUMNS FROM users LIKE 'role'")
    if cur.fetchone():
        print("✓ role column already exists")
    else:
        # Add role column
        cur.execute(
            'ALTER TABLE users ADD COLUMN role ENUM("buyer", "farmer") NOT NULL DEFAULT "buyer"'
        )
        conn.commit()
        print("✓ role column added to users table")

    # Ensure orders.status includes approved state.
    cur.execute("SHOW COLUMNS FROM orders LIKE 'status'")
    status_column = cur.fetchone()
    if status_column and "approved" in str(status_column[1]):
        print("✓ approved status already exists in orders table")
    else:
        cur.execute(
            'ALTER TABLE orders MODIFY COLUMN status ENUM("pending", "approved", "completed", "cancelled") DEFAULT "pending"'
        )
        conn.commit()
        print("✓ approved status added to orders table")
except Exception as e:
    print(f"Error: {e}")
finally:
    cur.close()
    conn.close()
