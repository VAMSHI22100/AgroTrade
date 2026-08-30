import { useEffect, useState } from "react";
import API from "../api";
import { submitDeliveryRating } from "../api/ratingApi";
import "../styles/settings.css";

const SETTINGS_PREFERENCES_KEY = "agrotrade_settings_preferences";

const defaultToggles = {
  orderUpdates: true,
  offers: true,
  smsAlerts: false,
  biometric: false,
  appLock: false,
  darkMode: false,
  languageEnglish: true,
  languageHindi: false
};

const translations = {
  en: {
    back: "← Back",
    accountSettings: "Account Settings",
    subtitle: "Manage profile, addresses, payments, notifications, and privacy preferences.",
    userNoEmail: "No email",
    profileInformation: "Profile Information",
    fullName: "Full Name",
    email: "Email",
    accountRole: "Account Role",
    farmerSeller: "Farmer Seller",
    buyer: "Buyer",
    editProfile: "Edit Profile",
    changeLanguageTheme: "Change Language & Theme",
    savedAddresses: "Saved Addresses",
    addressesDescription: "Home, Work, and other delivery addresses.",
    manageAddresses: "Manage Addresses",
    addNewAddress: "Add New Address",
    payments: "Payments & UPI",
    paymentsDescription: "Cards, UPI IDs, wallet, and payment defaults.",
    myCartPayments: "My Cart & Payments",
    savedCards: "Saved Cards",
    notifications: "Notifications",
    orderUpdates: "Order updates",
    offers: "Offers & discounts",
    smsAlerts: "SMS alerts",
    privacySecurity: "Privacy & Security",
    biometricLogin: "Biometric login",
    appLock: "App lock",
    changePassword: "Change Password",
    languageTheme: "Language & Theme",
    languageEnglish: "English",
    languageHindi: "Hindi",
    darkMode: "Dark mode",
    myOrders: "My Orders",
    refresh: "Refresh",
    refreshing: "Refreshing...",
    noOrders: "No orders yet. Place an order and it will appear here.",
    reviewItem: "Review item",
    editReview: "Edit review",
    reviewTitle: "Write a review",
    reviewHint: "Click an approved product to rate delivery and add your notes.",
    rating: "Rating",
    comment: "Review comment",
    submitReview: "Submit Review",
    close: "Close",
    reviewSaved: "Review saved successfully.",
    reviewLocked: "You can review this item after the farmer approves the order.",
    helpAccountActions: "Help & Account Actions",
    helpDescription: "Support center, return policies, and account controls.",
    helpCenter: "Help Center",
    chatSupport: "Chat Support",
    logout: "Logout",
    selected: "Selected",
    select: "Select"
  },
  hi: {
    back: "← वापस",
    accountSettings: "खाता सेटिंग्स",
    subtitle: "प्रोफ़ाइल, पता, भुगतान, सूचनाएं और गोपनीयता प्राथमिकताएं प्रबंधित करें।",
    userNoEmail: "ईमेल नहीं",
    profileInformation: "प्रोफ़ाइल जानकारी",
    fullName: "पूरा नाम",
    email: "ईमेल",
    accountRole: "खाता भूमिका",
    farmerSeller: "किसान विक्रेता",
    buyer: "खरीदार",
    editProfile: "प्रोफ़ाइल संपादित करें",
    changeLanguageTheme: "भाषा और थीम बदलें",
    savedAddresses: "सहेजे गए पते",
    addressesDescription: "घर, काम और अन्य डिलीवरी पते।",
    manageAddresses: "पते प्रबंधित करें",
    addNewAddress: "नया पता जोड़ें",
    payments: "भुगतान और UPI",
    paymentsDescription: "कार्ड, UPI ID, वॉलेट और भुगतान प्राथमिकताएं।",
    myCartPayments: "मेरा कार्ट और भुगतान",
    savedCards: "सहेजे गए कार्ड",
    notifications: "सूचनाएं",
    orderUpdates: "ऑर्डर अपडेट",
    offers: "ऑफर और छूट",
    smsAlerts: "SMS अलर्ट",
    privacySecurity: "गोपनीयता और सुरक्षा",
    biometricLogin: "बायोमेट्रिक लॉगिन",
    appLock: "ऐप लॉक",
    changePassword: "पासवर्ड बदलें",
    languageTheme: "भाषा और थीम",
    languageEnglish: "अंग्रेज़ी",
    languageHindi: "हिंदी",
    darkMode: "डार्क मोड",
    myOrders: "मेरे ऑर्डर",
    refresh: "रीफ़्रेश करें",
    refreshing: "रीफ़्रेश हो रहा है...",
    noOrders: "अभी कोई ऑर्डर नहीं है। ऑर्डर करने के बाद यह यहां दिखेगा।",
    reviewItem: "आइटम की समीक्षा करें",
    editReview: "समीक्षा बदलें",
    reviewTitle: "समीक्षा लिखें",
    reviewHint: "डिलीवरी को रेट करने और अपनी टिप्पणी जोड़ने के लिए अनुमोदित उत्पाद पर क्लिक करें।",
    rating: "रेटिंग",
    comment: "समीक्षा टिप्पणी",
    submitReview: "समीक्षा भेजें",
    close: "बंद करें",
    reviewSaved: "समीक्षा सफलतापूर्वक सहेजी गई।",
    reviewLocked: "किसान द्वारा ऑर्डर अनुमोदित होने के बाद ही आप इस आइटम की समीक्षा कर सकते हैं।",
    helpAccountActions: "सहायता और खाता कार्य",
    helpDescription: "सपोर्ट सेंटर, रिटर्न नीति और खाता नियंत्रण।",
    helpCenter: "सहायता केंद्र",
    chatSupport: "चैट सहायता",
    logout: "लॉग आउट",
    selected: "चयनित",
    select: "चुनें"
  }
};

