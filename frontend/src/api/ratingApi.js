import API from "./client";

export const submitDeliveryRating = (payload) => API.post("/rating", payload);

const ratingApi = {
  submitDeliveryRating,
};

export default ratingApi;
