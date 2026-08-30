import { useEffect, useState } from 'react';

function Profile({
	isOpen,
	userName,
	userEmail,
	userRole,
	onProfileSave,
	onMyOrders,
	onMyWishlist,
	onCart,
	onSettings,
	onTerms,
	onLogout
}) {
	const [isEditing, setIsEditing] = useState(false);
	const [draftName, setDraftName] = useState(userName || '');
	const [draftEmail, setDraftEmail] = useState(userEmail || '');
	const [saveError, setSaveError] = useState('');
	const [saveLoading, setSaveLoading] = useState(false);

	useEffect(() => {
		setDraftName(userName || '');
		setDraftEmail(userEmail || '');
	}, [userName, userEmail]);

	if (!isOpen) {
		return null;
	}

	const handleSave = async (event) => {
		event.preventDefault();
		setSaveError('');

		const trimmedName = draftName.trim();
		const trimmedEmail = draftEmail.trim();

		if (!trimmedName || !trimmedEmail) {
			setSaveError('Name and email are required.');
			return;
		}

		if (!onProfileSave) {
			setSaveError('Profile update is not available right now.');
			return;
		}

		try {
			setSaveLoading(true);
			await onProfileSave({ name: trimmedName, email: trimmedEmail });
			setIsEditing(false);
		} catch (error) {
			setSaveError(error?.message || 'Unable to update profile.');
		} finally {
			setSaveLoading(false);
		}
	};

	return (
		<section className="profile-popover" aria-label="Profile menu" role="menu">
			<div className="profile-popover-header">
				<div>
					<h3>My Profile</h3>
					<p>{userName} | {userRole === 'farmer' ? 'Farmer' : 'Buyer'}</p>
					<p>{userEmail}</p>
				</div>
				<button
					type="button"
					className="profile-edit-toggle-btn"
					onClick={() => {
						setIsEditing((prev) => !prev);
						setSaveError('');
					}}
				>
					{isEditing ? 'Cancel' : 'Edit'}
				</button>
			</div>

			{isEditing && (
				<form className="profile-edit-form" onSubmit={handleSave}>
					<input
						type="text"
						placeholder="Name"
						value={draftName}
						onChange={(event) => setDraftName(event.target.value)}
						disabled={saveLoading}
					/>
					<input
						type="email"
						placeholder="Email"
						value={draftEmail}
						onChange={(event) => setDraftEmail(event.target.value)}
						disabled={saveLoading}
					/>
					{saveError && <p className="profile-edit-error">{saveError}</p>}
					<button type="submit" disabled={saveLoading}>
						{saveLoading ? 'Saving...' : 'Save Profile'}
					</button>
				</form>
			)}

			<div className="profile-menu-list">
				<button type="button" onClick={onMyOrders} role="menuitem">My Orders</button>
				<button type="button" onClick={onMyWishlist} role="menuitem">My Wishlist</button>
				<button type="button" onClick={onCart} role="menuitem">Cart</button>
				<button type="button" onClick={onSettings} role="menuitem">Settings</button>
				<button type="button" onClick={onTerms} role="menuitem">Terms and Conditions</button>
				<button type="button" onClick={onLogout} className="profile-logout-btn">Logout</button>
			</div>
		</section>
	);
}

export default Profile;
