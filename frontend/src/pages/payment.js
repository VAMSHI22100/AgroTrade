import React, { useMemo, useState } from "react";
import API from "../api";

function PaymentPage({ items, loading = false, onPay, onBack }) {
	const [paymentMode, setPaymentMode] = useState("upi");
	const [upiId, setUpiId] = useState("");
	const [cardNumber, setCardNumber] = useState("");
	const [cardName, setCardName] = useState("");
	const [expiry, setExpiry] = useState("");
	const [cvv, setCvv] = useState("");
	const [paymentError, setPaymentError] = useState("");
	const [isPaying, setIsPaying] = useState(false);

	const total = useMemo(
		() => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
		[items]
	);

	const loadRazorpaySdk = () => new Promise((resolve) => {
		if (window.Razorpay) {
			resolve(true);
			return;
		}

		const existingScript = document.getElementById("razorpay-checkout-script");
		if (existingScript) {
			existingScript.addEventListener("load", () => resolve(true), { once: true });
			existingScript.addEventListener("error", () => resolve(false), { once: true });
			return;
		}

		const script = document.createElement("script");
		script.id = "razorpay-checkout-script";
		script.src = "https://checkout.razorpay.com/v1/checkout.js";
		script.async = true;
		script.onload = () => resolve(true);
		script.onerror = () => resolve(false);
		document.body.appendChild(script);
	});

	const startRazorpayPayment = async () => {
		setIsPaying(true);
		setPaymentError("");

		try {
			const sdkLoaded = await loadRazorpaySdk();
			if (!sdkLoaded) {
				setPaymentError("Failed to load payment SDK. Please check internet and try again.");
				return;
			}

			const createOrderResponse = await API.post("/payments/create-order", {
				amount: total,
				currency: "INR",
			});

			const paymentOrder = createOrderResponse?.data || {};
			if (!paymentOrder?.order_id || !paymentOrder?.key_id || !paymentOrder?.amount) {
				setPaymentError("Payment gateway response is incomplete. Please verify Razorpay backend configuration.");
				return;
			}
			const userData = JSON.parse(localStorage.getItem("agrotrade_user") || "{}");

			const options = {
				key: paymentOrder.key_id,
				amount: paymentOrder.amount,
				currency: paymentOrder.currency || "INR",
				name: "AgroTrade",
				description: "Order Payment",
				order_id: paymentOrder.order_id,
				handler: async (response) => {
					try {
						await API.post("/payments/verify", response);
						if (onPay) {
							await onPay({
								method: paymentMode,
								razorpay_order_id: response.razorpay_order_id,
								razorpay_payment_id: response.razorpay_payment_id,
							});
						}
					} catch (verifyError) {
						const backendMessage = verifyError?.response?.data?.message;
						setPaymentError(backendMessage || "Payment verification failed. Please try again.");
					}
				},
				prefill: {
					name: userData?.name || "",
					email: userData?.email || "",
				},
				theme: {
					color: "#1f7d49",
				},
				modal: {
					ondismiss: () => {
						setPaymentError("Payment was cancelled.");
					},
				},
			};

			const razorpayInstance = new window.Razorpay(options);
			razorpayInstance.open();
		} catch (error) {
			const backendMessage = error?.response?.data?.message;
			const errorDetails = error?.response?.data?.error;
			const isBackendUnreachable = !error?.response;

			if (isBackendUnreachable) {
				setPaymentError("Payment server is not reachable. Start backend on http://127.0.0.1:5000 and try again.");
			} else if (backendMessage === "Razorpay is not configured on backend") {
				setPaymentError("Razorpay keys are missing in backend/.env. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
			} else {
				setPaymentError(errorDetails ? `${backendMessage}: ${errorDetails}` : (backendMessage || "Unable to start online payment right now."));
			}
		} finally {
			setIsPaying(false);
		}
	};

	const validateAndPay = async () => {
		setPaymentError("");

		if (paymentMode === "upi") {
			if (!upiId.trim() || !upiId.includes("@")) {
				setPaymentError("Enter a valid UPI ID (example: name@bank).");
				return;
			}
		}

		if (paymentMode === "card") {
			if (!cardNumber.trim() || cardNumber.replace(/\D/g, "").length < 12) {
				setPaymentError("Enter a valid card number.");
				return;
			}

			if (!cardName.trim()) {
				setPaymentError("Enter name on card.");
				return;
			}

			if (!expiry.trim() || expiry.length < 5) {
				setPaymentError("Enter card expiry in MM/YY format.");
				return;
			}

			if (!cvv.trim() || cvv.length < 3) {
				setPaymentError("Enter a valid CVV.");
				return;
			}
		}

		if (paymentMode === "cod") {
			if (onPay) {
				await onPay({ method: "cod" });
			}
			return;
		}

		await startRazorpayPayment();
	};

	return (
		<section className="payment-page" id="payment-section">
			<div className="payment-topbar">
				<button type="button" className="payment-back-btn" onClick={onBack}>
					← Back to Cart
				</button>
				<h2>Online Payment</h2>
			</div>

			<div className="payment-layout">
				<article className="payment-card">
					<h3>Select Payment Method</h3>

					<div className="payment-methods">
						<button
							type="button"
							className={paymentMode === "upi" ? "active" : ""}
							onClick={() => setPaymentMode("upi")}
						>
							UPI
						</button>
						<button
							type="button"
							className={paymentMode === "card" ? "active" : ""}
							onClick={() => setPaymentMode("card")}
						>
							Card
						</button>
						<button
							type="button"
							className={paymentMode === "cod" ? "active" : ""}
							onClick={() => setPaymentMode("cod")}
						>
							Cash on Delivery
						</button>
					</div>

					{paymentMode === "upi" && (
						<div className="payment-form-grid">
							<label htmlFor="upi-id">UPI ID</label>
							<input
								id="upi-id"
								type="text"
								placeholder="example@bank"
								value={upiId}
								onChange={(event) => setUpiId(event.target.value)}
								disabled={loading || isPaying}
							/>
						</div>
					)}

					{paymentMode === "card" && (
						<div className="payment-form-grid">
							<label htmlFor="card-number">Card Number</label>
							<input
								id="card-number"
								type="text"
								placeholder="1234 5678 9012 3456"
								value={cardNumber}
								onChange={(event) => setCardNumber(event.target.value)}
								disabled={loading || isPaying}
							/>

							<label htmlFor="card-name">Name on Card</label>
							<input
								id="card-name"
								type="text"
								placeholder="Card holder name"
								value={cardName}
								onChange={(event) => setCardName(event.target.value)}
								disabled={loading || isPaying}
							/>

							<div className="payment-inline-grid">
								<div>
									<label htmlFor="card-expiry">Expiry (MM/YY)</label>
									<input
										id="card-expiry"
										type="text"
										placeholder="08/28"
										value={expiry}
										onChange={(event) => setExpiry(event.target.value)}
										disabled={loading || isPaying}
									/>
								</div>
								<div>
									<label htmlFor="card-cvv">CVV</label>
									<input
										id="card-cvv"
										type="password"
										placeholder="123"
										value={cvv}
										onChange={(event) => setCvv(event.target.value)}
										disabled={loading || isPaying}
									/>
								</div>
							</div>
						</div>
					)}

					{paymentMode === "cod" && (
						<p className="payment-cod-note">
							Cash on Delivery selected. You can pay at the time of delivery.
						</p>
					)}

					{paymentError && <p className="payment-error">{paymentError}</p>}

					<button type="button" className="payment-pay-btn" onClick={validateAndPay} disabled={loading || isPaying}>
						{(loading || isPaying) ? "Processing..." : `Pay Rs.${total}`}
					</button>
				</article>

				<aside className="payment-summary-card">
					<h3>Order Summary</h3>
					<ul>
						{items.map((item) => (
							<li key={item.id}>
								<span>{item.name} x {item.quantity}</span>
								<strong>Rs.{item.price * item.quantity}</strong>
							</li>
						))}
					</ul>

					<div className="payment-summary-total">
						<span>Total</span>
						<strong>Rs.{total}</strong>
					</div>
				</aside>
			</div>
		</section>
	);
}

export default PaymentPage;
