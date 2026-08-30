import React, { useEffect, useRef, useState } from "react";
import { forgotPassword } from "../api/authApi";

function LoginPage({
	authMode,
	authForm,
	authLoading,
	authError,
	onSubmit,
	onRoleChange,
	onFieldChange,
	onModeToggle,
	onGoogleLogin
}) {
	const googleButtonRef = useRef(null);
	const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
	const [showForgotPassword, setShowForgotPassword] = useState(false);
	const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
	const [forgotPasswordNew, setForgotPasswordNew] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [resetLoading, setResetLoading] = useState(false);
	const [resetError, setResetError] = useState("");
	const [resetSuccess, setResetSuccess] = useState(false);

	const handleForgotPasswordSubmit = async (e) => {
		e.preventDefault();
		setResetError("");
		setResetSuccess(false);

		if (!forgotPasswordEmail || !forgotPasswordNew || !confirmPassword) {
			setResetError("All fields are required");
			return;
		}

		if (forgotPasswordNew !== confirmPassword) {
			setResetError("Passwords do not match");
			return;
		}

		if (forgotPasswordNew.length < 6) {
			setResetError("Password must be at least 6 characters long");
			return;
		}

		setResetLoading(true);

		try {
			const response = await forgotPassword({
				email: forgotPasswordEmail,
				new_password: forgotPasswordNew,
			});

			if (response.status === 200) {
				setResetSuccess(true);
				setForgotPasswordEmail("");
				setForgotPasswordNew("");
				setConfirmPassword("");
				setTimeout(() => {
					setShowForgotPassword(false);
				}, 2000);
			}
		} catch (error) {
			const errorMessage = error.response?.data?.message || "An error occurred. Please try again.";
			setResetError(errorMessage);
			console.error("Error:", error);
		} finally {
			setResetLoading(false);
		}
	};

	const closeForgotPasswordModal = () => {
		setShowForgotPassword(false);
		setResetError("");
		setResetSuccess(false);
		setForgotPasswordEmail("");
		setForgotPasswordNew("");
		setConfirmPassword("");
	};

	useEffect(() => {
		if (!googleClientId || !googleButtonRef.current) {
			return;
		}

		const initializeGoogleButton = () => {
			if (!window.google?.accounts?.id || !googleButtonRef.current) {
				return;
			}

			window.google.accounts.id.initialize({
				client_id: googleClientId,
				callback: (response) => {
					if (response?.credential && onGoogleLogin) {
						onGoogleLogin(response.credential);
					}
				}
			});

			googleButtonRef.current.innerHTML = "";
			window.google.accounts.id.renderButton(googleButtonRef.current, {
				theme: "outline",
				size: "large",
				text: "continue_with",
				shape: "pill",
				width: 280
			});
		};

		if (window.google?.accounts?.id) {
			initializeGoogleButton();
			return;
		}

		const existingScript = document.getElementById("google-identity-script");
		if (existingScript) {
			existingScript.addEventListener("load", initializeGoogleButton);
			return () => existingScript.removeEventListener("load", initializeGoogleButton);
		}

		const script = document.createElement("script");
		script.id = "google-identity-script";
		script.src = "https://accounts.google.com/gsi/client";
		script.async = true;
		script.defer = true;
		script.onload = initializeGoogleButton;
		document.body.appendChild(script);

		return () => {
			script.onload = null;
		};
	}, [googleClientId, onGoogleLogin]);

	return (
		<div className="auth-page">
			<div className="auth-card">
				<h1>AgroTrade Login</h1>
				<p>Select your role to continue as Farmer or Buyer.</p>

				<form onSubmit={onSubmit} className="auth-form">
					<div className="auth-role-toggle">
						<button
							type="button"
							className={authForm.role === "buyer" ? "active" : ""}
							onClick={() => onRoleChange("buyer")}
						>
							Buyer
						</button>
						<button
							type="button"
							className={authForm.role === "farmer" ? "active" : ""}
							onClick={() => onRoleChange("farmer")}
						>
							Farmer
						</button>
					</div>

					{authMode === "register" && (
						<input
							type="text"
							placeholder="Full name"
							value={authForm.name}
							onChange={(event) => onFieldChange("name", event.target.value)}
						/>
					)}
					<input
						type="email"
						placeholder="Email"
						value={authForm.email}
						onChange={(event) => onFieldChange("email", event.target.value)}
					/>
					<input
						type="password"
						placeholder="Password"
						value={authForm.password}
						onChange={(event) => onFieldChange("password", event.target.value)}
					/>

					<button type="submit" className="auth-submit" disabled={authLoading}>
						{authLoading ? "Please wait..." : (authMode === "login" ? "Login" : "Register and Login")}
					</button>
					{authError && <p className="auth-error">{authError}</p>}

					{authMode === "login" && (
						<button 
							type="button" 
							className="forgot-password-link" 
							onClick={() => setShowForgotPassword(true)}
						>
							Forgot password?
						</button>
					)}
				</form>

				{googleClientId && (
					<div className="google-auth-block">
						<span className="google-auth-divider">or continue with</span>
						<div className="google-auth-button" ref={googleButtonRef} />
					</div>
				)}

				<button type="button" className="auth-switch" onClick={onModeToggle}>
					{authMode === "login" ? "New user? Register" : "Already registered? Login"}
				</button>

				{showForgotPassword && (
					<div className="modal-overlay" onClick={closeForgotPasswordModal}>
						<div className="modal-content" onClick={(e) => e.stopPropagation()}>
							<button className="modal-close" onClick={closeForgotPasswordModal}>
								×
							</button>
							<h2>Reset Password</h2>
							{resetSuccess ? (
								<div className="success-message">
									<p>✓ Password reset successfully! Redirecting to login...</p>
								</div>
							) : (
								<form onSubmit={handleForgotPasswordSubmit}>
									<input
										type="email"
										placeholder="Enter your email"
										value={forgotPasswordEmail}
										onChange={(e) => setForgotPasswordEmail(e.target.value)}
										disabled={resetLoading}
										required
									/>
									<input
										type="password"
										placeholder="New password (min 6 characters)"
										value={forgotPasswordNew}
										onChange={(e) => setForgotPasswordNew(e.target.value)}
										disabled={resetLoading}
										required
									/>
									<input
										type="password"
										placeholder="Confirm password"
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										disabled={resetLoading}
										required
									/>
									{resetError && <p className="auth-error">{resetError}</p>}
									<button type="submit" className="auth-submit" disabled={resetLoading}>
										{resetLoading ? "Resetting..." : "Reset Password"}
									</button>
								</form>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default LoginPage;
