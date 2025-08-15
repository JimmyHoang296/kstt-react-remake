import React, { useState } from "react";
import LoadingModal from "../../components/LoadingModal";
import { URL } from "../../assets/variables";

const Login = ({ setIsLogin, setData }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert("Nhập thông tin");
      return;
    }
    const submitData = {
      type: "login",
      data: { username: email, password },
    };

    try {
      setLoading(true);
      const response = await fetch(URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(submitData), // body data type must match "Content-Type" header
      });

      const result = await response.json(); // Assuming response is JSON
      if (result.success) {
        // update to local
        setData(result.data);
        setIsLogin(true);
      } else {
        alert("Thông tin đăng nhập sai");
      }
    } catch (error) {
      console.error("Error sending request:", error);
      return { success: false, error: error.message }; // Return error object
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center text-red-800">
          KSTT WCM
        </h2>
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tài khoản
            </label>
            <input
              type="text"
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition"
          >
            Login
          </button>
        </form>
      </div>
      {loading && <LoadingModal message={"loading..."} />}
    </div>
  );
};

export default Login;
