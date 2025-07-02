import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import {
  User,
  LogOut,
  Send,
  Plus,
  History,
  ChevronDown,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
  CreditCard,
  Wallet,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Home,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";

// API Configuration
const API_BASE_URL = "http://localhost:3001/api";

// API Helper Functions
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("authToken");
  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
};

// Types
interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Transaction {
  id: string;
  type: "send_money" | "receive_money" | "add_money";
  amount: number;
  status: "completed" | "pending" | "failed";
  paymentMethod?: string;
  note?: string;
  referenceId: string;
  createdAt: string;
  recipient?: {
    name: string;
    email: string;
  };
  sender?: {
    name: string;
    email: string;
  };
}

interface SearchUser {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ConfirmationData {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

type Screen = "login" | "register" | "dashboard" | "send" | "add" | "history";

export interface DigitalWalletAppProps {
  initialScreen?: Screen;
}

const paymentMethods = [
  { id: "UPI", name: "UPI", icon: Wallet },
  { id: "Card", name: "Debit Card", icon: CreditCard },
  { id: "Net Banking", name: "Net Banking", icon: CreditCard },
];

export default function DigitalWalletApp({
  initialScreen = "login",
}: DigitalWalletAppProps) {
  // State management
  const [currentScreen, setCurrentScreen] = useState<Screen>(initialScreen);
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(
    null
  );

  // Auth form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");

  // Send money state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<SearchUser | null>(
    null
  );
  const [sendAmount, setSendAmount] = useState("");
  const [sendNote, setSendNote] = useState("");

  // Add money state
  const [addAmount, setAddAmount] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    paymentMethods[0]
  );

  // Transaction history state
  const [transactionFilter, setTransactionFilter] = useState<
    "all" | "sent" | "received" | "add_money"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [transactionLoading, setTransactionLoading] = useState(false);

