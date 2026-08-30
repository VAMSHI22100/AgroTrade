import os


class Config:
    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "2210")
    MYSQL_DB = os.getenv("MYSQL_DB", "agrotrade1")
    MYSQL_CHARSET = "utf8mb4"
    MYSQL_USE_UNICODE = True
