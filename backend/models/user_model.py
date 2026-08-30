import bcrypt
from database.db import mysql


def create_user(name, email, password, role):
    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode(
        "utf-8"
    )
    cur = mysql.connection.cursor()
    try:
        cur.execute(
            "INSERT INTO users(name,email,password,role) VALUES(%s,%s,%s,%s)",
            (name, email, hashed_password, role),
        )
    except Exception as exc:
        if "Unknown column 'role'" in str(exc):
            cur.execute(
                "INSERT INTO users(name,email,password) VALUES(%s,%s,%s)",
                (name, email, hashed_password),
            )
        else:
            raise
    mysql.connection.commit()


def get_user_for_login(email):
    cur = mysql.connection.cursor()
    try:
        cur.execute(
            "SELECT id, name, email, password, role FROM users WHERE email=%s",
            (email,),
        )
        return cur.fetchone()
    except Exception as exc:
        if "Unknown column 'role'" in str(exc):
            cur.execute(
                "SELECT id, name, email, password FROM users WHERE email=%s", (email,)
            )
            row = cur.fetchone()
            if row:
                return (row[0], row[1], row[2], row[3], "buyer")
            return None
        raise


def update_password(user_id, password):
    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode(
        "utf-8"
    )
    cur = mysql.connection.cursor()
    cur.execute("UPDATE users SET password=%s WHERE id=%s", (hashed_password, user_id))
    mysql.connection.commit()


def get_user_by_email(email):
    cur = mysql.connection.cursor()
    cur.execute("SELECT id, name, email, role FROM users WHERE email=%s", (email,))
    return cur.fetchone()


def update_user_name(user_id, name):
    cur = mysql.connection.cursor()
    cur.execute("UPDATE users SET name=%s WHERE id=%s", (name, user_id))
    mysql.connection.commit()


def create_google_user(name, email, role):
    random_password_hash = bcrypt.hashpw(
        b"google-oauth-placeholder", bcrypt.gensalt()
    ).decode("utf-8")
    cur = mysql.connection.cursor()
    cur.execute(
        "INSERT INTO users(name,email,password,role) VALUES(%s,%s,%s,%s)",
        (name, email, random_password_hash, role),
    )
    mysql.connection.commit()
    return cur.lastrowid


def find_user_id_by_email(email):
    cur = mysql.connection.cursor()
    cur.execute("SELECT id FROM users WHERE email=%s", (email,))
    return cur.fetchone()


def update_password_by_email(email, new_password):
    hashed_password = bcrypt.hashpw(
        new_password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")
    cur = mysql.connection.cursor()
    cur.execute("UPDATE users SET password=%s WHERE email=%s", (hashed_password, email))
    mysql.connection.commit()
