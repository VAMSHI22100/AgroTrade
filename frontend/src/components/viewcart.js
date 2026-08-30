import React from "react";
import Cart from "./Cart";

function ViewCart({
	items,
	onIncrement,
	onDecrement,
	onRemove,
	onCheckout,
	loading,
	onBack
}) {
	return (
		<section className="view-cart-page" id="cart-section">
			<div className="view-cart-topbar">
				<button type="button" className="view-cart-back-btn" onClick={onBack}>
					← Continue Shopping
				</button>
				<h2>My Cart</h2>
			</div>

			<Cart
				items={items}
				onIncrement={onIncrement}
				onDecrement={onDecrement}
				onRemove={onRemove}
				onCheckout={onCheckout}
				loading={loading}
			/>
		</section>
	);
}

export default ViewCart;
