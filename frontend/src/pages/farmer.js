import React, { useState, useEffect } from "react";
import API from "../api";
import "../styles/farmer.css";

const FarmerDashboard = () => {
  const [farmerData, setFarmerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [farmerId, setFarmerId] = useState(null);
  const [user, setUser] = useState(null);
  const [approvingOrders, setApprovingOrders] = useState([]);

  useEffect(() => {
    // Get user from App.js stored in window object or localStorage
    let userData = null;

    // Try to get user from window.agrotrade_user (set by App.js)
    if (window.agrotrade_user) {
      userData = window.agrotrade_user;
    } else {
      // Fallback to localStorage
      const storedUser = localStorage.getItem("agrotrade_user");
      if (storedUser) {
        try {
          userData = JSON.parse(storedUser);
        } catch (e) {
          console.error("Failed to parse stored user", e);
        }
      }
    }

    if (!userData || !userData.id) {
      setError("User information not found. Please log in again.");
      setLoading(false);
      return;
    }

    setUser(userData);
    setFarmerId(userData.id);

    // Fetch dashboard data
    if (userData.id) {
      fetchDashboardData(userData.id);
    }
  }, [farmerId]);

  const fetchDashboardData = async (fid) => {
    try {
      setLoading(true);
      const response = await API.get(`/farmer/dashboard/${fid}`);
      const data = response.data;
      setFarmerData(data);
      setError("");
    } catch (err) {
      const backendMessage = err?.response?.data?.message;
      setError(backendMessage || err.message || "Error loading dashboard");
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("agrotrade_user");
    window.location.reload();
  };

  const handleAddProduct = () => {
    // This will be handled by App.js setFarmerView state
    window.dispatchEvent(new CustomEvent("openFarmerProducts"));
  };

  const handleApproveOrder = async (orderId) => {
    if (!farmerId) {
      return;
    }

    try {
      setApprovingOrders((prev) => [...prev, orderId]);
      await API.put(`/orders/${orderId}/approve`, { farmer_id: farmerId });

      setFarmerData((prev) => {
        if (!prev) {
          return prev;
        }

        const approvedOrder = prev.recent_orders.find((order) => order.order_id === orderId);
        const shouldIncreaseIncome = approvedOrder && (approvedOrder.status || "pending") === "pending";
        const approvedItemCount = shouldIncreaseIncome ? Number(approvedOrder.item_count || 0) : 0;

        return {
          ...prev,
          total_items_sold: shouldIncreaseIncome
            ? Number(prev.total_items_sold || 0) + approvedItemCount
            : prev.total_items_sold,
          total_income: shouldIncreaseIncome
            ? Number(prev.total_income || 0) + Number(approvedOrder.total || 0)
            : prev.total_income,
          recent_orders: prev.recent_orders.map((order) => (
            order.order_id === orderId
              ? { ...order, status: "approved" }
              : order
          ))
        };
      });
    } catch (err) {
      const backendMessage = err?.response?.data?.message;
      window.alert(backendMessage || "Failed to approve order");
    } finally {
      setApprovingOrders((prev) => prev.filter((id) => id !== orderId));
    }
  };

  if (!user) {
    return <div className="loading">Redirecting to login...</div>;
  }

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => fetchDashboardData(farmerId)}>Retry</button>
      </div>
    );
  }

  return (
    <div className="farmer-dashboard">
      {/* Header */}
      <header className="farmer-header">
        <div className="header-content">
          <h1>Farmer Dashboard</h1>
          <div className="header-actions">
            <p className="welcome-text">Welcome, {user.name}!</p>
            <button className="btn btn-primary" onClick={handleAddProduct}>
              Add New Products
            </button>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>Total NUDES</h3>
            <p className="stat-number">{farmerData.total_items_sold}</p>
            <p className="stat-label">Items Sold</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Total Income</h3>
            <p className="stat-number">₹{farmerData.total_income.toFixed(2)}</p>
            <p className="stat-label">Revenue Generated</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <h3>Average Rating</h3>
            <p className="stat-number">
              {farmerData.average_rating.toFixed(1)}{" "}
              <span className="rating-stars">
                {"★".repeat(Math.round(farmerData.average_rating))}
                {"☆".repeat(5 - Math.round(farmerData.average_rating))}
              </span>
            </p>
            <p className="stat-label">From {farmerData.total_ratings} Customers</p>
          </div>
        </div>
      </section>

      {/* Recent Orders Section */}
      <section className="orders-section">
        <h2>📋 Recent Orders & Customer Reviews</h2>

        {farmerData.recent_orders.length === 0 ? (
          <div className="empty-state">
            <p>No orders yet. Your products will appear here once customers place orders!</p>
          </div>
        ) : (
          <div className="orders-container">
            {farmerData.recent_orders.map((order) => (
              <div key={order.order_id} className="order-card">
                <div className="order-header">
                  <div className="order-info">
                    <h4>Order #{order.order_id}</h4>
                    <p className="customer-name">👤 {order.customer_name}</p>
                    <p className="order-date">📅 {new Date(order.date).toLocaleDateString()}</p>
                    <p className={`order-status status-${order.status || "pending"}`}>
                      Status: {(order.status || "pending").toUpperCase()}
                    </p>
                  </div>
                  <div className="order-amount">
                    <p className="amount">₹{order.total.toFixed(2)}</p>
                  </div>
                </div>

                {(order.status || "pending") === "pending" && (
                  <div className="order-actions">
                    <button
                      type="button"
                      className="btn btn-approve"
                      onClick={() => handleApproveOrder(order.order_id)}
                      disabled={approvingOrders.includes(order.order_id)}
                    >
                      {approvingOrders.includes(order.order_id) ? "Approving..." : "Approve Order"}
                    </button>
                  </div>
                )}

                {order.rating && (
                  <div className="order-review">
                    <div className="rating-display">
                      <span className="stars">
                        {order.rating >= 1 ? "★" : "☆"}
                        {order.rating >= 2 ? "★" : "☆"}
                        {order.rating >= 3 ? "★" : "☆"}
                        {order.rating >= 4 ? "★" : "☆"}
                        {order.rating >= 5 ? "★" : "☆"}
                      </span>
                      <span className="rating-value">{order.rating.toFixed(1)}</span>
                    </div>
                    {order.comment && (
                      <p className="review-comment">💬 "{order.comment}"</p>
                    )}
                  </div>
                )}

                {!order.rating && (
                  <div className="no-review">
                    <p>⏳ No review yet from customer</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default FarmerDashboard;
