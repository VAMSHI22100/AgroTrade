# AgroTrade

AgroTrade is a full-stack agricultural marketplace with a React frontend, Flask backend, and MySQL database.

## Run Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Backend runs on: `http://127.0.0.1:5000`

## Run Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs on: `http://localhost:3000`

## API Endpoints

### Auth
- `POST /register`
- `POST /login`
- `POST /google-login`
- `POST /forgot-password`
- `PUT /profile`

### Products
- `GET /products`
- `POST /add_product`
- `PUT /products/recover-images`
- `GET /uploaded-images/<filename>`

### Orders and Payments
- `POST /order`
- `GET /orders/user/<user_id>`
- `PUT /orders/<order_id>/approve`
- `POST /payments/create-order`
- `POST /payments/verify`

### Other
- `GET /health`
- `GET /farmer/dashboard/<farmer_id>`
- `POST /rating`
