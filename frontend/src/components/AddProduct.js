import React from "react";

function AddProduct({
	farmerForm,
	setFarmerForm,
	onSubmit,
	onImageUpload,
	farmerMessage,
	onRecoverImages,
	isRecoveringImages,
	imageRecoveryMessage,
	localProducts
}) {
	const isImageSource = (value) => typeof value === "string"
		&& (value.startsWith("data:image/") || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:"));

	return (
		<>
			<section className="farmer-card farmer-card-highlight">
				<div className="farmer-card-header">
					<h2>List New Crop</h2>
					<p>Publish your crop so buyers can discover and purchase it quickly.</p>
				</div>

				<form className="farmer-form" onSubmit={onSubmit}>
					<div className="farmer-form-row">
						<input
							type="text"
							placeholder="Crop name"
							value={farmerForm.name}
							onChange={(event) => setFarmerForm((prev) => ({ ...prev, name: event.target.value }))}
						/>
						<input
							type="number"
							min="1"
							placeholder="Price in Rs"
							value={farmerForm.price}
							onChange={(event) => setFarmerForm((prev) => ({ ...prev, price: event.target.value }))}
						/>
						<input
							type="number"
							min="1"
							placeholder="Quantity available"
							value={farmerForm.quantity}
							onChange={(event) => setFarmerForm((prev) => ({ ...prev, quantity: event.target.value }))}
						/>
					</div>

					<div className="farmer-form-row">
						<select
							value={farmerForm.category}
							onChange={(event) => setFarmerForm((prev) => ({ ...prev, category: event.target.value }))}
						>
							<option value="Vegetables">Vegetables</option>
							<option value="Fruits">Fruits</option>
							<option value="Grains">Grains</option>
							<option value="Dairy">Dairy</option>
							<option value="Leafy">Leafy</option>
							<option value="Spices">Spices</option>
						</select>

						<input
							type="text"
							placeholder="Image URL (optional if file is uploaded)"
							value={farmerForm.image}
							onChange={(event) => setFarmerForm((prev) => ({ ...prev, image: event.target.value }))}
						/>
					</div>

					<div className="farmer-form-row farmer-image-upload-row">
						<input
							type="file"
							accept="image/*"
							onChange={onImageUpload}
						/>
						{isImageSource(farmerForm.image) && (
							<img
								src={farmerForm.image}
								alt="Crop preview"
								className="farmer-upload-preview"
							/>
						)}
					</div>

					<textarea
						rows="3"
						placeholder="Describe crop quality, harvest details, and delivery notes"
						value={farmerForm.description}
						onChange={(event) => setFarmerForm((prev) => ({ ...prev, description: event.target.value }))}
					/>

					<button type="submit">Add Product</button>
					{farmerMessage && <p className="farmer-message">{farmerMessage}</p>}
				</form>
			</section>

			<section className="farmer-card">
				<div className="farmer-recover-row">
					<h3>Recently Added Products</h3>
					<button
						type="button"
						className="farmer-recover-btn"
						onClick={onRecoverImages}
						disabled={isRecoveringImages}
					>
						{isRecoveringImages ? "Recovering..." : "Recover Uploaded Images"}
					</button>
				</div>

				{imageRecoveryMessage && <p className="farmer-message">{imageRecoveryMessage}</p>}

				{localProducts.length === 0 ? (
					<p>No products listed yet. Add your first product above.</p>
				) : (
					<div className="farmer-product-list">
						{localProducts.slice(0, 8).map((product) => (
							<article className="farmer-product-item" key={product.id}>
								<div className="farmer-product-main">
									<strong>
										{isImageSource(product.image)
											? <img src={product.image} alt={product.name} className="farmer-list-image" />
											: null}
										{product.name}
									</strong>
									<small>{product.description}</small>
								</div>
								<span>Rs.{product.price}</span>
								<small>{product.category}</small>
								<small>Qty: {product.quantity}</small>
							</article>
						))}
					</div>
				)}
			</section>
		</>
	);
}

export default AddProduct;
