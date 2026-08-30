import base64
import os
import uuid


UPLOAD_IMAGES_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "uploaded_images"
)
os.makedirs(UPLOAD_IMAGES_DIR, exist_ok=True)


def save_data_url_image(data_url):
    try:
        if not isinstance(data_url, str) or not data_url.startswith("data:image/"):
            return ""

        if "," not in data_url:
            return ""

        header, encoded = data_url.split(",", 1)
        mime_part = header.split(";")[0]
        extension = mime_part.replace("data:image/", "").strip().lower() or "png"

        if extension == "jpeg":
            extension = "jpg"
        if extension not in {"jpg", "png", "webp", "gif"}:
            extension = "png"

        image_bytes = base64.b64decode(encoded)
        if not image_bytes:
            return ""

        max_bytes = 5 * 1024 * 1024
        if len(image_bytes) > max_bytes:
            return ""

        file_name = f"product_{uuid.uuid4().hex}.{extension}"
        file_path = os.path.join(UPLOAD_IMAGES_DIR, file_name)

        with open(file_path, "wb") as image_file:
            image_file.write(image_bytes)

        return f"/uploaded-images/{file_name}"
    except Exception:
        return ""


def normalize_product_image(image_value):
    if not isinstance(image_value, str):
        return ""

    value = image_value.strip()
    if not value:
        return ""

    if value.startswith("data:image/"):
        return save_data_url_image(value)

    if value.startswith(("http://", "https://", "/")):
        return value

    if "." in value and not any(ch.isspace() for ch in value):
        return f"/product-images/{value}"

    return value
