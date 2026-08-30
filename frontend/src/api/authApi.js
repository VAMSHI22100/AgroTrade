import API from "./client";

export const registerUser = (payload) => API.post("/register", payload);
export const loginUser = (payload) => API.post("/login", payload);
export const googleLoginUser = (payload) => API.post("/google-login", payload);
export const forgotPassword = (payload) => API.post("/forgot-password", payload);

const authApi = {
  registerUser,
  loginUser,
  googleLoginUser,
  forgotPassword,
};

export default authApi;
