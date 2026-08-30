import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import Products from './pages/Products';
import Profile from './pages/profile';
import API from './api';
import { googleLoginUser, loginUser, registerUser } from './api/authApi';
import { addProduct, recoverProductImages } from './api/productApi';
import Cart from './components/Cart';
import AddProduct from './components/AddProduct';
import ViewCart from './components/viewcart';
import Settings from './pages/settings';
import FarmerDashboard from './pages/farmer';
import LoginPage from './pages/login';
import PaymentPage from './pages/payment';

const LOCAL_PRODUCTS_KEY = 'agrotrade_local_products';

function App() {
  const defaultCategories = useMemo(() => [
    'Vegetables',
    'Fruits',
    'Grains',
    'Dairy',
    'Spices',
    'Leafy'
  ], []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'buyer'
  });
  const [userSession, setUserSession] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [buyerView, setBuyerView] = useState('products');
  const [productsRefreshToken, setProductsRefreshToken] = useState(0);
  const [farmerView, setFarmerView] = useState('dashboard');
  const [isOrdering, setIsOrdering] = useState(false);
  const [localProducts, setLocalProducts] = useState([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [farmerForm, setFarmerForm] = useState({
    name: '',
    price: '',
    description: '',
    category: 'Vegetables',
    image: '',
    quantity: ''
  });
  const [farmerMessage, setFarmerMessage] = useState('');
  const [isRecoveringImages, setIsRecoveringImages] = useState(false);
  const [imageRecoveryMessage, setImageRecoveryMessage] = useState('');
  const categoryStripRef = useRef(null);
  const profileMenuRef = useRef(null);

  const topCategories = useMemo(() => {
    const farmerCategories = localProducts
      .map((product) => (product?.category || '').trim())
      .filter(Boolean);

    const mergedCategories = [...defaultCategories, ...farmerCategories];
    const uniqueCategories = [...new Set(mergedCategories)];

    return ['All', ...uniqueCategories];
  }, [defaultCategories, localProducts]);

  useEffect(() => {
    try {
      const storedProducts = localStorage.getItem(LOCAL_PRODUCTS_KEY);
      if (!storedProducts) {
        return;
      }

      const parsedProducts = JSON.parse(storedProducts);
      if (Array.isArray(parsedProducts)) {
        setLocalProducts(parsedProducts);
      }
    } catch (error) {
      setLocalProducts([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(localProducts));
  }, [localProducts]);

  useEffect(() => {
    const recoverUploadedImages = async () => {
      const recoverableProducts = localProducts
        .filter((item) => Number(item?.id) > 0)
        .filter((item) => typeof item?.image === 'string' && item.image.startsWith('data:image/'))
        .map((item) => ({
          product_id: item.id,
          image: item.image
        }));

      if (!recoverableProducts.length) {
        return;
      }

      try {
        await recoverProductImages(recoverableProducts);
      } catch (error) {
        // Silent fallback: keep UI usable even if backend recovery is unavailable.
      }
    };

    recoverUploadedImages();
  }, [localProducts]);

  useEffect(() => {
    const categoryStrip = categoryStripRef.current;
    if (!categoryStrip || userSession?.role !== 'buyer') {
      return undefined;
    }

    let animationFrameId;
    let isPaused = false;

    const animateScroll = () => {
      if (!isPaused) {
        const maxScrollLeft = categoryStrip.scrollWidth - categoryStrip.clientWidth;

        if (maxScrollLeft > 0) {
          if (categoryStrip.scrollLeft >= maxScrollLeft - 1) {
            categoryStrip.scrollLeft = 0;
          } else {
            categoryStrip.scrollLeft += 0.7;
          }
        }
      }

      animationFrameId = window.requestAnimationFrame(animateScroll);
    };

    const pauseAutoScroll = () => {
      isPaused = true;
    };

    const resumeAutoScroll = () => {
      isPaused = false;
    };

    categoryStrip.addEventListener('mouseenter', pauseAutoScroll);
    categoryStrip.addEventListener('mouseleave', resumeAutoScroll);
    categoryStrip.addEventListener('touchstart', pauseAutoScroll);
    categoryStrip.addEventListener('touchend', resumeAutoScroll);

    animationFrameId = window.requestAnimationFrame(animateScroll);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      categoryStrip.removeEventListener('mouseenter', pauseAutoScroll);
      categoryStrip.removeEventListener('mouseleave', resumeAutoScroll);
      categoryStrip.removeEventListener('touchstart', pauseAutoScroll);
      categoryStrip.removeEventListener('touchend', resumeAutoScroll);
    };
  }, [topCategories, userSession?.role]);

  useEffect(() => {
    if (!isProfileOpen) {
      return undefined;
    }

    const handlePointerDownOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isProfileOpen]);

  useEffect(() => {
    const handleOpenProducts = () => {
      if (userSession?.role === 'farmer') {
        setFarmerView('products');
      }
    };

    window.addEventListener('openFarmerProducts', handleOpenProducts);
    return () => window.removeEventListener('openFarmerProducts', handleOpenProducts);
  }, [userSession?.role]);

  const handleSearch = (event) => {
    event.preventDefault();
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);

    const productsSection = document.getElementById('products-section');
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();

    if (!authForm.email.trim() || !authForm.password.trim()) {
      setAuthError('Email and password are required.');
      return;
    }

    if (authMode === 'register' && !authForm.name.trim()) {
      setAuthError('Name is required for registration.');
      return;
    }

    try {
      setAuthLoading(true);
      setAuthError('');

      if (authMode === 'register') {
        await registerUser({
          name: authForm.name.trim(),
          email: authForm.email.trim(),
          password: authForm.password,
          role: authForm.role
        });
      }

      const loginResponse = await loginUser({
        email: authForm.email.trim(),
        password: authForm.password
      });

      setUserSession({
        user_id: loginResponse?.data?.user_id || Date.now(),
        id: loginResponse?.data?.user_id || Date.now(),
        name: loginResponse?.data?.name || authForm.name || authForm.email.split('@')[0],
        role: loginResponse?.data?.role || authForm.role,
        email: authForm.email
      });
      setAuthForm({ name: '', email: '', password: '', role: 'buyer' });
      
      // Store user session in localStorage for other components
      const userData = {
        id: loginResponse?.data?.user_id || Date.now(),
        user_id: loginResponse?.data?.user_id || Date.now(),
        name: loginResponse?.data?.name || authForm.name || authForm.email.split('@')[0],
        role: loginResponse?.data?.role || authForm.role,
        email: authForm.email
      };
      localStorage.setItem('agrotrade_user', JSON.stringify(userData));
      window.agrotrade_user = userData;
    } catch (error) {
      setAuthError(
        error?.response?.data?.message
        || 'Authentication failed. Please check your details and try again.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async (credential) => {
    if (!credential) {
      return;
    }

    try {
      setAuthLoading(true);
      setAuthError('');

      const response = await googleLoginUser({
        credential,
        role: authForm.role
      });

      const userData = {
        id: response?.data?.user_id || Date.now(),
        user_id: response?.data?.user_id || Date.now(),
        name: response?.data?.name || authForm.name || authForm.email.split('@')[0] || 'User',
        role: response?.data?.role || authForm.role,
        email: response?.data?.email || authForm.email
      };

      setUserSession(userData);
      localStorage.setItem('agrotrade_user', JSON.stringify(userData));
      window.agrotrade_user = userData;
      setAuthForm({ name: '', email: '', password: '', role: userData.role || 'buyer' });
    } catch (error) {
      setAuthError(
        error?.response?.data?.message
        || 'Google login failed. Please try again.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAddToCart = (product) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      const maxQuantity = Number(product?.quantity) || 0;

      if (maxQuantity <= 0) {
        window.alert('This product is out of stock.');
        return prevItems;
      }

      if (existingItem) {
        if (existingItem.quantity >= maxQuantity) {
          window.alert(`Only ${maxQuantity} unit(s) available.`);
          return prevItems;
        }

        return prevItems.map((item) => (
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, maxQuantity }
            : item
        ));
      }

      return [
        ...prevItems,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          maxQuantity
        }
      ];
    });
  };

  const incrementCartItem = (productId) => {
    setCartItems((prevItems) => prevItems.map((item) => {
      if (item.id !== productId) {
        return item;
      }

      const maxQuantity = Number(item.maxQuantity) || 0;
      if (maxQuantity > 0 && item.quantity >= maxQuantity) {
        return item;
      }

      return { ...item, quantity: item.quantity + 1 };
    }));
  };

  const decrementCartItem = (productId) => {
    setCartItems((prevItems) => prevItems
      .map((item) => (item.id === productId
        ? { ...item, quantity: item.quantity - 1 }
        : item))
      .filter((item) => item.quantity > 0));
  };

  const removeCartItem = (productId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== productId));
  };

  const handleCheckout = () => {
    if (!cartItems.length || !userSession) {
      return;
    }

    setBuyerView('payment');
  };

  const handleConfirmPayment = async (paymentDetails = {}) => {
    if (!cartItems.length || !userSession) {
      return;
    }

    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    try {
      setIsOrdering(true);
      await API.post('/order', {
        user_id: userSession.id,
        items: cartItems.map((item) => ({
          product_id: item.id,
          quantity: item.quantity
        })),
        total,
        payment_method: paymentDetails?.method || 'online',
        payment_id: paymentDetails?.razorpay_payment_id || null,
        payment_order_id: paymentDetails?.razorpay_order_id || null
      });

      const orderedQuantities = cartItems.reduce((acc, item) => {
        acc[item.id] = (acc[item.id] || 0) + item.quantity;
        return acc;
      }, {});

      setLocalProducts((prevProducts) => prevProducts.map((product) => {
        const orderedQty = orderedQuantities[product.id] || 0;
        if (!orderedQty) {
          return product;
        }

        const currentQty = Number(product.quantity) || 0;
        return {
          ...product,
          quantity: Math.max(0, currentQty - orderedQty)
        };
      }));

      setCartItems([]);
      setProductsRefreshToken((prev) => prev + 1);
      setBuyerView('products');
      window.alert('Order placed successfully.');
    } catch (error) {
      const backendMessage = error?.response?.data?.message;
      window.alert(backendMessage || 'Failed to place order. Please check backend and database connection.');
    } finally {
      setIsOrdering(false);
    }
  };

  const handleFarmerProductSubmit = async (event) => {
    event.preventDefault();
    if (!userSession) {
      return;
    }

    const price = Number(farmerForm.price);
    const quantity = Number(farmerForm.quantity);
    if (!farmerForm.name.trim() || !price || !farmerForm.description.trim() || !quantity) {
      setFarmerMessage('Please enter crop name, valid price, quantity, and description.');
      return;
    }

    const tempProductId = Date.now();
    const newProduct = {
      id: tempProductId,
      name: farmerForm.name.trim(),
      price,
      quantity,
      description: farmerForm.description.trim(),
      image: farmerForm.image || '',
      category: farmerForm.category,
      rating: 4.3,
      reviews: 12,
      features: ['Farmer listed', 'Fresh stock', 'Direct from farm'],
      discount: 10,
      seller_id: userSession.id
    };

    try {
      const response = await addProduct({
        name: newProduct.name,
        price: newProduct.price,
        quantity: newProduct.quantity,
        description: newProduct.description,
        image: newProduct.image,
        seller_id: userSession.id
      });

      const persistedProductId = response?.data?.product_id;
      setLocalProducts((prevProducts) => [
        {
          ...newProduct,
          id: persistedProductId || tempProductId
        },
        ...prevProducts
      ]);

      setFarmerMessage(`Crop added successfully. Saved in DB with product ID: ${persistedProductId || tempProductId}.`);
    } catch (error) {
      const backendMessage = error?.response?.data?.message;
      const backendError = error?.response?.data?.error;
      setFarmerMessage(backendError ? `${backendMessage}: ${backendError}` : (backendMessage || 'Failed to add crop. Please check backend and database.'));
    }

    setFarmerForm({
      name: '',
      price: '',
      description: '',
      category: 'Vegetables',
      image: '',
      quantity: ''
    });
  };

  const handleFarmerImageUpload = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith('image/')) {
      setFarmerMessage('Please choose a valid image file.');
      return;
    }

    const maxBytes = 2 * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      setFarmerMessage('Image size should be less than 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageDataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!imageDataUrl) {
        setFarmerMessage('Failed to process image. Please try another file.');
        return;
      }

      setFarmerForm((prev) => ({ ...prev, image: imageDataUrl }));
      setFarmerMessage('Image selected successfully.');
    };

    reader.onerror = () => {
      setFarmerMessage('Failed to read image file. Please try again.');
    };

    reader.readAsDataURL(selectedFile);
  };

  const handleRecoverImages = async () => {
    const recoverableProducts = localProducts
      .filter((item) => Number(item?.id) > 0)
      .filter((item) => typeof item?.image === 'string' && item.image.startsWith('data:image/'))
      .map((item) => ({
        product_id: item.id,
        image: item.image
      }));

    if (!recoverableProducts.length) {
      setImageRecoveryMessage('No locally saved uploaded images found to recover.');
      return;
    }

    try {
      setIsRecoveringImages(true);
      setImageRecoveryMessage('');
      const response = await recoverProductImages(recoverableProducts);
      const recoveredCount = Number(response?.data?.updated_count) || 0;
      setImageRecoveryMessage(`Recovered ${recoveredCount} image${recoveredCount === 1 ? '' : 's'} from local browser data.`);
    } catch (error) {
      const backendMessage = error?.response?.data?.message;
      setImageRecoveryMessage(backendMessage || 'Failed to recover images. Please try again.');
    } finally {
      setIsRecoveringImages(false);
    }
  };

  const handleLogout = () => {
    setUserSession(null);
    setIsSettingsOpen(false);
    setCartItems([]);
    setBuyerView('products');
    setSearchQuery('');
    setSelectedCategory('All');
    setFarmerMessage('');
    setIsProfileOpen(false);
    setFarmerView('dashboard');
    localStorage.removeItem('agrotrade_user');
    window.agrotrade_user = null;
  };

  const toggleProfilePanel = () => {
    setIsProfileOpen((prevOpen) => !prevOpen);
  };

  const openOrders = () => {
    setIsSettingsOpen(true);
    setIsProfileOpen(false);
  };

  const openWishlist = () => {
    window.alert('My Wishlist section will be available here.');
    setIsProfileOpen(false);
  };

  const openTerms = () => {
    window.alert('Terms and Conditions: Orders are subject to availability and platform policies.');
    setIsProfileOpen(false);
  };

  const openSettings = () => {
    setIsSettingsOpen(true);
    setIsProfileOpen(false);
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
  };

  const openCartPage = () => {
    if (userSession?.role !== 'buyer') {
      return;
    }

    setIsSettingsOpen(false);
    setBuyerView('cart');
  };

  const openProductsPage = () => {
    setBuyerView('products');
  };

  const openCartFromProfile = () => {
    if (userSession?.role !== 'buyer') {
      window.alert('Cart is available for buyer mode.');
      return;
    }

    openCartPage();

    setIsProfileOpen(false);
  };

  const handleProfileSave = async ({ name, email }) => {
    if (!userSession?.id) {
      throw new Error('User session is missing. Please login again.');
    }

    const response = await API.put('/profile', {
      user_id: userSession.id,
      name,
      email
    });

    const updatedUser = {
      ...userSession,
      name: response?.data?.user?.name || name,
      email: response?.data?.user?.email || email
    };

    setUserSession(updatedUser);
    localStorage.setItem('agrotrade_user', JSON.stringify(updatedUser));
    window.agrotrade_user = updatedUser;
  };

  if (!userSession) {
    return (
      <LoginPage
        authMode={authMode}
        authForm={authForm}
        authLoading={authLoading}
        authError={authError}
        onSubmit={handleAuthSubmit}
        onRoleChange={(role) => setAuthForm((prev) => ({ ...prev, role }))}
        onFieldChange={(field, value) => setAuthForm((prev) => ({ ...prev, [field]: value }))}
        onModeToggle={() => setAuthMode((prev) => (prev === 'login' ? 'register' : 'login'))}
        onGoogleLogin={handleGoogleLogin}
      />
    );
  }

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="App">
      <header className="navbar">
        <div className="navbar-container">
          <h1 className="logo">AgroTrade</h1>
          <form className="search-bar" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search for seeds, vegetables, grains and more"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <button type="submit">Search</button>
          </form>
          <div className="navbar-icons">
            <span>{userSession.role === 'farmer' ? 'Farmer' : 'Buyer'} Mode</span>
            <div className="profile-menu-anchor" ref={profileMenuRef}>
              <button
                type="button"
                className="profile-trigger-btn"
                onClick={toggleProfilePanel}
                aria-expanded={isProfileOpen}
                aria-haspopup="menu"
              >
                Profile ({userSession.name})
              </button>
              <Profile
                isOpen={isProfileOpen}
                userName={userSession.name}
                userEmail={userSession.email}
                userRole={userSession.role}
                onProfileSave={handleProfileSave}
                onMyOrders={openOrders}
                onMyWishlist={openWishlist}
                onCart={openCartFromProfile}
                onSettings={openSettings}
                onTerms={openTerms}
                onLogout={handleLogout}
              />
            </div>
            {userSession.role === 'buyer' && (
              <button
                type="button"
                className="buyer-view-toggle-btn"
                onClick={openCartPage}
              >
                Cart ({cartItemCount})
              </button>
            )}
          </div>
        </div>
      </header>

      {isSettingsOpen && (
        <Settings
          userSession={userSession}
          onBack={closeSettings}
          onOpenCart={openCartPage}
          onLogout={handleLogout}
        />
      )}

      {!isSettingsOpen && userSession.role === 'buyer' && (
        <>
          {buyerView === 'products' ? (
            <>
              <section className="category-strip">
                <div className="category-strip-inner" ref={categoryStripRef}>
                  {topCategories.map((category) => (
                    <button
                      type="button"
                      key={category}
                      className={`category-chip ${selectedCategory === category ? 'active' : ''}`}
                      onClick={() => handleCategoryClick(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </section>

              <section className="offer-strip">
                <p>
                  Mega Harvest Sale: Up to 35% off on recommended essentials | Free delivery above Rs.599
                </p>
              </section>

              <Products
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
                onAddToCart={handleAddToCart}
                externalProducts={localProducts}
                viewerRole={userSession.role}
                refreshToken={productsRefreshToken}
              />

              {cartItemCount > 0 && (
                <button
                  type="button"
                  className="mobile-cart-fab"
                  onClick={openCartPage}
                  aria-label={`View cart with ${cartItemCount} items`}
                >
                  <span className="mobile-cart-fab-icon" aria-hidden="true">🛒</span>
                  <span className="mobile-cart-fab-count" aria-hidden="true">{cartItemCount}</span>
                  <span className="sr-only">View Cart</span>
                </button>
              )}
            </>
          ) : buyerView === 'cart' ? (
            <div className="app-content-wrap">
              <ViewCart
                items={cartItems}
                onIncrement={incrementCartItem}
                onDecrement={decrementCartItem}
                onRemove={removeCartItem}
                onCheckout={handleCheckout}
                loading={isOrdering}
                onBack={openProductsPage}
              />
            </div>
          ) : (
            <div className="app-content-wrap">
              <PaymentPage
                items={cartItems}
                loading={isOrdering}
                onPay={handleConfirmPayment}
                onBack={() => setBuyerView('cart')}
              />
            </div>
          )}

          {buyerView === 'cart' && (
            <div className="app-content-wrap app-content-wrap-desktop-cart" id="cart-section">
              <Cart
                items={cartItems}
                onIncrement={incrementCartItem}
                onDecrement={decrementCartItem}
                onRemove={removeCartItem}
                onCheckout={handleCheckout}
                loading={isOrdering}
              />
            </div>
          )}
        </>
      )}

      {!isSettingsOpen && userSession.role === 'farmer' && (
        <>
          {farmerView === 'dashboard' ? (
            <FarmerDashboard />
          ) : (
            <main className="farmer-dashboard">
                  <AddProduct
                farmerForm={farmerForm}
                setFarmerForm={setFarmerForm}
                onSubmit={handleFarmerProductSubmit}
                onImageUpload={handleFarmerImageUpload}
                farmerMessage={farmerMessage}
                onRecoverImages={handleRecoverImages}
                isRecoveringImages={isRecoveringImages}
                imageRecoveryMessage={imageRecoveryMessage}
                localProducts={localProducts}
              />
              <button
                type="button"
                className="back-to-dashboard-btn"
                onClick={() => setFarmerView('dashboard')}
              >
                ← Back to Dashboard
              </button>
            </main>
          )}
          {farmerView === 'dashboard' && (
            <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
              <button
                type="button"
                className="add-product-fab"
                onClick={() => setFarmerView('products')}
              >
                + Add Product
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