  // Check for existing auth on mount
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      loadUserProfile();
    }
  }, []);

  // Load user profile
  const loadUserProfile = async () => {
    try {
      const response = await apiCall("/auth/profile");
      setUser(response.data.user);
      setCurrentScreen("dashboard");
      await loadBalance();
      await loadTransactions();
    } catch (error) {
      localStorage.removeItem("authToken");
      setCurrentScreen("login");
    }
  };

  // Load balance
  const loadBalance = async () => {
    try {
      const response = await apiCall("/wallet/balance");
      setBalance(response.data.balance);
    } catch (error) {
      console.error("Failed to load balance:", error);
    }
  };

  // Load transactions
  const loadTransactions = async (page = 1, type = "all") => {
    try {
      setTransactionLoading(true);
      const typeParam = type === "all" ? "" : `&type=${type}`;
      const response = await apiCall(
        `/transactions?page=${page}&limit=10${typeParam}`
      );

      setTransactions(response.data.transactions);
      setTotalPages(response.data.pagination.pages);
      setCurrentPage(response.data.pagination.page);
    } catch (error) {
      console.error("Failed to load transactions:", error);
      showToast("error", "Failed to load transactions");
    } finally {
      setTransactionLoading(false);
    }
  };

  // Toast management
  const showToast = useCallback(
    (type: ToastMessage["type"], message: string) => {
      const id = Date.now().toString();
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 5000);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Confirmation modal
  const showConfirmation = useCallback(
    (data: Omit<ConfirmationData, "onCancel">) => {
      setConfirmation({
        ...data,
        onCancel: () => setConfirmation(null),
      });
    },
    []
  );

  // Auth functions
  const handleLogin = async () => {
    if (!email || !password) {
      setAuthError("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    setAuthError("");

    try {
      const response = await apiCall("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem("authToken", response.data.token);
      setUser(response.data.user);
      setCurrentScreen("dashboard");
      showToast("success", "Login successful!");

      // Load user data
      await loadBalance();
      await loadTransactions();
    } catch (error: any) {
      setAuthError(error.message);
      showToast("error", "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name || !phone) {
      setAuthError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setAuthError("");

    try {
      const response = await apiCall("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name, phone }),
      });

      localStorage.setItem("authToken", response.data.token);
      setUser(response.data.user);
      setCurrentScreen("dashboard");
      showToast("success", "Registration successful!");

      // Load user data
      await loadBalance();
      await loadTransactions();
    } catch (error: any) {
      setAuthError(error.message);
      showToast("error", "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    showConfirmation({
      title: "Logout",
      message: "Are you sure you want to logout?",
      onConfirm: async () => {
        try {
          await apiCall("/auth/logout", { method: "POST" });
        } catch (error) {
          // Continue with logout even if API call fails
        }

        localStorage.removeItem("authToken");
        setUser(null);
        setBalance(0);
        setTransactions([]);
        setCurrentScreen("login");
        setConfirmation(null);
        showToast("info", "Logged out successfully");
      },
    });
  };

  // Search users
  const searchUsers = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await apiCall(
        `/users/search?query=${encodeURIComponent(query)}`
      );
      setSearchResults(response.data.users);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Send money function
  const handleSendMoney = () => {
    if (!selectedRecipient || !sendAmount || parseFloat(sendAmount) <= 0) {
      showToast("error", "Please select recipient and enter valid amount");
      return;
    }

    const amount = parseFloat(sendAmount);
    if (amount > balance) {
      showToast("error", "Insufficient balance");
      return;
    }

    showConfirmation({
      title: "Confirm Payment",
      message: `Send ₹${amount} to ${selectedRecipient.name}?`,
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await apiCall("/wallet/send-money", {
            method: "POST",
            body: JSON.stringify({
              recipientId: selectedRecipient.id,
              amount,
              note: sendNote || `Payment to ${selectedRecipient.name}`,
            }),
          });

          // Reset form
          setSendAmount("");
          setSendNote("");
          setSelectedRecipient(null);
          setSearchQuery("");
          setConfirmation(null);

          // Refresh data
          await loadBalance();
          await loadTransactions();

          showToast("success", `₹${amount} sent successfully!`);
          setCurrentScreen("dashboard");
        } catch (error: any) {
          showToast(
            "error",
            error.message || "Payment failed. Please try again."
          );
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  // Add money function
  const handleAddMoney = () => {
    if (!addAmount || parseFloat(addAmount) <= 0) {
      showToast("error", "Please enter valid amount");
      return;
    }

    const amount = parseFloat(addAmount);

    showConfirmation({
      title: "Confirm Add Money",
      message: `Add ₹${amount} using ${selectedPaymentMethod.name}?`,
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await apiCall("/wallet/add-money", {
            method: "POST",
            body: JSON.stringify({
              amount,
              paymentMethod: selectedPaymentMethod.id,
            }),
          });

          // Reset form
          setAddAmount("");
          setConfirmation(null);

          // Refresh data
          await loadBalance();
          await loadTransactions();

          showToast("success", `₹${amount} added successfully!`);
          setCurrentScreen("dashboard");
        } catch (error: any) {
          showToast(
            "error",
            error.message || "Add money failed. Please try again."
          );
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  // Handle transaction filter change
  const handleFilterChange = (filter: typeof transactionFilter) => {
    setTransactionFilter(filter);
    setCurrentPage(1);
    loadTransactions(1, filter);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadTransactions(page, transactionFilter);
  };

  // Format currency
  const formatCurrency = (amount: number) =>
    `₹${amount.toLocaleString("en-IN")}`;

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Get transaction display info
  const getTransactionDisplayInfo = (transaction: Transaction) => {
    let displayText = "";
    let color = "";
    let bgColor = "";
    let prefix = "";
    let icon = null;

    switch (transaction.type) {
      case "receive_money":
        displayText = transaction.sender
          ? `Received from ${transaction.sender.name}`
          : "Money received";
        color = "text-emerald-400";
        bgColor = "bg-emerald-500/10 border-emerald-500/20";
        prefix = "+";
        icon = <ArrowLeft className="h-6 w-6" />;
        break;
      case "send_money":
        displayText = transaction.recipient
          ? `Sent to ${transaction.recipient.name}`
          : "Money sent";
        color = "text-rose-400";
        bgColor = "bg-rose-500/10 border-rose-500/20";
        prefix = "-";
        icon = <ArrowRight className="h-6 w-6" />;
        break;
      case "add_money":
        displayText = `Added via ${transaction.paymentMethod || "Payment"}`;
        color = "text-blue-400";
        bgColor = "bg-blue-500/10 border-blue-500/20";
        prefix = "+";
        icon = <Plus className="h-6 w-6" />;
        break;
      default:
        displayText = "Transaction";
        color = "text-slate-300";
        bgColor = "bg-slate-500/10 border-slate-500/20";
        prefix = "";
        icon = <Wallet className="h-6 w-6" />;
    }

    return { displayText, color, bgColor, prefix, icon };
  };

  // Screen animations
  const screenVariants = {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.98,
      transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  };

  // Glass button variants
  const glassButtonVariants = {
    initial: { scale: 1 },
    hover: {
      scale: 1.02,
      boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)",
      transition: { duration: 0.2 },
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1 },
    },
  };

  // Render header
  const renderHeader = () => {
    if (currentScreen === "login" || currentScreen === "register") return null;

    return (
      <header className="bg-slate-900/40 backdrop-blur-xl border-b border-white/10 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border border-blue-400/30 backdrop-blur-sm">
              <Wallet className="h-8 w-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              PayWallet
            </h1>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.div
                variants={glassButtonVariants}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm px-4 py-2 h-auto"
                >
                  <Avatar className="h-8 w-8 mr-3">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                      {user?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user?.name}</span>
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </motion.div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-slate-900/90 backdrop-blur-xl border-white/20 text-white rounded-2xl shadow-2xl"
            >
              <DropdownMenuItem
                onClick={handleLogout}
                className="hover:bg-white/10 focus:bg-white/10 rounded-xl m-1"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    );
  };

  // Render bottom navigation
  const renderBottomNavigation = () => {
    if (currentScreen === "login" || currentScreen === "register") return null;

    const navItems = [
      { id: "dashboard", label: "Home", icon: Home },
      { id: "send", label: "Send", icon: Send },
      { id: "add", label: "Add Money", icon: Plus },
      { id: "history", label: "History", icon: History },
    ];

    return (
      <nav className="bg-slate-900/60 backdrop-blur-xl border-t border-white/10 p-4 md:hidden">
        <div className="flex justify-around max-w-md mx-auto">
          {navItems.map((item) => (
            <motion.div
              key={item.id}
              variants={glassButtonVariants}
              initial="initial"
              whileHover="hover"
              whileTap="tap"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentScreen(item.id as Screen)}
                className={cn(
                  "flex flex-col items-center gap-2 h-auto py-3 px-4 text-slate-300 hover:text-white hover:bg-white/10 rounded-2xl border transition-all duration-200",
                  currentScreen === item.id
                    ? "text-blue-400 bg-blue-500/10 border-blue-400/30 shadow-lg shadow-blue-500/20"
                    : "border-transparent hover:border-white/20"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Button>
            </motion.div>
          ))}
        </div>
      </nav>
    );
  };

  // Render login screen
  const renderLoginScreen = () => (
    <motion.div
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6"
    >
      <Card className="w-full max-w-md bg-slate-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden">
        <CardHeader className="text-center pb-8 pt-12">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl blur-lg opacity-60"></div>
              <div className="relative bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-3xl">
                <Wallet className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
          <CardTitle className="text-4xl font-bold text-white mb-3 tracking-tight">
            Welcome Back
          </CardTitle>
          <p className="text-slate-400 text-lg font-medium">
            Sign in to your PayWallet
          </p>
        </CardHeader>
        <CardContent className="space-y-8 px-8 pb-12">
          <div className="space-y-6">
            <div className="space-y-3">
              <Label
                htmlFor="email"
                className="text-white font-semibold text-base"
              >
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="bg-white/5 border border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 rounded-2xl h-14 text-base backdrop-blur-sm transition-all duration-200"
              />
            </div>
            <div className="space-y-3">
              <Label
                htmlFor="password"
                className="text-white font-semibold text-base"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-white/5 border border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 rounded-2xl h-14 text-base pr-14 backdrop-blur-sm transition-all duration-200"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-4 text-slate-400 hover:text-white hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {authError && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4">
              <p className="text-rose-400 text-sm font-medium">{authError}</p>
            </div>
          )}

          <motion.div
            variants={glassButtonVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
          >
            <Button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-2xl h-14 text-base shadow-lg shadow-blue-500/25 border-0 transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </motion.div>

          <div className="text-center">
            <p className="text-slate-400">
              Don't have an account?{" "}
              <Button
                variant="ghost"
                onClick={() => setCurrentScreen("register")}
                className="text-blue-400 hover:text-blue-300 p-0 h-auto font-semibold"
              >
                Sign up
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  // Render register screen
  const renderRegisterScreen = () => (
    <motion.div
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6"
    >
      <Card className="w-full max-w-md bg-slate-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden">
        <CardHeader className="text-center pb-8 pt-12">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl blur-lg opacity-60"></div>
              <div className="relative bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-3xl">
                <Wallet className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
          <CardTitle className="text-4xl font-bold text-white mb-3 tracking-tight">
            Create Account
          </CardTitle>
          <p className="text-slate-400 text-lg font-medium">
            Join PayWallet today
          </p>
        </CardHeader>
        <CardContent className="space-y-8 px-8 pb-12">
          <div className="space-y-6">
            <div className="space-y-3">
              <Label
                htmlFor="name"
                className="text-white font-semibold text-base"
              >
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="bg-white/5 border border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 rounded-2xl h-14 text-base backdrop-blur-sm transition-all duration-200"
              />
            </div>
            <div className="space-y-3">
              <Label
                htmlFor="email"
                className="text-white font-semibold text-base"
              >
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="bg-white/5 border border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 rounded-2xl h-14 text-base backdrop-blur-sm transition-all duration-200"
              />
            </div>
            <div className="space-y-3">
              <Label
                htmlFor="phone"
                className="text-white font-semibold text-base"
              >
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
                className="bg-white/5 border border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 rounded-2xl h-14 text-base backdrop-blur-sm transition-all duration-200"
              />
            </div>
            <div className="space-y-3">
              <Label
                htmlFor="register-password"
                className="text-white font-semibold text-base"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-white/5 border border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 rounded-2xl h-14 text-base pr-14 backdrop-blur-sm transition-all duration-200"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-4 text-slate-400 hover:text-white hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {authError && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4">
              <p className="text-rose-400 text-sm font-medium">{authError}</p>
            </div>
          )}

          <motion.div
            variants={glassButtonVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
          >
            <Button
              onClick={handleRegister}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-2xl h-14 text-base shadow-lg shadow-blue-500/25 border-0 transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </motion.div>

          <div className="text-center">
            <p className="text-slate-400">
              Already have an account?{" "}
              <Button
                variant="ghost"
                onClick={() => setCurrentScreen("login")}
                className="text-blue-400 hover:text-blue-300 p-0 h-auto font-semibold"
              >
                Sign in
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  // Render dashboard screen
  const renderDashboardScreen = () => (
    <motion.div
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="p-6 space-y-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Balance Card */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/60 to-slate-800/60 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 animate-pulse"></div>
          <CardContent className="relative p-8">
            <div className="text-center space-y-6">
              <div>
                <p className="text-slate-400 mb-3 text-lg font-medium">
                  Total Balance
                </p>
                <h2 className="text-5xl font-bold text-white mb-8 tracking-tight">
                  {formatCurrency(balance)}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                <motion.div
                  variants={glassButtonVariants}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button
                    onClick={() => setCurrentScreen("send")}
                    size="lg"
                    className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl font-semibold h-14 backdrop-blur-sm transition-all duration-200"
                  >
                    <Send className="h-5 w-5 mr-2" />
                    Send Money
                  </Button>
                </motion.div>
                <motion.div
                  variants={glassButtonVariants}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button
                    onClick={() => setCurrentScreen("add")}
                    size="lg"
                    className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl font-semibold h-14 backdrop-blur-sm transition-all duration-200"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Money
                  </Button>
                </motion.div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-8 pb-6">
            <CardTitle className="text-white text-2xl font-bold">
              Recent Transactions
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentScreen("history")}
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-2xl border border-transparent hover:border-blue-400/30 transition-all duration-200"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {transactions.slice(0, 5).map((transaction) => {
                  const { displayText, color, bgColor, prefix, icon } =
                    getTransactionDisplayInfo(transaction);

                  return (
                    <motion.div
                      key={transaction.id}
                      className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-sm transition-all duration-200"
                      whileHover={{ scale: 1.01, y: -2 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "p-4 rounded-2xl border backdrop-blur-sm",
                            bgColor
                          )}
                        >
                          <div className={color}>{icon}</div>
                        </div>
                        <div>
                          <p className="font-semibold text-white text-lg">
                            {displayText}
                          </p>
                          <p className="text-sm text-slate-400 font-medium">
                            {formatDate(transaction.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn("font-bold text-xl", color)}>
                          {prefix}
                          {formatCurrency(transaction.amount)}
                        </p>
                        <Badge
                          variant={
                            transaction.status === "completed"
                              ? "default"
                              : "secondary"
                          }
                          className={cn(
                            "text-xs font-medium rounded-xl",
                            transaction.status === "completed"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                          )}
                        >
                          {transaction.status}
                        </Badge>
                      </div>
                    </motion.div>
                  );
                })}
                {transactions.length === 0 && (
                  <div className="text-center py-12">
                    <Wallet className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg">
                      No transactions yet
                    </p>
                    <p className="text-slate-500 text-sm">
                      Start by adding money or sending payments
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );

  // Render send money screen
  const renderSendMoneyScreen = () => (
    <motion.div
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="p-6 space-y-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
    >
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <motion.div
            variants={glassButtonVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentScreen("dashboard")}
              className="text-white hover:bg-white/10 rounded-2xl border border-white/20 p-3"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </motion.div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Send Money
          </h1>
        </div>

        <Card className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl">
          <CardHeader className="p-8 pb-6">
            <CardTitle className="text-white text-2xl font-semibold">
              Select Recipient
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-8">
            <div className="relative">
              <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Search by name, email, or phone"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 bg-white/5 border border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 rounded-2xl h-14 backdrop-blur-sm transition-all duration-200"
              />
            </div>

            {searchQuery && searchResults.length > 0 && (
              <ScrollArea className="h-[250px]">
                <div className="space-y-3">
                  {searchResults.map((result) => (
                    <motion.div
                      key={result.id}
                      onClick={() => {
                        setSelectedRecipient(result);
                        setSearchQuery("");
                      }}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 backdrop-blur-sm transition-all duration-200"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                          {result.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-white">
                          {result.name}
                        </p>
                        <p className="text-sm text-slate-400">{result.phone}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {searchQuery && searchResults.length === 0 && (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-400">No users found</p>
                <p className="text-slate-500 text-sm">
                  Try searching with a different name or phone number
                </p>
              </div>
            )}

            {selectedRecipient && (
              <div className="flex items-center gap-4 p-6 rounded-2xl bg-blue-500/10 border border-blue-400/30 backdrop-blur-sm">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                    {selectedRecipient.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-white">
                    {selectedRecipient.name}
                  </p>
                  <p className="text-sm text-slate-400">
                    {selectedRecipient.phone}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRecipient(null)}
                  className="text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl"
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl">
          <CardHeader className="p-8 pb-6">
            <CardTitle className="text-white text-2xl font-semibold">
              Enter Amount
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-8">
            <div className="space-y-3">
              <Label htmlFor="amount" className="text-white font-semibold">
                Amount
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-4 text-slate-400 text-lg font-semibold">
                  ₹
                </span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  className="pl-10 bg-white/5 border border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 rounded-2xl h-14 text-lg backdrop-blur-sm transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="note" className="text-white font-semibold">
                Note (Optional)
              </Label>
              <Input
                id="note"
                type="text"
                placeholder="Add a note"
                value={sendNote}
                onChange={(e) => setSendNote(e.target.value)}
                className="bg-white/5 border border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 rounded-2xl h-14 text-base backdrop-blur-sm transition-all duration-200"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[500, 1000, 2000].map((amount) => (
                <motion.div
                  key={amount}
                  variants={glassButtonVariants}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSendAmount(amount.toString())}
                    className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-blue-400/30 rounded-2xl h-12 backdrop-blur-sm transition-all duration-200"
                  >
                    ₹{amount}
                  </Button>
                </motion.div>
              ))}
            </div>

            <motion.div
              variants={glassButtonVariants}
              initial="initial"
              whileHover="hover"
              whileTap="tap"
            >
              <Button
                onClick={handleSendMoney}
                disabled={!selectedRecipient || !sendAmount || isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-2xl h-14 text-base shadow-lg shadow-blue-500/25 transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Send Money"
                )}
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );

  // Render add money screen
  const renderAddMoneyScreen = () => (
    <motion.div
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="p-6 space-y-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
    >
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <motion.div
            variants={glassButtonVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentScreen("dashboard")}
              className="text-white hover:bg-white/10 rounded-2xl border border-white/20 p-3"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </motion.div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Add Money
          </h1>
        </div>

        <Card className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl">
          <CardHeader className="p-8 pb-6">
            <CardTitle className="text-white text-2xl font-semibold">
              Select Amount
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-8">
            <div className="grid grid-cols-2 gap-4">
              {[500, 1000, 2000, 5000].map((amount) => (
                <motion.div
                  key={amount}
                  variants={glassButtonVariants}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button
                    variant={
                      addAmount === amount.toString() ? "default" : "outline"
                    }
                    onClick={() => setAddAmount(amount.toString())}
                    className={cn(
                      "h-16 text-lg font-semibold rounded-2xl w-full transition-all duration-200",
                      addAmount === amount.toString()
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-lg shadow-blue-500/25"
                        : "bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-blue-400/30 backdrop-blur-sm"
                    )}
                  >
                    ₹{amount}
                  </Button>
                </motion.div>
              ))}
            </div>

            <div className="space-y-3">
              <Label
                htmlFor="custom-amount"
                className="text-white font-semibold"
              >
                Custom Amount
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-4 text-slate-400 text-lg font-semibold">
                  ₹
                </span>
                <Input
                  id="custom-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  className="pl-10 bg-white/5 border border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 rounded-2xl h-14 text-lg backdrop-blur-sm transition-all duration-200"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl">
          <CardHeader className="p-8 pb-6">
            <CardTitle className="text-white text-2xl font-semibold">
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-8 pb-8">
            {paymentMethods.map((method) => (
              <motion.div
                key={method.id}
                onClick={() => setSelectedPaymentMethod(method)}
                className={cn(
                  "flex items-center gap-4 p-6 rounded-2xl border cursor-pointer transition-all duration-200 backdrop-blur-sm",
                  selectedPaymentMethod.id === method.id
                    ? "border-blue-400/50 bg-blue-500/10 shadow-lg shadow-blue-500/20"
                    : "border-white/20 bg-white/5 hover:bg-white/10"
                )}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <method.icon className="h-6 w-6 text-white" />
                <span className="font-semibold text-white">{method.name}</span>
                {selectedPaymentMethod.id === method.id && (
                  <CheckCircle className="h-6 w-6 text-blue-400 ml-auto" />
                )}
              </motion.div>
            ))}
          </CardContent>
        </Card>

        <motion.div
          variants={glassButtonVariants}
          initial="initial"
          whileHover="hover"
          whileTap="tap"
        >
          <Button
            onClick={handleAddMoney}
            disabled={!addAmount || isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-2xl h-14 text-base shadow-lg shadow-blue-500/25 transition-all duration-200"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Add ${addAmount ? formatCurrency(parseFloat(addAmount)) : "₹0"}`
            )}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );

  // Render transaction history screen
  const renderTransactionHistoryScreen = () => (
    <motion.div
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="p-6 space-y-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <motion.div
            variants={glassButtonVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentScreen("dashboard")}
              className="text-white hover:bg-white/10 rounded-2xl border border-white/20 p-3"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </motion.div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Transaction History
          </h1>
        </div>

        <Card className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl">
          <CardHeader className="p-8 pb-6">
            <Tabs
              value={transactionFilter}
              onValueChange={(value) =>
                handleFilterChange(value as typeof transactionFilter)
              }
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/20 rounded-2xl p-1">
                <TabsTrigger
                  value="all"
                  className="text-white data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl font-semibold transition-all duration-200"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="sent"
                  className="text-white data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl font-semibold transition-all duration-200"
                >
                  Sent
                </TabsTrigger>
                <TabsTrigger
                  value="received"
                  className="text-white data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl font-semibold transition-all duration-200"
                >
                  Received
                </TabsTrigger>
                <TabsTrigger
                  value="add_money"
                  className="text-white data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl font-semibold transition-all duration-200"
                >
                  Added
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            {transactionLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-6">
                    <Skeleton className="h-12 w-12 rounded-2xl bg-white/10" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32 bg-white/10" />
                      <Skeleton className="h-3 w-24 bg-white/10" />
                    </div>
                    <Skeleton className="h-6 w-20 bg-white/10" />
                  </div>
                ))}
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {transactions.map((transaction) => {
                    const { displayText, color, bgColor, prefix, icon } =
                      getTransactionDisplayInfo(transaction);

                    return (
                      <motion.div
                        key={transaction.id}
                        className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-sm transition-all duration-200"
                        whileHover={{ scale: 1.01, y: -2 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              "p-4 rounded-2xl border backdrop-blur-sm",
                              bgColor
                            )}
                          >
                            <div className={color}>{icon}</div>
                          </div>
                          <div>
                            <p className="font-semibold text-white text-lg">
                              {displayText}
                            </p>
                            <p className="text-sm text-slate-400 font-medium">
                              {formatDate(transaction.createdAt)}
                            </p>
                            {transaction.note && (
                              <p className="text-xs text-slate-500 mt-1">
                                {transaction.note}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn("font-bold text-xl", color)}>
                            {prefix}
                            {formatCurrency(transaction.amount)}
                          </p>
                          <Badge
                            variant={
                              transaction.status === "completed"
                                ? "default"
                                : "secondary"
                            }
                            className={cn(
                              "text-xs font-medium rounded-xl",
                              transaction.status === "completed"
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                            )}
                          >
                            {transaction.status}
                          </Badge>
                        </div>
                      </motion.div>
                    );
                  })}
                  {transactions.length === 0 && (
                    <div className="text-center py-12">
                      <History className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-400 text-lg">
                        No transactions found
                      </p>
                      <p className="text-slate-500 text-sm">
                        Try changing the filter or make some transactions
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          handlePageChange(Math.max(1, currentPage - 1))
                        }
                        className={cn(
                          "text-white hover:bg-white/10 rounded-xl transition-all duration-200",
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        )}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handlePageChange(page)}
                            isActive={currentPage === page}
                            className={cn(
                              "cursor-pointer rounded-xl transition-all duration-200",
                              currentPage === page
                                ? "bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/25"
                                : "text-white hover:bg-white/10"
                            )}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          handlePageChange(
                            Math.min(totalPages, currentPage + 1)
                          )
                        }
                        className={cn(
                          "text-white hover:bg-white/10 rounded-xl transition-all duration-200",
                          currentPage === totalPages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );

  // Render confirmation modal
  const renderConfirmationModal = () => (
    <Dialog open={!!confirmation} onOpenChange={() => setConfirmation(null)}>
      <DialogContent className="bg-slate-900/90 backdrop-blur-2xl border border-white/20 text-white rounded-3xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {confirmation?.title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-slate-300 text-base leading-relaxed">
          {confirmation?.message}
        </p>
        <DialogFooter className="gap-4 mt-6">
          <Button
            variant="outline"
            onClick={confirmation?.onCancel}
            className="bg-white/5 border-white/20 text-white hover:bg-white/10 rounded-2xl backdrop-blur-sm transition-all duration-200"
          >
            Cancel
          </Button>
          <motion.div
            variants={glassButtonVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
          >
            <Button
              onClick={confirmation?.onConfirm}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl shadow-lg shadow-blue-500/25 transition-all duration-200"
            >
              Confirm
            </Button>
          </motion.div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Render toast notifications
  const renderToastNotifications = () => (
    <div className="fixed top-6 right-6 z-50 space-y-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={cn(
              "flex items-center gap-4 p-6 rounded-2xl shadow-2xl max-w-sm backdrop-blur-2xl border",
              toast.type === "success" &&
                "bg-emerald-500/20 border-emerald-500/30",
              toast.type === "error" && "bg-rose-500/20 border-rose-500/30",
              toast.type === "info" && "bg-blue-500/20 border-blue-500/30"
            )}
          >
            {toast.type === "success" && (
              <CheckCircle className="h-6 w-6 text-emerald-400" />
            )}
            {toast.type === "error" && (
              <XCircle className="h-6 w-6 text-rose-400" />
            )}
            {toast.type === "info" && (
              <Wallet className="h-6 w-6 text-blue-400" />
            )}
            <p className="text-sm font-semibold text-white">{toast.message}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeToast(toast.id)}
              className="ml-auto h-auto p-2 text-white hover:bg-white/20 rounded-xl"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {renderHeader()}

      <main className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {currentScreen === "login" && renderLoginScreen()}
          {currentScreen === "register" && renderRegisterScreen()}
          {currentScreen === "dashboard" && renderDashboardScreen()}
          {currentScreen === "send" && renderSendMoneyScreen()}
          {currentScreen === "add" && renderAddMoneyScreen()}
          {currentScreen === "history" && renderTransactionHistoryScreen()}
        </AnimatePresence>
      </main>

      {renderBottomNavigation()}
      {renderConfirmationModal()}
      {renderToastNotifications()}
    </div>
  );
}