function Settings({ userSession, onBack, onOpenCart, onLogout }) {
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [showLanguageTheme, setShowLanguageTheme] = useState(false);
  const [languageThemeFocused, setLanguageThemeFocused] = useState(false);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [toggles, setToggles] = useState(() => {
    try {
      const savedPreferences = localStorage.getItem(SETTINGS_PREFERENCES_KEY);
      if (!savedPreferences) {
        return defaultToggles;
      }

      const parsedPreferences = JSON.parse(savedPreferences);
      return { ...defaultToggles, ...parsedPreferences };
    } catch (error) {
      return defaultToggles;
    }
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const currentLanguage = toggles.languageHindi ? "hi" : "en";
  const text = translations[currentLanguage];

  const updateToggle = (field) => {
    setToggles((prev) => {
      if (field === "languageEnglish") {
        return { ...prev, languageEnglish: true, languageHindi: false };
      }

      if (field === "languageHindi") {
        return { ...prev, languageEnglish: false, languageHindi: true };
      }

      return { ...prev, [field]: !prev[field] };
    });
  };

  const openLanguageTheme = () => {
    setShowLanguageTheme(true);
    setLanguageThemeFocused(true);
    setTimeout(() => {
      const languageThemeSection = document.getElementById("language-theme-section");
      languageThemeSection?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  };

  const isReviewableOrder = (order) => {
    const status = (order?.status || "pending").toLowerCase();
    return status === "approved" || status === "completed";
  };

  const openReviewModal = (order, item) => {
    if (!isReviewableOrder(order)) {
      setReviewError("");
      setReviewMessage(text.reviewLocked);
      return;
    }

    setReviewModal({ order, item });
    setReviewRating(item?.review?.rating || 5);
    setReviewComment(item?.review?.comment || "");
    setReviewError("");
    setReviewMessage("");
  };

  const closeReviewModal = () => {
    setReviewModal(null);
    setReviewRating(5);
    setReviewComment("");
    setReviewError("");
  };

  const updateLocalReview = (orderId, productId, review) => {
    setOrders((prevOrders) => prevOrders.map((order) => {
      if (order.order_id !== orderId) {
        return order;
      }

      return {
        ...order,
        items: (order.items || []).map((item) => (
          item.product_id === productId
            ? { ...item, review }
            : item
        ))
      };
    }));
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();

    if (!reviewModal) {
      return;
    }

    const { order, item } = reviewModal;
    const trimmedComment = reviewComment.trim();

    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      setReviewError("Please choose a rating between 1 and 5.");
      return;
    }

    try {
      setReviewSaving(true);
      setReviewError("");

      await submitDeliveryRating({
        order_id: order.order_id,
        product_id: item.product_id,
        seller_id: order.seller_id,
        buyer_id: userSession.id,
        rating: reviewRating,
        comment: trimmedComment,
      });

      updateLocalReview(order.order_id, item.product_id, {
        id: item.review?.id || Date.now(),
        rating: reviewRating,
        comment: trimmedComment,
      });

      setReviewMessage(text.reviewSaved);
      closeReviewModal();
    } catch (error) {
      setReviewError(error?.response?.data?.message || "Failed to save review.");
    } finally {
      setReviewSaving(false);
    }
  };

  useEffect(() => {
    if (!languageThemeFocused) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setLanguageThemeFocused(false);
    }, 1800);

    return () => clearTimeout(timer);
  }, [languageThemeFocused]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_PREFERENCES_KEY, JSON.stringify(toggles));
  }, [toggles]);

  useEffect(() => {
    const body = document.body;
    body.classList.toggle("agrotrade-dark", Boolean(toggles.darkMode));

    return () => {
      body.classList.remove("agrotrade-dark");
    };
  }, [toggles.darkMode]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = currentLanguage;

    return () => {
      root.lang = "en";
    };
  }, [currentLanguage]);

  const fetchOrders = async () => {
    if (!userSession?.id) {
      setOrders([]);
      return;
    }

    try {
      setOrdersLoading(true);
      setOrdersError("");
      const response = await API.get(`/orders/user/${userSession.id}`);
      setOrders(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      setOrdersError(error?.response?.data?.message || "Failed to load orders.");
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSession?.id]);

  return (
    <main className="settings-page">
      <section className="settings-hero">
        <button type="button" className="settings-back-btn" onClick={onBack}>
          {text.back}
        </button>
        <div>
          <h2>{text.accountSettings}</h2>
          <p>{text.subtitle}</p>
        </div>
        <div className="settings-user-chip">
          <strong>{userSession?.name || "User"}</strong>
          <span>{userSession?.email || text.userNoEmail}</span>
        </div>
      </section>

      <section className="settings-grid">
        <article className="settings-card">
          <h3>{text.profileInformation}</h3>
          <ul>
            <li>{text.fullName}: {userSession?.name || "Not set"}</li>
            <li>{text.email}: {userSession?.email || "Not set"}</li>
            <li>{text.accountRole}: {userSession?.role === "farmer" ? text.farmerSeller : text.buyer}</li>
          </ul>
          <div className="settings-action-row">
            <button type="button">{text.editProfile}</button>
            <button type="button" onClick={openLanguageTheme}>{text.changeLanguageTheme}</button>
          </div>
        </article>

        <article className="settings-card">
          <h3>{text.savedAddresses}</h3>
          <p>{text.addressesDescription}</p>
          <div className="settings-action-row">
            <button type="button">{text.manageAddresses}</button>
            <button type="button">{text.addNewAddress}</button>
          </div>
        </article>

        <article className="settings-card">
          <h3>{text.payments}</h3>
          <p>{text.paymentsDescription}</p>
          <div className="settings-action-row">
            <button type="button" onClick={onOpenCart}>{text.myCartPayments}</button>
            <button type="button">{text.savedCards}</button>
          </div>
        </article>

        <article className="settings-card">
          <h3>{text.notifications}</h3>
          <div className="toggle-row">
            <span>{text.orderUpdates}</span>
            <button type="button" onClick={() => updateToggle("orderUpdates")} className={toggles.orderUpdates ? "toggle on" : "toggle"}>
              {toggles.orderUpdates ? "ON" : "OFF"}
            </button>
          </div>
          <div className="toggle-row">
            <span>{text.offers}</span>
            <button type="button" onClick={() => updateToggle("offers")} className={toggles.offers ? "toggle on" : "toggle"}>
              {toggles.offers ? "ON" : "OFF"}
            </button>
          </div>
          <div className="toggle-row">
            <span>{text.smsAlerts}</span>
            <button type="button" onClick={() => updateToggle("smsAlerts")} className={toggles.smsAlerts ? "toggle on" : "toggle"}>
              {toggles.smsAlerts ? "ON" : "OFF"}
            </button>
          </div>
        </article>

        <article className="settings-card">
          <h3>{text.privacySecurity}</h3>
          <div className="toggle-row">
            <span>{text.biometricLogin}</span>
            <button type="button" onClick={() => updateToggle("biometric")} className={toggles.biometric ? "toggle on" : "toggle"}>
              {toggles.biometric ? "ON" : "OFF"}
            </button>
          </div>
          <div className="toggle-row">
            <span>{text.appLock}</span>
            <button type="button" onClick={() => updateToggle("appLock")} className={toggles.appLock ? "toggle on" : "toggle"}>
              {toggles.appLock ? "ON" : "OFF"}
            </button>
          </div>
          <button type="button">{text.changePassword}</button>
        </article>

        <article
          id="language-theme-section"
          className={`settings-card ${languageThemeFocused ? "settings-card-focus" : ""}`}
        >
          <h3>{text.languageTheme}</h3>
          {!showLanguageTheme && (
            <button type="button" onClick={openLanguageTheme}>{text.changeLanguageTheme}</button>
          )}

          {showLanguageTheme && (
            <>
              <div className="toggle-row">
                <span>{text.languageEnglish}</span>
                <button type="button" onClick={() => updateToggle("languageEnglish")} className={toggles.languageEnglish ? "toggle on" : "toggle"}>
                  {toggles.languageEnglish ? text.selected : text.select}
                </button>
              </div>
              <div className="toggle-row">
                <span>{text.languageHindi}</span>
                <button type="button" onClick={() => updateToggle("languageHindi")} className={toggles.languageHindi ? "toggle on" : "toggle"}>
                  {toggles.languageHindi ? text.selected : text.select}
                </button>
              </div>
              <div className="toggle-row">
                <span>{text.darkMode}</span>
                <button type="button" onClick={() => updateToggle("darkMode")} className={toggles.darkMode ? "toggle on" : "toggle"}>
                  {toggles.darkMode ? "ON" : "OFF"}
                </button>
              </div>
            </>
          )}
        </article>

        <article className="settings-card settings-card-wide">
          <div className="settings-card-header-row">
            <h3>{text.myOrders}</h3>
            <button type="button" onClick={fetchOrders} disabled={ordersLoading}>
              {ordersLoading ? text.refreshing : text.refresh}
            </button>
          </div>

          {reviewMessage && <p className="settings-success-text">{reviewMessage}</p>}

          {ordersError && <p className="settings-error-text">{ordersError}</p>}

          {!ordersLoading && !ordersError && orders.length === 0 && (
            <p>{text.noOrders}</p>
          )}

          {orders.length > 0 && (
            <div className="settings-orders-list">
              {orders.map((order) => (
                <article key={order.order_id} className="settings-order-item">
                  <div className="settings-order-row">
                    <strong>Order #{order.order_id}</strong>
                    <span className={`settings-order-status status-${order.status || "pending"}`}>
                      {(order.status || "pending").toUpperCase()}
                    </span>
                  </div>
                  <div className="settings-order-row">
                    <small>{new Date(order.created_at).toLocaleString()}</small>
                    <strong>Rs.{Number(order.total || 0).toFixed(2)}</strong>
                  </div>
                  <ul className="settings-order-lines">
                    {(order.items || []).map((item, index) => (
                      <li key={`${order.order_id}-${item.product_id || index}`} className="settings-order-line-item">
                        <button
                          type="button"
                          className="settings-order-product-btn"
                          onClick={() => openReviewModal(order, item)}
                          disabled={!isReviewableOrder(order)}
                        >
                          <span className="settings-order-product-name">{item.name}</span>
                          <span className="settings-order-product-meta">
                            {item.quantity} x Rs.{Number(item.price || 0).toFixed(2)}
                          </span>
                        </button>
                        <div className="settings-order-review-state">
                          {item.review?.rating ? (
                            <span className="settings-review-badge reviewed">
                              {item.review.rating}/5 reviewed
                            </span>
                          ) : isReviewableOrder(order) ? (
                            <span className="settings-review-badge">{text.reviewItem}</span>
                          ) : (
                            <span className="settings-review-badge locked">{text.reviewLocked}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="settings-card settings-card-wide">
          <h3>{text.helpAccountActions}</h3>
          <p>{text.helpDescription}</p>
          <div className="settings-action-row">
            <button type="button">{text.helpCenter}</button>
            <button type="button">{text.chatSupport}</button>
            <button type="button" className="danger" onClick={onLogout}>{text.logout}</button>
          </div>
        </article>
      </section>

      {reviewModal && (
        <div className="settings-modal-overlay" onClick={closeReviewModal}>
          <div className="settings-modal" onClick={(event) => event.stopPropagation()}>
            <div className="settings-modal-header">
              <div>
                <h3>{text.reviewTitle}</h3>
                <p>{reviewModal.item?.name}</p>
                <small>{text.reviewHint}</small>
              </div>
              <button type="button" className="settings-modal-close" onClick={closeReviewModal}>
                {text.close}
              </button>
            </div>

            <form className="settings-review-form" onSubmit={handleReviewSubmit}>
              <div className="settings-rating-row">
                <span>{text.rating}</span>
                <div className="settings-star-picker" role="radiogroup" aria-label={text.rating}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`settings-star-btn ${reviewRating >= value ? "active" : ""}`}
                      onClick={() => setReviewRating(value)}
                      aria-label={`${value} star${value > 1 ? "s" : ""}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <label className="settings-comment-label" htmlFor="review-comment">
                {text.comment}
              </label>
              <textarea
                id="review-comment"
                rows="4"
                maxLength="500"
                placeholder="Share your delivery experience, product quality, and any notes"
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
              />

              {reviewError && <p className="settings-error-text">{reviewError}</p>}

              <div className="settings-modal-actions">
                <button type="button" onClick={closeReviewModal} disabled={reviewSaving}>
                  {text.close}
                </button>
                <button type="submit" className="settings-primary-btn" disabled={reviewSaving}>
                  {reviewSaving ? "Saving..." : text.submitReview}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Settings;
