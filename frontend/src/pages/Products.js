import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchProducts as fetchProductsApi } from "../api/productApi";
import "../styles/Products.css";

function Products({
  searchQuery = "",
  selectedCategory = "All",
  onAddToCart,
  externalProducts = [],
  viewerRole = "buyer",
  refreshToken = 0
}) {
  const normalizeCategory = (value) => (value || "").trim().toLowerCase();
  const inferCategory = (item) => {
    const combinedText = [
      item?.name || "",
      item?.description || "",
      ...(Array.isArray(item?.features) ? item.features : [])
    ].join(" ").toLowerCase();

    const keywordCategoryMap = [
      { category: "Vegetables", keywords: ["tomato", "carrot", "potato", "onion", "beetroot", "vegetable"] },
      { category: "Fruits", keywords: ["apple", "banana", "orange", "mango", "kiwi", "strawberry", "fruit"] },
      { category: "Grains", keywords: ["rice", "wheat", "flour", "dal", "grain", "lentil", "moong"] },
      { category: "Dairy", keywords: ["milk", "curd", "paneer", "ghee", "dairy"] },
      { category: "Leafy", keywords: ["spinach", "leafy", "coriander", "mint"] },
      { category: "Spices", keywords: ["spice", "turmeric", "chilli", "pepper", "masala"] }
    ];

    for (const rule of keywordCategoryMap) {
      if (rule.keywords.some((keyword) => combinedText.includes(keyword))) {
        return rule.category;
      }
    }

    return "Groceries";
  };
  const isImageSource = (value) => typeof value === "string"
    && (
      value.startsWith("data:image/")
      || value.startsWith("http://")
      || value.startsWith("https://")
      || value.startsWith("blob:")
      || value.startsWith("/")
    );

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("popularity");
  const [maxPriceFilter, setMaxPriceFilter] = useState(0);
  const hasInitializedPriceFilter = useRef(false);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const response = await fetchProductsApi();
        setProducts(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("Failed to load products");
        // Use mock data for testing
        setProducts(getMockProducts());
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [refreshToken]);

  const getMockProducts = () => [
    {
      id: 1,
      name: "Farm Fresh Tomatoes",
      price: 45,
      description: "Organic red tomatoes directly sourced from local farms.",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS7DgM67Ju-XAqTSRfy9yIx9IvbX8hSp3hkcg&s",
      category: "Vegetables",
      rating: 4.4,
      reviews: 186,
      features: ["Same day harvest", "Pesticide checked", "Fast delivery"],
      discount: 16,
      quantity: 50
    },
    {
      id: 2,
      name: "Premium Carrots",
      price: 30,
      description: "Sweet and crunchy carrots ideal for salads and juices.",
      image: "/product-images/fresh-carrots.jpeg",
      category: "Vegetables",
      rating: 4.2,
      reviews: 121,
      features: ["Vitamin rich", "Grade A", "Fresh pack"],
      discount: 12,
      quantity: 75
    },
    {
      id: 3,
      name: "Whole Wheat Flour 5kg",
      price: 120,
      description: "Stone-ground wheat flour suitable for soft rotis.",
      image: "🌾",
      category: "Grains",
      rating: 4.6,
      reviews: 304,
      features: ["Chakki fresh", "Protein rich", "No preservatives"],
      discount: 22,
      quantity: 30
    },
    {
      id: 4,
      name: "Aged Basmati Rice 1kg",
      price: 200,
      description: "Long grain aromatic rice with superior texture.",
      image: "🍚",
      category: "Grains",
      rating: 4.7,
      reviews: 442,
      features: ["Aged grains", "Extra long", "Naturally aromatic"],
      discount: 18,
      quantity: 20
    },
    {
      id: 5,
      name: "Fresh Potatoes",
      price: 25,
      description: "Cleaned potatoes packed for daily cooking use.",
      image: "🥔",
      category: "Vegetables",
      rating: 4.1,
      reviews: 98,
      features: ["Sorted size", "Mud free", "Direct procurement"],
      discount: 10,
      quantity: 100
    },
    {
      id: 6,
      name: "Golden Onions",
      price: 35,
      description: "Firm and flavorful onions for all Indian dishes.",
      image: "🧅",
      category: "Vegetables",
      rating: 4.0,
      reviews: 133,
      features: ["Storage friendly", "Uniform bulbs", "Quality checked"],
      discount: 8,
      quantity: 60
    },
    {
      id: 7,
      name: "Fresh Spinach Bunch",
      price: 40,
      description: "Tender spinach leaves, washed and ready to cook.",
      image: "/product-images/spinach.jpg",
      category: "Leafy",
      rating: 4.3,
      reviews: 77,
      features: ["Iron rich", "Leaf sorted", "Moisture lock pack"],
      discount: 11,
      quantity: 45
    },
    {
      id: 8,
      name: "Pure Cow Milk 1L",
      price: 50,
      description: "Freshly chilled milk from trusted dairy partners.",
      image: "🥛",
      category: "Dairy",
      rating: 4.5,
      reviews: 267,
      features: ["Morning delivery", "No adulteration", "Lab tested"],
      discount: 14,
      quantity: 80
    }
  ];

  const fallbackProducts = useMemo(() => getMockProducts(), []);

  const normalizedProducts = useMemo(() => {
    const sourceProducts = products?.length ? products : fallbackProducts;
    const mergedSource = [...externalProducts, ...sourceProducts];

    return mergedSource.map((item, index) => {
      const parsedPrice = Number(item.price);
      const parsedRating = Number(item.rating);
      const parsedReviews = Number(item.reviews);
      const parsedDiscount = Number(item.discount);
      const parsedQuantity = Number(item.quantity);

      return {
        id: item.id ?? `product-${index + 1}`,
        name: item.name || `Product ${index + 1}`,
        price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
        description: item.description || "Fresh quality produce from trusted suppliers.",
        image: item.image || "",
        category: (item.category && String(item.category).trim()) || inferCategory(item),
        rating: Number.isFinite(parsedRating) ? parsedRating : 4.0,
        reviews: Number.isFinite(parsedReviews) ? parsedReviews : (100 + index * 9),
        features: Array.isArray(item.features) && item.features.length
          ? item.features
          : ["Quality assured", "Fast delivery", "Trusted source"],
        discount: Number.isFinite(parsedDiscount) ? parsedDiscount : 10,
        // Preserve zero stock from backend; only use fallback when value is missing/invalid.
        quantity: Number.isFinite(parsedQuantity) ? parsedQuantity : 10
      };
    });
  }, [externalProducts, fallbackProducts, products]);

  const maxAvailablePrice = useMemo(() => {
    if (!normalizedProducts.length) {
      return 1000;
    }

    return Math.max(...normalizedProducts.map((item) => item.price));
  }, [normalizedProducts]);

  useEffect(() => {
    setMaxPriceFilter((currentValue) => {
      const numericCurrentValue = Number(currentValue);

      if (!hasInitializedPriceFilter.current) {
        hasInitializedPriceFilter.current = true;
        return maxAvailablePrice;
      }

      if (!Number.isFinite(numericCurrentValue)) {
        return maxAvailablePrice;
      }

      return Math.min(numericCurrentValue, maxAvailablePrice);
    });
  }, [maxAvailablePrice]);

  const appliedMaxPrice = Number.isFinite(Number(maxPriceFilter))
    ? Number(maxPriceFilter)
    : maxAvailablePrice;

  const filteredProducts = useMemo(() => {
    const safeSearch = searchQuery.trim().toLowerCase();
    const selectedCategoryNormalized = normalizeCategory(selectedCategory);

    const result = normalizedProducts.filter((item) => {
      const itemCategory = normalizeCategory(item.category);
      const categoryMatch = selectedCategoryNormalized === "all"
        || itemCategory === selectedCategoryNormalized;

      const searchMatch = !safeSearch
        || item.name.toLowerCase().includes(safeSearch)
        || item.description.toLowerCase().includes(safeSearch)
        || item.category.toLowerCase().includes(safeSearch)
        || item.features.some((feature) => feature.toLowerCase().includes(safeSearch));

      const priceMatch = item.price <= appliedMaxPrice;

      return categoryMatch && searchMatch && priceMatch;
    });

    switch (sortBy) {
      case "price-low":
        return [...result].sort((a, b) => a.price - b.price);
      case "price-high":
        return [...result].sort((a, b) => b.price - a.price);
      case "rating":
        return [...result].sort((a, b) => b.rating - a.rating);
      case "discount":
        return [...result].sort((a, b) => b.discount - a.discount);
      case "popularity":
      default:
        return [...result].sort((a, b) => (b.rating * b.reviews) - (a.rating * a.reviews));
    }
  }, [appliedMaxPrice, normalizedProducts, searchQuery, selectedCategory, sortBy]);

  const recommendedProducts = useMemo(() => {
    const selectedCategoryNormalized = normalizeCategory(selectedCategory);
    const source = selectedCategoryNormalized === "all"
      ? (filteredProducts.length ? filteredProducts : normalizedProducts)
      : filteredProducts;

    return [...source]
      .sort((a, b) => (b.rating + b.discount / 10) - (a.rating + a.discount / 10))
      .slice(0, 4);
  }, [filteredProducts, normalizedProducts, selectedCategory]);

  const getOriginalPrice = (price, discount = 0) => {
    const safeDiscount = Math.min(Math.max(discount, 0), 90);
    return Math.round(price / (1 - safeDiscount / 100));
  };

  if (loading) {
    return <div className="products-container"><p>Loading products...</p></div>;
  }

  return (
    <div className="products-page" id="products-section">
      <section className="hero-panel">
        <div className="hero-content">
          <h2>Daily Essentials Curated For Smart Shopping</h2>
          <p>
            Discover recommended products with top ratings, better discounts, and reliable farm quality.
          </p>
          <div className="hero-tags">
            <span>Top deals</span>
            <span>Farm assured</span>
            <span>Quick delivery</span>
          </div>
        </div>
        <div className="hero-metric-card">
          <h4>Today&apos;s Specials</h4>
          <p>52 products on discount</p>
          <strong>Save up to 35%</strong>
        </div>
      </section>

      <section className="recommended-section">
        <div className="section-title-row">
          <h3>Recommended For You</h3>
          <button type="button">View all</button>
        </div>
        <div className="recommended-grid">
          {recommendedProducts.map((item) => (
            <article key={`rec-${item.id}`} className="recommended-card">
              <div className="recommended-image">
                {isImageSource(item.image)
                  ? <img src={item.image} alt={item.name} className="catalog-image" />
                  : null}
              </div>
              <div className="recommended-content">
                <h4>{item.name}</h4>
                <p>{item.category || "Groceries"}</p>
                <strong>From Rs.{item.price}</strong>
                {viewerRole === "buyer" ? (
                  <button
                    type="button"
                    className="recommended-add-btn"
                    onClick={() => onAddToCart && onAddToCart(item)}
                  >
                    Add to Cart
                  </button>
                ) : (
                  <button type="button" className="recommended-add-btn" disabled>
                    Seller View
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <main className="products-container">
        <div className="section-title-row">
          <h3>Feature Rich Products</h3>
          <button type="button">Live filtered catalog</button>
        </div>
        <section className="filter-toolbar">
          <div className="price-filter-block">
            <label htmlFor="price-filter">
              Max price: Rs.{appliedMaxPrice}
            </label>
            <input
              id="price-filter"
              type="range"
              min="0"
              max={maxAvailablePrice}
              step="1"
              value={appliedMaxPrice}
              onChange={(event) => setMaxPriceFilter(Number(event.target.value))}
              onInput={(event) => setMaxPriceFilter(Number(event.target.value))}
            />
          </div>
          <div className="sort-filter-block">
            <label htmlFor="sort-products">Sort by</label>
            <select
              id="sort-products"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="popularity">Popularity</option>
              <option value="rating">Rating</option>
              <option value="discount">Highest discount</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
            </select>
          </div>
          <p className="results-count">{filteredProducts.length} items found</p>
        </section>
        {error && <p className="error-message">{error}</p>}
        <div className="products-grid">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((p) => {
              const originalPrice = getOriginalPrice(p.price, p.discount);
              return (
              <div key={p.id} className="product-card">
                <div className="product-image">
                  {isImageSource(p.image)
                    ? <img src={p.image} alt={p.name} className="catalog-image" />
                    : p.image}
                </div>
                <span className="discount-pill">{p.discount || 10}% off</span>
                <div className="product-info">
                  <div className="rating-row">
                    <span className="rating-badge">{p.rating || 4.2} ★</span>
                    <span className="review-count">{p.reviews || 120} reviews</span>
                  </div>
                  <h4>{p.name}</h4>
                  <p className="description">{p.description}</p>
                  <div className="feature-list">
                    {p.features.map((feature) => (
                      <span key={`${p.id}-${feature}`}>{feature}</span>
                    ))}
                  </div>
                  <div className="product-footer">
                    <div className="price-block">
                      <span className="price">Rs.{p.price}</span>
                      <span className="original-price">Rs.{originalPrice}</span>
                    </div>
                    <div className="quantity-info">
                      <small>Available: {p.quantity} units</small>
                    </div>
                    {viewerRole === "buyer" ? (
                      <button
                        className="add-to-cart"
                        onClick={() => onAddToCart && onAddToCart(p)}
                        disabled={(Number(p.quantity) || 0) <= 0}
                      >
                        {(Number(p.quantity) || 0) <= 0 ? "Out of Stock" : "Add to Cart"}
                      </button>
                    ) : (
                      <button className="add-to-cart disabled" disabled>
                        Seller View
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
            })
          ) : (
            <p className="empty-state-message">
              No products match this combination of search, category, and price filters.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

export default Products;