import React from "react";

function Cart({
	items,
	onIncrement,
	onDecrement,
	onRemove,
	onCheckout,
	loading = false
}) {
	const cartTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

	return (
		<section className="cart-panel">
			<div className="cart-panel-header">
				<h3>Cart Summary</h3>
				<span>{items.length} item types</span>
			</div>

			{items.length === 0 ? (
				<p className="cart-empty">Your cart is empty. Add products to continue.</p>
			) : (
				<>
					<div className="cart-items-list">
						{items.map((item) => (
							<article className="cart-item-row" key={item.id}>
								<div className="cart-item-meta">
									<p>{item.name}</p>
									<small>Rs.{item.price} each</small>
								</div>
								<div className="cart-item-actions">
									<button type="button" onClick={() => onDecrement(item.id)}>-</button>
									<span>{item.quantity}</span>
									<button type="button" onClick={() => onIncrement(item.id)}>+</button>
									<button
										type="button"
										className="remove-btn"
										onClick={() => onRemove(item.id)}
									>
										Remove
									</button>
								</div>
							</article>
						))}
					</div>

					<div className="cart-footer">
						<p>Total: Rs.{cartTotal}</p>
						<button type="button" onClick={onCheckout} disabled={loading}>
							{loading ? "Placing Order..." : "Place Order"}
						</button>
					</div>
				</>
			)}
		</section>
	);
}

export default Cart;
