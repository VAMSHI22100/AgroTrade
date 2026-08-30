import API from "./client";

export const fetchProducts = () => API.get("/products");
export const addProduct = (payload) => API.post("/add_product", payload);
export const recoverProductImages = (products) => API.put("/products/recover-images", { products });

const productApi = {
  fetchProducts,
  addProduct,
  recoverProductImages,
};

export default productApi;
