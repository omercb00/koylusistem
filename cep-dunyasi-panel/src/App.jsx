import { useEffect, useState } from "react";
import {
  Home,
  ShoppingCart,
  PackagePlus,
  Wallet,
  Boxes,
  ReceiptText,
  BarChart3,
  Users,
  LogOut,
  Trash2,
  UserPlus,
  Menu,
  X,
  Camera,
} from "lucide-react";

import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";

import { supabase } from "./supabaseClient";

const defaultUsers = [
  {
    id: 1,
    name: "Ömer Can Buğdaycı",
    username: "",
    password: "",
    role: "Yönetici",
  },
];

const defaultProducts = [
  { id: 1, barcode: "869000000001", name: "Normal cam", supplier: "Genel", stock: 20, buyPrice: 50, sellPrice: 150 },
  { id: 2, barcode: "869000000002", name: "Kılıf", supplier: "Genel", stock: 30, buyPrice: 100, sellPrice: 200 },
];

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("cepDunyasiLoggedIn") === "true" || !!localStorage.getItem("cepDunyasiCurrentUser");
  });
  const [activePage, setActivePage] = useState(() => localStorage.getItem("cepDunyasiActivePage") || "dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("cepDunyasiCurrentUser");
      if (!savedUser) return null;
      return JSON.parse(savedUser);
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (currentUser && !isLoggedIn) {
      setIsLoggedIn(true);
    }
  }, [currentUser, isLoggedIn]);

  // Aktif sayfa yetki kontrolü
  useEffect(() => {
    if (!currentUser) return;
    const permissions = {
      "Yönetici": ["dashboard", "sales", "purchases", "cash", "closing", "credits", "debts", "products", "expenses", "users", "reports"],
      "Satış": ["dashboard", "sales", "cash", "credits", "products", "reports"],
      "Kasa": ["dashboard", "sales", "cash", "credits", "expenses", "reports"],
      "Stok": ["dashboard", "purchases", "debts", "products", "reports"],
    };
    const allowed = permissions[currentUser.role] || [];
    if (!allowed.includes(activePage)) {
      setActivePage("dashboard");
      localStorage.setItem("cepDunyasiActivePage", "dashboard");
    }
  }, [currentUser, activePage]);


  const [cloudStatus, setCloudStatus] = useState("Bulut hazır");
  const [toast, setToast] = useState(null);
  const [usdRate, setUsdRate] = useState(0);
  const [usdStatus, setUsdStatus] = useState("Kur bekleniyor");

  const [users, setUsers] = useState(() => JSON.parse(localStorage.getItem("cepDunyasiUsers")) || defaultUsers);
  const [products, setProducts] = useState(() => JSON.parse(localStorage.getItem("cepDunyasiProducts")) || defaultProducts);
  const [sales, setSales] = useState(() => JSON.parse(localStorage.getItem("cepDunyasiSales")) || []);
  const [purchases, setPurchases] = useState(() => JSON.parse(localStorage.getItem("cepDunyasiPurchases")) || []);
  const [debtPayments, setDebtPayments] = useState(() => JSON.parse(localStorage.getItem("cepDunyasiDebtPayments")) || []);
  const [creditPayments, setCreditPayments] = useState(() => JSON.parse(localStorage.getItem("cepDunyasiCreditPayments")) || []);
  const [dailyClosings, setDailyClosings] = useState(() => JSON.parse(localStorage.getItem("cepDunyasiDailyClosings")) || []);
  const [expenses, setExpenses] = useState(() => JSON.parse(localStorage.getItem("cepDunyasiExpenses")) || []);

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [saleForm, setSaleForm] = useState({
    productId: "",
    barcodeSearch: "",
    quantity: 1,
    price: "",
    paymentType: "Nakit",
    customer: "",
    note: "",
    date: todayInput(),
  });

  const [purchaseForm, setPurchaseForm] = useState({
    productId: "",
    barcodeSearch: "",
    supplier: "",
    quantity: 1,
    buyPrice: "",
    currency: "TRY",
    usdRate: "",
    note: "",
    date: todayInput(),
  });

  const [debtForm, setDebtForm] = useState({
    supplier: "",
    amount: "",
    usdRate: "",
    paymentType: "Nakit",
    note: "",
    date: todayInput(),
  });

  const [creditForm, setCreditForm] = useState({
    customer: "",
    amount: "",
    paymentType: "Nakit",
    note: "",
    date: todayInput(),
  });

  const [expenseForm, setExpenseForm] = useState({
    category: "Kira",
    amount: "",
    paymentType: "Nakit",
    note: "",
    date: todayInput(),
  });

  const [newUser, setNewUser] = useState({
    name: "",
    username: "",
    password: "",
    role: "Satış",
  });

  useEffect(() => localStorage.setItem("cepDunyasiUsers", JSON.stringify(users)), [users]);
  useEffect(() => localStorage.setItem("cepDunyasiProducts", JSON.stringify(products)), [products]);
  useEffect(() => localStorage.setItem("cepDunyasiSales", JSON.stringify(sales)), [sales]);
  useEffect(() => localStorage.setItem("cepDunyasiPurchases", JSON.stringify(purchases)), [purchases]);
  useEffect(() => localStorage.setItem("cepDunyasiDebtPayments", JSON.stringify(debtPayments)), [debtPayments]);
  useEffect(() => localStorage.setItem("cepDunyasiCreditPayments", JSON.stringify(creditPayments)), [creditPayments]);
  useEffect(() => localStorage.setItem("cepDunyasiDailyClosings", JSON.stringify(dailyClosings)), [dailyClosings]);
  useEffect(() => localStorage.setItem("cepDunyasiExpenses", JSON.stringify(expenses)), [expenses]);

  useEffect(() => {
    loadUsdRate();
    loadUsersFromCloud();
    loadProductsFromCloud();
    loadSalesFromCloud();
    loadPurchasesFromCloud();
    loadExpensesFromCloud();
    loadDebtPaymentsFromCloud();
    loadCreditPaymentsFromCloud();
    loadDailyClosingsFromCloud();
  }, []);



  const loadUsdRate = async () => {
    try {
      setUsdStatus("Güncel dolar kuru alınıyor...");

      const response = await fetch("https://open.er-api.com/v6/latest/USD");
      const data = await response.json();

      const rate = Number(data?.rates?.TRY || 0);
      if (!rate) throw new Error("USD/TRY kuru alınamadı");

      setUsdRate(rate);
      setUsdStatus(`Güncel USD kuru: ${rate.toFixed(4)} TL`);
      return rate;
    } catch (error) {
      console.log("Dolar kuru alınamadı:", error);
      setUsdStatus("Kur alınamadı, elle kur girebilirsin");
      return 0;
    }
  };

  const loadUsersFromCloud = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const mappedUsers = data.map(mapUserFromDb);
        setUsers(mappedUsers);
        localStorage.setItem("cepDunyasiUsers", JSON.stringify(mappedUsers));
      } else {
        // Bulutta hiç kullanıcı yoksa mevcut yerel kullanıcıları korur.
        setUsers((prev) => prev.length > 0 ? prev : defaultUsers);
      }
    } catch (error) {
      console.log("Bulut kullanıcı yükleme hatası:", error);
    }
  };

  const loadProductsFromCloud = async () => {
    try {
      setCloudStatus("Buluttan ürünler yükleniyor...");

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const mappedProducts = data.map(mapProductFromDb);
        setProducts(mappedProducts);
        localStorage.setItem("cepDunyasiProducts", JSON.stringify(mappedProducts));
      }

      setCloudStatus("Bulut bağlantısı aktif");
    } catch (error) {
      console.log("Bulut ürün yükleme hatası:", error);
      setCloudStatus("Bulut bağlantısı yok, yerel kayıt kullanılıyor");
    }
  };


  const loadSalesFromCloud = async () => {
    try {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedSales = data.map(mapSaleFromDb);
        setSales(mappedSales);
        localStorage.setItem("cepDunyasiSales", JSON.stringify(mappedSales));
      }
    } catch (error) {
      console.log("Bulut satış yükleme hatası:", error);
    }
  };


  const loadPurchasesFromCloud = async () => {
    try {
      const { data, error } = await supabase
        .from("purchases")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedPurchases = data.map(mapPurchaseFromDb);
        setPurchases(mappedPurchases);
        localStorage.setItem("cepDunyasiPurchases", JSON.stringify(mappedPurchases));
      }
    } catch (error) {
      console.log("Bulut alış yükleme hatası:", error);
    }
  };


  const loadExpensesFromCloud = async () => {
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedExpenses = data.map(mapExpenseFromDb);
        setExpenses(mappedExpenses);
        localStorage.setItem("cepDunyasiExpenses", JSON.stringify(mappedExpenses));
      }
    } catch (error) {
      console.log("Bulut gider yükleme hatası:", error);
    }
  };



  const loadDebtPaymentsFromCloud = async () => {
    try {
      const { data, error } = await supabase
        .from("debt_payments")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedDebtPayments = data.map(mapDebtPaymentFromDb);
        setDebtPayments(mappedDebtPayments);
        localStorage.setItem("cepDunyasiDebtPayments", JSON.stringify(mappedDebtPayments));
      }
    } catch (error) {
      console.log("Bulut firma borç ödeme yükleme hatası:", error);
    }
  };

  const loadCreditPaymentsFromCloud = async () => {
    try {
      const { data, error } = await supabase
        .from("credit_payments")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedCreditPayments = data.map(mapCreditPaymentFromDb);
        setCreditPayments(mappedCreditPayments);
        localStorage.setItem("cepDunyasiCreditPayments", JSON.stringify(mappedCreditPayments));
      }
    } catch (error) {
      console.log("Bulut veresiye tahsilat yükleme hatası:", error);
    }
  };


  const loadDailyClosingsFromCloud = async () => {
    try {
      const { data, error } = await supabase
        .from("daily_closings")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedClosings = data.map(mapDailyClosingFromDb);
        setDailyClosings(mappedClosings);
        localStorage.setItem("cepDunyasiDailyClosings", JSON.stringify(mappedClosings));
      }
    } catch (error) {
      console.log("Bulut günlük devir yükleme hatası:", error);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };


  const refreshAllCloudData = async () => {
    try {
      setCloudStatus("Bulut verileri yenileniyor...");
      await Promise.all([
        loadUsdRate(),
        loadUsersFromCloud(),
        loadProductsFromCloud(),
        loadSalesFromCloud(),
        loadPurchasesFromCloud(),
        loadExpensesFromCloud(),
        loadDebtPaymentsFromCloud(),
        loadCreditPaymentsFromCloud(),
        loadDailyClosingsFromCloud(),
      ]);
      setCloudStatus("Bulut verileri güncellendi");
      showToast("Bulut verileri yenilendi");
    } catch (error) {
      console.log("Bulut yenileme hatası:", error);
      setCloudStatus("Bulut yenileme hatası");
      showToast("Bulut verileri yenilenemedi", "error");
    }
  };

  const login = () => {
    const user = users.find((u) => u.username === loginUsername && u.password === loginPassword);
    if (!user) return alert("Kullanıcı adı veya şifre hatalı");
    setCurrentUser(user);
    setIsLoggedIn(true);
    localStorage.setItem("cepDunyasiCurrentUser", JSON.stringify(user));
    localStorage.setItem("cepDunyasiLoggedIn", "true");
  };

  const logout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem("cepDunyasiCurrentUser");
    localStorage.removeItem("cepDunyasiLoggedIn");
    setLoginUsername("");
    setLoginPassword("");
  };

  const changePage = (page) => {
    setActivePage(page);
    localStorage.setItem("cepDunyasiActivePage", page);
    setSidebarOpen(false);
  };

  const addSale = async () => {
    const product = products.find((p) => p.id === Number(saleForm.productId));
    const quantity = Number(saleForm.quantity);
    const price = Number(saleForm.price);

    if (!product) return alert("Ürün seç");
    if (!quantity || quantity <= 0) return alert("Adet doğru değil");
    if (!price || price <= 0) return alert("Satış fiyatı gir");
    if (quantity > product.stock) return alert("Stok yetersiz");

    const newStock = Number(product.stock) - quantity;
    const total = price * quantity;
    const activeUsdRateForSale = Number(usdRate || 0);
    const productCostTl = Number(product.buyPrice || 0) * activeUsdRateForSale;
    const profit = (price - productCostTl) * quantity;

    try {
      setCloudStatus("Satış buluta kaydediliyor...");

      const { data, error } = await supabase
        .from("sales")
        .insert({
          product_id: product.id,
          product_name: product.name,
          barcode: product.barcode || "",
          supplier: product.supplier || "Belirtilmedi",
          customer: saleForm.customer || "Belirtilmedi",
          payment_type: saleForm.paymentType,
          quantity,
          unit_price: price,
          total,
          profit,
          note: saleForm.note || "",
          seller: currentUser?.name || "",
        })
        .select()
        .single();

      if (error) throw error;

      const { error: stockError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", product.id);

      if (stockError) throw stockError;

      const cloudSale = mapSaleFromDb(data);

      setSales([cloudSale, ...sales]);
      setProducts(products.map((p) => (p.id === product.id ? { ...p, stock: newStock } : p)));

      setSaleForm({
        productId: "",
        barcodeSearch: "",
        quantity: 1,
        price: "",
        paymentType: "Nakit",
        customer: "",
        note: "",
        date: todayInput(),
      });

      setCloudStatus("Satış buluta kaydedildi");
      showToast("Satış buluta kaydedildi");
    } catch (error) {
      console.log("Satış ekleme hatası:", error);
      setCloudStatus("Satış buluta eklenemedi");
      showToast("Satış buluta eklenemedi", "error");
    }
  };

  const deleteSale = async (id) => {
    const sale = sales.find((s) => s.id === id);
    if (!sale) return;
    if (!confirm("Satış silinsin mi? Stok geri eklenecek.")) return;

    const product = products.find((p) => p.id === sale.productId);
    const newStock = product ? Number(product.stock) + Number(sale.quantity) : null;

    try {
      setCloudStatus("Satış buluttan siliniyor...");

      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;

      if (product) {
        const { error: stockError } = await supabase
          .from("products")
          .update({ stock: newStock })
          .eq("id", product.id);

        if (stockError) throw stockError;

        setProducts(products.map((p) => (p.id === product.id ? { ...p, stock: newStock } : p)));
      }

      setSales(sales.filter((s) => s.id !== id));
      setCloudStatus("Satış buluttan silindi");
    } catch (error) {
      console.log("Satış silme hatası:", error);
      setCloudStatus("Satış silinemedi");
      showToast("Satış buluttan silinemedi", "error");
    }
  };

  const addPurchase = async () => {
    const product = products.find((p) => p.id === Number(purchaseForm.productId));
    const quantity = Number(purchaseForm.quantity);
    const buyPriceUsd = Number(purchaseForm.buyPrice);
    const activeUsdRate = Number(purchaseForm.usdRate || usdRate || 0);

    if (!product) return alert("Ürün seç");
    if (!purchaseForm.supplier) return alert("Mal alım firması gir");
    if (!quantity || quantity <= 0) return alert("Adet doğru değil");
    if (!buyPriceUsd || buyPriceUsd <= 0) return alert("Dolar alış fiyatı gir");
    if (!activeUsdRate || activeUsdRate <= 0) return alert("Dolar kuru alınamadı. Kur alanına elle değer gir.");

    const newStock = Number(product.stock) + quantity;
    const totalUsd = buyPriceUsd * quantity;
    const totalTl = totalUsd * activeUsdRate;

    const currencyNote = `USD alış: ${buyPriceUsd} $, Toplam: ${totalUsd.toFixed(2)} $, Kur: ${activeUsdRate.toFixed(4)} TL, TL karşılığı: ${totalTl.toFixed(2)} TL. ${purchaseForm.note || ""}`;

    try {
      setCloudStatus("Alış buluta kaydediliyor...");

      const { data, error } = await supabase
        .from("purchases")
        .insert({
          product_id: product.id,
          product_name: product.name,
          barcode: product.barcode || "",
          supplier: purchaseForm.supplier,
          quantity,
          buy_price: buyPriceUsd,
          total: totalUsd,
          note: currencyNote,
          buyer: currentUser?.name || "",
        })
        .select()
        .single();

      if (error) throw error;

      const { error: stockError } = await supabase
        .from("products")
        .update({
          stock: newStock,
          buy_price: buyPriceUsd,
        })
        .eq("id", product.id);

      if (stockError) throw stockError;

      const cloudPurchase = mapPurchaseFromDb(data);

      setPurchases([cloudPurchase, ...purchases]);
      setProducts(
        products.map((p) =>
          p.id === product.id ? { ...p, stock: newStock, buyPrice: buyPriceUsd } : p
        )
      );

      setPurchaseForm({
        productId: "",
        barcodeSearch: "",
        supplier: "",
        quantity: 1,
        buyPrice: "",
        currency: "USD",
        usdRate: activeUsdRate || "",
        note: "",
        date: todayInput(),
      });

      setCloudStatus("Alış buluta kaydedildi");
      showToast("Alış buluta kaydedildi");
    } catch (error) {
      console.log("Alış ekleme hatası:", error);
      setCloudStatus("Alış buluta eklenemedi");
      showToast("Alış buluta eklenemedi", "error");
    }
  };

  const addDebtPayment = async () => {
    const amountUsd = Number(debtForm.amount);
    const activeUsdRate = Number(debtForm.usdRate || usdRate || 0);

    if (!debtForm.supplier) return alert("Firma seç");
    if (!amountUsd || amountUsd <= 0) return alert("Ödeme tutarı dolar olarak gir");
    if (!activeUsdRate || activeUsdRate <= 0) return alert("Dolar kuru alınamadı. Kur alanına elle değer gir.");

    const tlEquivalent = amountUsd * activeUsdRate;
    const paymentNote = `USD ödeme: ${amountUsd.toFixed(2)} $, Kur: ${activeUsdRate.toFixed(4)} TL, TL karşılığı: ${tlEquivalent.toFixed(2)} TL. ${debtForm.note || ""}`;

    try {
      setCloudStatus("Firma borç ödemesi buluta kaydediliyor...");

      const { data, error } = await supabase
        .from("debt_payments")
        .insert({
          supplier: debtForm.supplier,
          amount: amountUsd,
          payment_type: debtForm.paymentType,
          note: paymentNote,
          user_name: currentUser?.name || "",
        })
        .select()
        .single();

      if (error) throw error;

      const cloudDebtPayment = mapDebtPaymentFromDb(data);
      setDebtPayments([cloudDebtPayment, ...debtPayments]);

      setDebtForm({
        supplier: "",
        amount: "",
        usdRate: activeUsdRate || "",
        paymentType: "Nakit",
        note: "",
        date: todayInput(),
      });

      setCloudStatus("Firma borç ödemesi buluta kaydedildi");
      showToast("Firma borç ödemesi kaydedildi");
    } catch (error) {
      console.log("Firma borç ödeme hatası:", error);
      setCloudStatus("Firma borç ödemesi kaydedilemedi");
      showToast("Firma borç ödemesi kaydedilemedi", "error");
    }
  };

  const addCreditPayment = async () => {
    const amount = Number(creditForm.amount);

    if (!creditForm.customer) return alert("Müşteri seç");
    if (!amount || amount <= 0) return alert("Tahsilat tutarı gir");

    try {
      setCloudStatus("Veresiye tahsilat buluta kaydediliyor...");

      const { data, error } = await supabase
        .from("credit_payments")
        .insert({
          customer: creditForm.customer,
          amount,
          payment_type: creditForm.paymentType,
          note: creditForm.note || "",
          user_name: currentUser?.name || "",
        })
        .select()
        .single();

      if (error) throw error;

      const cloudCreditPayment = mapCreditPaymentFromDb(data);
      setCreditPayments([cloudCreditPayment, ...creditPayments]);

      setCreditForm({
        customer: "",
        amount: "",
        paymentType: "Nakit",
        note: "",
        date: todayInput(),
      });

      setCloudStatus("Veresiye tahsilat buluta kaydedildi");
      showToast("Veresiye tahsilat kaydedildi");
    } catch (error) {
      console.log("Veresiye tahsilat hatası:", error);
      setCloudStatus("Veresiye tahsilat kaydedilemedi");
      showToast("Veresiye tahsilat kaydedilemedi", "error");
    }
  };

  const addDailyClosing = async (closingNote = "") => {
    const closingDate = todayInput();
    const alreadyClosed = dailyClosings.some((c) => c.closingDate === closingDate);

    if (alreadyClosed && !confirm("Bugün için daha önce gün sonu yapılmış. Yine de yeni kayıt oluşturulsun mu?")) {
      return;
    }

    const todaySalesTotal = sales
      .filter((s) => isoToInput(s.date) === closingDate)
      .reduce((t, s) => t + s.total, 0);

    const todayPurchaseTotal = purchases
      .filter((p) => isoToInput(p.date) === closingDate)
      .reduce((t, p) => t + p.total, 0);

    const todayExpenseTotal = expenses
      .filter((e) => isoToInput(e.date) === closingDate)
      .reduce((t, e) => t + e.amount, 0);

    try {
      setCloudStatus("Günlük devir buluta kaydediliyor...");

      const { data, error } = await supabase
        .from("daily_closings")
        .insert({
          closing_date: closingDate,
          cash_balance: cashBalance,
          card_balance: cardBalance,
          remaining_credit: remainingCredit,
          total_company_debt: totalCompanyDebt,
          today_sales_total: todaySalesTotal,
          today_purchase_total: todayPurchaseTotal,
          today_expense_total: todayExpenseTotal,
          note: closingNote || "",
          user_name: currentUser?.name || "",
        })
        .select()
        .single();

      if (error) throw error;

      const cloudClosing = mapDailyClosingFromDb(data);
      setDailyClosings([cloudClosing, ...dailyClosings]);

      setCloudStatus("Günlük devir buluta kaydedildi");
      showToast("Gün sonu devri kaydedildi");
    } catch (error) {
      console.log("Günlük devir kayıt hatası:", error);
      setCloudStatus("Günlük devir kaydedilemedi");
      showToast("Günlük devir kaydedilemedi", "error");
    }
  };

  const addExpense = async () => {
    const amount = Number(expenseForm.amount);

    if (!expenseForm.category) return alert("Gider kategorisi seç");
    if (!amount || amount <= 0) return alert("Gider tutarı gir");

    try {
      setCloudStatus("Gider buluta kaydediliyor...");

      const { data, error } = await supabase
        .from("expenses")
        .insert({
          category: expenseForm.category,
          payment_type: expenseForm.paymentType,
          amount,
          note: expenseForm.note || "",
          user_name: currentUser?.name || "",
        })
        .select()
        .single();

      if (error) throw error;

      const cloudExpense = mapExpenseFromDb(data);
      setExpenses([cloudExpense, ...expenses]);

      setExpenseForm({
        category: "Kira",
        amount: "",
        paymentType: "Nakit",
        note: "",
        date: todayInput(),
      });

      setCloudStatus("Gider buluta kaydedildi");
      showToast("Gider buluta kaydedildi");
    } catch (error) {
      console.log("Gider ekleme hatası:", error);
      setCloudStatus("Gider buluta eklenemedi");
      showToast("Gider buluta eklenemedi", "error");
    }
  };

  const deleteExpense = async (id) => {
    if (!confirm("Bu gider silinsin mi?")) return;

    const oldExpenses = expenses;
    setExpenses(expenses.filter((e) => e.id !== id));

    try {
      setCloudStatus("Gider buluttan siliniyor...");

      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setCloudStatus("Gider buluttan silindi");
    } catch (error) {
      console.log("Gider silme hatası:", error);
      setExpenses(oldExpenses);
      setCloudStatus("Gider silinemedi");
      showToast("Gider buluttan silinemedi", "error");
    }
  };

  const addUser = async () => {
    if (!isAdmin) return alert("Yetkin yok");
    if (!newUser.name || !newUser.username || !newUser.password) {
      alert("Ad, kullanıcı adı ve şifre zorunlu");
      return;
    }

    if (users.some((u) => u.username === newUser.username)) {
      alert("Bu kullanıcı adı zaten var");
      return;
    }

    try {
      setCloudStatus("Kullanıcı buluta kaydediliyor...");

      const { data, error } = await supabase
        .from("users")
        .insert({
          name: newUser.name,
          username: newUser.username,
          password: newUser.password,
          role: newUser.role,
        })
        .select()
        .single();

      if (error) throw error;

      const cloudUser = mapUserFromDb(data);
      setUsers([...users, cloudUser]);

      setNewUser({
        name: "",
        username: "",
        password: "",
        role: "Satış",
      });

      setCloudStatus("Kullanıcı buluta kaydedildi");
      showToast("Kullanıcı kaydedildi");
    } catch (error) {
      console.log("Kullanıcı ekleme hatası:", error);
      setCloudStatus("Kullanıcı kaydedilemedi");
      showToast("Kullanıcı kaydedilemedi", "error");
    }
  };

  const deleteUser = async (id) => {
    if (currentUser?.id === id) return alert("Kendi kullanıcını silemezsin");
    if (!confirm("Bu kullanıcı silinsin mi?")) return;

    const oldUsers = users;
    setUsers(users.filter((u) => u.id !== id));

    try {
      setCloudStatus("Kullanıcı buluttan siliniyor...");

      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setCloudStatus("Kullanıcı buluttan silindi");
      showToast("Kullanıcı silindi");
    } catch (error) {
      console.log("Kullanıcı silme hatası:", error);
      setUsers(oldUsers);
      setCloudStatus("Kullanıcı silinemedi");
      showToast("Kullanıcı silinemedi", "error");
    }
  };

  const selectProductByBarcode = (barcode, target) => {
    const cleaned = String(barcode || "").trim();
    const found = products.find((p) => String(p.barcode || "").trim() === cleaned);

    if (!found) {
      if (cleaned.length >= 6) {
        alert("Bu barkoda ait ürün bulunamadı");
      }
      return;
    }

    if (target === "sale") {
      setSaleForm({
        ...saleForm,
        barcodeSearch: cleaned,
        productId: String(found.id),
        price: found.sellPrice ? String(found.sellPrice) : saleForm.price,
      });
    }

    if (target === "purchase") {
      setPurchaseForm({
        ...purchaseForm,
        barcodeSearch: cleaned,
        productId: String(found.id),
        supplier: found.supplier || purchaseForm.supplier,
        buyPrice: found.buyPrice ? String(found.buyPrice) : purchaseForm.buyPrice,
      });
    }
  };

  const cashSales = sales.filter((s) => s.paymentType === "Nakit").reduce((t, s) => t + s.total, 0);
  const cardSales = sales.filter((s) => s.paymentType === "Kart").reduce((t, s) => t + s.total, 0);
  const creditSales = sales.filter((s) => s.paymentType === "Veresiye").reduce((t, s) => t + s.total, 0);

  const activeUsdRateForDebt = Number(usdRate || 0);
  const cashDebtPaid = debtPayments
    .filter((p) => p.paymentType === "Nakit")
    .reduce((t, p) => t + p.amount * activeUsdRateForDebt, 0);
  const cardDebtPaid = debtPayments
    .filter((p) => p.paymentType === "Kart")
    .reduce((t, p) => t + p.amount * activeUsdRateForDebt, 0);

  const cashCreditPaid = creditPayments.filter((p) => p.paymentType === "Nakit").reduce((t, p) => t + p.amount, 0);
  const cardCreditPaid = creditPayments.filter((p) => p.paymentType === "Kart").reduce((t, p) => t + p.amount, 0);

  const cashExpenses = expenses.filter((e) => e.paymentType === "Nakit").reduce((t, e) => t + e.amount, 0);
  const cardExpenses = expenses.filter((e) => e.paymentType === "Kart").reduce((t, e) => t + e.amount, 0);

  const cashBalance = cashSales + cashCreditPaid - cashDebtPaid - cashExpenses;
  const cardBalance = cardSales + cardCreditPaid - cardDebtPaid - cardExpenses;

  const totalPurchases = purchases.reduce((t, p) => t + p.total, 0);
  const totalDebtPaid = debtPayments.reduce((t, p) => t + p.amount, 0);
  const totalCompanyDebt = totalPurchases - totalDebtPaid;

  const totalCreditPaid = creditPayments.reduce((t, p) => t + p.amount, 0);
  const remainingCredit = creditSales - totalCreditPaid;

  const today = todayInput();
  const month = today.slice(0, 7);
  const monthSales = sales.filter((s) => isoToInput(s.date).slice(0, 7) === month);

  const todayTotal = sales.filter((s) => isoToInput(s.date) === today).reduce((t, s) => t + s.total, 0);
  const monthTotal = monthSales.reduce((t, s) => t + s.total, 0);
  const monthExpenses = expenses.filter((e) => isoToInput(e.date).slice(0, 7) === month).reduce((t, e) => t + e.amount, 0);
  const netProfit = monthSales.reduce((t, s) => t + s.profit, 0) - monthExpenses;

  const suppliers = [
    ...new Set([
      ...purchases.map((p) => p.supplier),
      ...products.map((p) => p.supplier).filter(Boolean),
    ]),
  ];

  const supplierDebts = suppliers
    .map((supplier) => {
      const debt = purchases.filter((p) => p.supplier === supplier).reduce((t, p) => t + p.total, 0);
      const paid = debtPayments.filter((p) => p.supplier === supplier).reduce((t, p) => t + p.amount, 0);
      return {
        supplier,
        debt,
        paid,
        remaining: debt - paid,
        purchaseCount: purchases.filter((p) => p.supplier === supplier).length,
      };
    })
    .filter((x) => x.debt > 0 || x.paid > 0);

  const customers = [
    ...new Set([
      ...sales.filter((s) => s.paymentType === "Veresiye").map((s) => s.customer).filter(Boolean),
      ...creditPayments.map((p) => p.customer).filter(Boolean),
    ]),
  ];

  const customerCredits = customers
    .map((customer) => {
      const debt = sales
        .filter((s) => s.paymentType === "Veresiye" && s.customer === customer)
        .reduce((t, s) => t + s.total, 0);
      const paid = creditPayments
        .filter((p) => p.customer === customer)
        .reduce((t, p) => t + p.amount, 0);
      return {
        customer,
        debt,
        paid,
        remaining: debt - paid,
        saleCount: sales.filter((s) => s.paymentType === "Veresiye" && s.customer === customer).length,
      };
    })
    .filter((x) => x.debt > 0 || x.paid > 0);

  const isAdmin = currentUser?.role === "Yönetici";

  const rolePermissions = {
    "Yönetici": ["dashboard", "sales", "purchases", "cash", "closing", "credits", "debts", "products", "expenses", "users", "reports"],
    "Satış": ["dashboard", "sales", "cash", "credits", "products", "reports"],
    "Kasa": ["dashboard", "sales", "cash", "credits", "expenses", "reports"],
    "Stok": ["dashboard", "purchases", "debts", "products", "reports"],
  };

  const canOpenPage = (page) => {
    if (!currentUser) return false;
    return rolePermissions[currentUser.role]?.includes(page) || false;
  };

  const openSafePage = (page) => {
    if (!canOpenPage(page)) {
      showToast("Bu sayfa için yetkin yok", "error");
      return;
    }
    changePage(page);
  };

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white">CD</div>
            <h1 className="text-3xl font-bold text-slate-900">CEP DÜNYASI</h1>
            <p className="mt-2 text-sm text-slate-500">Kurumsal Yönetim Paneli</p>
            <p className="mt-1 text-sm font-semibold text-blue-600">Yönetim: Ömer Can Buğdaycı</p>
          </div>

          <input className="w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Kullanıcı adınızı girin" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} />
          <input type="password" className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Şifrenizi girin" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} />

          <button onClick={login} className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white">Giriş Yap</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {toast && (
        <div className={`fixed right-5 top-5 z-[9999] rounded-2xl px-5 py-4 text-sm font-bold text-white shadow-2xl transition-all ${
          toast.type === "error" ? "bg-red-600" : "bg-green-600"
        }`}>
          {toast.message}
        </div>
      )}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 h-full w-72 transform bg-slate-950 text-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between border-b border-slate-800 p-6">
          <div>
            <h1 className="text-2xl font-bold">CEP DÜNYASI</h1>
            <p className="mt-1 text-sm text-slate-400">Yönetim Paneli</p>
            <p className="mt-1 text-xs text-blue-300">{currentUser?.name} • {currentUser?.role}</p>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg bg-slate-900 p-2 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="h-[calc(100vh-105px)] space-y-2 overflow-y-auto p-4">
          <MenuItem icon={<Home size={20} />} text="Ana Panel" active={activePage === "dashboard"} onClick={() => openSafePage("dashboard")} />
          <MenuItem icon={<ShoppingCart size={20} />} text="Satış İşlemleri" active={activePage === "sales"} onClick={() => openSafePage("sales")} />
          <MenuItem icon={<PackagePlus size={20} />} text="Alış İşlemleri" active={activePage === "purchases"} onClick={() => openSafePage("purchases")} />
          <MenuItem icon={<Wallet size={20} />} text="Kasa Yönetimi" active={activePage === "cash"} onClick={() => openSafePage("cash")} />
          <MenuItem icon={<BarChart3 size={20} />} text="Günlük Devir" active={activePage === "closing"} onClick={() => openSafePage("closing")} />
          <MenuItem icon={<ReceiptText size={20} />} text="Veresiye / Alacak" active={activePage === "credits"} onClick={() => openSafePage("credits")} />
          <MenuItem icon={<ReceiptText size={20} />} text="Cari / Firma Borçları" active={activePage === "debts"} onClick={() => openSafePage("debts")} />
          <MenuItem icon={<Boxes size={20} />} text="Stok / Ürünler" active={activePage === "products"} onClick={() => openSafePage("products")} />
          <MenuItem icon={<ReceiptText size={20} />} text="Giderler" active={activePage === "expenses"} onClick={() => openSafePage("expenses")} />
          <MenuItem icon={<BarChart3 size={20} />} text="Raporlar & Grafikler" active={activePage === "reports"} onClick={() => openSafePage("reports")} />
          {isAdmin && <MenuItem icon={<Users size={20} />} text="Kullanıcı Yönetimi" active={activePage === "users"} onClick={() => openSafePage("users")} />}
        </nav>
      </aside>

      <main className="lg:ml-72">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-white px-4 py-4 shadow-sm sm:px-6 lg:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl bg-slate-950 p-3 text-white lg:hidden"
            >
              <Menu size={20} />
            </button>

            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold sm:text-2xl">{getPageTitle(activePage)}</h2>
              <p className="truncate text-xs text-slate-500 sm:text-sm">Giriş yapan: {currentUser?.name} / Yetki: {currentUser?.role}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={refreshAllCloudData}
              className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700 sm:px-4"
            >
              <span className="hidden sm:inline">Bulutu Yenile</span>
              <span className="sm:hidden">Yenile</span>
            </button>

            <button onClick={logout} className="flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm text-white sm:px-4">
              <LogOut size={18} />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </header>

        <section className="p-4 sm:p-6">
          {activePage === "dashboard" && (
            <Dashboard
              todayTotal={todayTotal}
              monthTotal={monthTotal}
              netProfit={netProfit}
              cashBalance={cashBalance}
              cardBalance={cardBalance}
              remainingCredit={remainingCredit}
              totalCompanyDebt={totalCompanyDebt}
              usdRate={usdRate}
              sales={sales}
              purchases={purchases}
              expenses={expenses}
              debtPayments={debtPayments}
              creditPayments={creditPayments}
            />
          )}

          {activePage === "sales" && canOpenPage("sales") && <SalesPage products={products} saleForm={saleForm} setSaleForm={setSaleForm} addSale={addSale} sales={sales} deleteSale={deleteSale} selectProductByBarcode={selectProductByBarcode} />}
          {activePage === "purchases" && canOpenPage("purchases") && <PurchasesPage products={products} purchaseForm={purchaseForm} setPurchaseForm={setPurchaseForm} addPurchase={addPurchase} purchases={purchases} selectProductByBarcode={selectProductByBarcode} usdRate={usdRate} usdStatus={usdStatus} loadUsdRate={loadUsdRate} />}
          {activePage === "cash" && canOpenPage("cash") && <CashPage cashBalance={cashBalance} cardBalance={cardBalance} remainingCredit={remainingCredit} totalCompanyDebt={totalCompanyDebt} sales={sales} debtPayments={debtPayments} creditPayments={creditPayments} expenses={expenses} />}
          {activePage === "closing" && canOpenPage("closing") && <DailyClosingPage cashBalance={cashBalance} cardBalance={cardBalance} remainingCredit={remainingCredit} totalCompanyDebt={totalCompanyDebt} dailyClosings={dailyClosings} addDailyClosing={addDailyClosing} />}
          {activePage === "credits" && canOpenPage("credits") && <CreditsPage customerCredits={customerCredits} customers={customers} creditForm={creditForm} setCreditForm={setCreditForm} addCreditPayment={addCreditPayment} creditPayments={creditPayments} />}
          {activePage === "debts" && canOpenPage("debts") && <DebtsPage supplierDebts={supplierDebts} suppliers={suppliers} debtForm={debtForm} setDebtForm={setDebtForm} addDebtPayment={addDebtPayment} debtPayments={debtPayments} usdRate={usdRate} usdStatus={usdStatus} loadUsdRate={loadUsdRate} />}
          {activePage === "products" && canOpenPage("products") && <ProductsPage products={products} setProducts={setProducts} cloudStatus={cloudStatus} setCloudStatus={setCloudStatus} usdRate={usdRate} usdStatus={usdStatus} loadUsdRate={loadUsdRate} />}
          {activePage === "expenses" && canOpenPage("expenses") && <ExpensesPage expenseForm={expenseForm} setExpenseForm={setExpenseForm} addExpense={addExpense} deleteExpense={deleteExpense} expenses={expenses} />}
          {activePage === "users" && isAdmin && canOpenPage("users") && <UsersPage users={users} newUser={newUser} setNewUser={setNewUser} addUser={addUser} deleteUser={deleteUser} />}
          {activePage === "reports" && canOpenPage("reports") && <ReportsPage sales={sales} purchases={purchases} debtPayments={debtPayments} creditPayments={creditPayments} expenses={expenses} />}
        </section>
      </main>
    </div>
  );
}

function Dashboard({
  todayTotal,
  monthTotal,
  netProfit,
  cashBalance,
  cardBalance,
  remainingCredit,
  totalCompanyDebt,
  usdRate,
  sales,
  purchases,
  expenses,
  debtPayments,
  creditPayments,
}) {
  const todayKey = todayInput();
  const monthKey = todayKey.slice(0, 7);
  const activeUsdRate = Number(usdRate || 0);

  const todaySales = sales.filter((s) => isoToInput(s.date) === todayKey);
  const todayPurchases = purchases.filter((p) => isoToInput(p.date) === todayKey);
  const todayExpenses = expenses.filter((e) => isoToInput(e.date) === todayKey);
  const todayDebtPayments = debtPayments.filter((p) => isoToInput(p.date) === todayKey);
  const todayCreditPayments = creditPayments.filter((p) => isoToInput(p.date) === todayKey);

  const monthSales = sales.filter((s) => isoToInput(s.date).slice(0, 7) === monthKey);
  const monthPurchases = purchases.filter((p) => isoToInput(p.date).slice(0, 7) === monthKey);
  const monthExpenses = expenses.filter((e) => isoToInput(e.date).slice(0, 7) === monthKey);

  const todaySalesTotal = todaySales.reduce((t, s) => t + Number(s.total || 0), 0);
  const todayProfitTotal = todaySales.reduce((t, s) => t + Number(s.profit || 0), 0);
  const todayExpenseTotal = todayExpenses.reduce((t, e) => t + Number(e.amount || 0), 0);
  const todayPurchaseUsd = todayPurchases.reduce((t, p) => t + Number(p.total || 0), 0);
  const todayDebtPaidUsd = todayDebtPayments.reduce((t, p) => t + Number(p.amount || 0), 0);
  const todayCreditPaid = todayCreditPayments.reduce((t, p) => t + Number(p.amount || 0), 0);

  const monthSalesTotal = monthSales.reduce((t, s) => t + Number(s.total || 0), 0);
  const monthProfitTotal = monthSales.reduce((t, s) => t + Number(s.profit || 0), 0);
  const monthExpenseTotal = monthExpenses.reduce((t, e) => t + Number(e.amount || 0), 0);
  const monthPurchaseUsd = monthPurchases.reduce((t, p) => t + Number(p.total || 0), 0);

  const topProducts = Object.values(
    sales.reduce((acc, sale) => {
      const key = sale.productName || "Bilinmeyen Ürün";
      if (!acc[key]) {
        acc[key] = { name: key, quantity: 0, total: 0 };
      }
      acc[key].quantity += Number(sale.quantity || 0);
      acc[key].total += Number(sale.total || 0);
      return acc;
    }, {})
  )
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const chartData = getLastSixMonths().map((m) => {
    const salesTotal = sales
      .filter((s) => isoToInput(s.date).slice(0, 7) === m.key)
      .reduce((t, s) => t + Number(s.total || 0), 0);

    const expenseTotal = expenses
      .filter((e) => isoToInput(e.date).slice(0, 7) === m.key)
      .reduce((t, e) => t + Number(e.amount || 0), 0);

    const profitTotal = sales
      .filter((s) => isoToInput(s.date).slice(0, 7) === m.key)
      .reduce((t, s) => t + Number(s.profit || 0), 0);

    return {
      name: m.label,
      Satış: salesTotal,
      Kâr: profitTotal,
      Gider: expenseTotal,
    };
  });

  const lastTransactions = [
    ...sales.map((s) => ({
      id: `sale-${s.id}`,
      date: s.date,
      title: `Satış - ${s.productName}`,
      type: s.paymentType,
      amount: money(s.total),
      positive: true,
    })),
    ...expenses.map((e) => ({
      id: `expense-${e.id}`,
      date: e.date,
      title: `Gider - ${e.category}`,
      type: e.paymentType,
      amount: money(e.amount),
      positive: false,
    })),
    ...purchases.map((p) => ({
      id: `purchase-${p.id}`,
      date: p.date,
      title: `Alış - ${p.productName}`,
      type: p.supplier,
      amount: moneyUSD(p.total),
      positive: false,
    })),
    ...creditPayments.map((p) => ({
      id: `credit-${p.id}`,
      date: p.date,
      title: `Veresiye Tahsilat - ${p.customer}`,
      type: p.paymentType,
      amount: money(p.amount),
      positive: true,
    })),
    ...debtPayments.map((p) => ({
      id: `debt-${p.id}`,
      date: p.date,
      title: `Firma Borç Ödeme - ${p.supplier}`,
      type: p.paymentType,
      amount: moneyUSD(p.amount),
      positive: false,
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-300">SAR ELEKTRONİK</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Cep Dünyası Yönetim Paneli</h2>
            <p className="mt-2 text-sm text-slate-300">Satış, alış, kasa, cari ve rapor özetleri tek ekranda.</p>
          </div>

          <div className="rounded-2xl bg-white/10 p-4 text-sm">
            <p className="text-slate-300">Bugün</p>
            <p className="mt-1 text-xl font-black">{new Date().toLocaleDateString("tr-TR")}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard title="Bugünkü Satış" value={money(todaySalesTotal)} desc={`${todaySales.length} satış kaydı`} color="from-blue-700 to-blue-500" />
        <DashboardCard title="Bugünkü Kâr" value={money(todayProfitTotal)} desc={`Gider: ${money(todayExpenseTotal)}`} color="from-green-700 to-green-500" />
        <DashboardCard title="Nakit Kasa" value={money(cashBalance)} desc="Anlık nakit durumu" color="from-slate-900 to-slate-700" />
        <DashboardCard title="Kart Kasa" value={money(cardBalance)} desc="Kart tahsilat durumu" color="from-purple-700 to-purple-500" />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Aylık Satış" value={money(monthSalesTotal)} desc="Bu ay toplam satış" />
        <StatCard title="Aylık Kâr" value={money(monthProfitTotal - monthExpenseTotal)} desc={`Brüt kâr: ${money(monthProfitTotal)}`} />
        <StatCard title="Alış Toplamı" value={moneyUSD(monthPurchaseUsd)} desc="Bu ay dolar alış" />
        <StatCard title="Firma Borç" value={moneyUSD(totalCompanyDebt)} desc={`Güncel TL: ${money(totalCompanyDebt * activeUsdRate)}`} />
      </div>

      <div className="grid gap-6 2xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold">6 Aylık Performans</h3>
              <p className="mt-1 text-sm text-slate-500">Satış, kâr ve gider karşılaştırması</p>
            </div>
          </div>

          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => money(value)} />
                <Legend />
                <Bar dataKey="Satış" />
                <Bar dataKey="Kâr" />
                <Bar dataKey="Gider" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold">En Çok Satan Ürünler</h3>
          <p className="mt-1 text-sm text-slate-500">Adet bazlı ilk 5 ürün</p>

          <div className="mt-6 space-y-4">
            {topProducts.map((p, index) => (
              <div key={p.name} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 font-black text-white">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{p.name}</p>
                    <p className="text-sm text-slate-500">{money(p.total)} satış</p>
                  </div>
                </div>

                <div className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-black text-blue-700">
                  {p.quantity} adet
                </div>
              </div>
            ))}

            {topProducts.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-400">
                Henüz satış yok.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold">Bugünkü Alış / Ödeme</h3>
          <div className="mt-5 space-y-4">
            <MiniStat label="Alış" value={moneyUSD(todayPurchaseUsd)} />
            <MiniStat label="Firma Ödeme" value={moneyUSD(todayDebtPaidUsd)} />
            <MiniStat label="Veresiye Tahsilat" value={money(todayCreditPaid)} />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm xl:col-span-2">
          <h3 className="text-xl font-bold">Son İşlemler</h3>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead>
                <tr className="border-b text-sm text-slate-500">
                  <th className="py-3">Tarih</th>
                  <th>İşlem</th>
                  <th>Tür</th>
                  <th>Tutar</th>
                </tr>
              </thead>
              <tbody>
                {lastTransactions.map((t) => (
                  <tr key={t.id} className="border-b">
                    <td className="py-4">{formatDate(t.date)}</td>
                    <td className="font-medium">{t.title}</td>
                    <td>{t.type}</td>
                    <td className={`font-bold ${t.positive ? "text-green-600" : "text-red-600"}`}>
                      {t.positive ? "+" : "-"} {t.amount}
                    </td>
                  </tr>
                ))}

                {lastTransactions.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-5 text-slate-400">Henüz işlem yok.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <span className="text-lg font-black">{value}</span>
    </div>
  );
}


function DailyClosingPage({ cashBalance, cardBalance, remainingCredit, totalCompanyDebt, dailyClosings, addDailyClosing }) {
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState({ start: "", end: "" });
  const filteredClosings = dailyClosings.filter((c) => {
    if (filter.start && c.closingDate < filter.start) return false;
    if (filter.end && c.closingDate > filter.end) return false;
    return true;
  });

  const saveClosing = () => {
    addDailyClosing(note);
    setNote("");
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Bugünkü Nakit Devir" value={money(cashBalance)} desc="Gün sonu nakit bakiyesi" />
        <StatCard title="Bugünkü Kart Devir" value={money(cardBalance)} desc="Gün sonu kart bakiyesi" />
        <StatCard title="Veresiye Devri" value={money(remainingCredit)} desc="Kalan müşteri alacağı" />
        <StatCard title="Firma Borç Devri" value={money(totalCompanyDebt)} desc="Kalan firma borcu" />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Gün Sonu Kapat / Devir Al</h3>
        <p className="mt-2 text-sm text-slate-500">
          Bu işlem bugünkü kasa, kart, veresiye ve firma borç durumunu kayıt altına alır.
        </p>

        <div className="mt-5">
          <InputBox
            label="Gün sonu notu"
            placeholder="Örn: Kasa sayıldı, pos mutabık, eksik yok"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button
          onClick={saveClosing}
          className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
        >
          Gün Sonu Devir Kaydet
        </button>
      </div>

      <DateFilter filter={filter} setFilter={setFilter} />

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Devir Listesi</h3>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead>
              <tr className="border-b text-sm text-slate-500">
                <th className="py-3">Devir Tarihi</th>
                <th>Kayıt Saati</th>
                <th>Nakit</th>
                <th>Kart</th>
                <th>Veresiye</th>
                <th>Firma Borcu</th>
                <th>Günlük Satış</th>
                <th>Günlük Alış</th>
                <th>Günlük Gider</th>
                <th>Not</th>
                <th>Kullanıcı</th>
              </tr>
            </thead>

            <tbody>
              {filteredClosings.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="py-4">{formatDate(toIsoDate(c.closingDate))}</td>
                  <td>{new Date(c.createdAt).toLocaleTimeString("tr-TR")}</td>
                  <td>{money(c.cashBalance)}</td>
                  <td>{money(c.cardBalance)}</td>
                  <td className="text-red-600">{money(c.remainingCredit)}</td>
                  <td className="text-red-600">{money(c.totalCompanyDebt)}</td>
                  <td className="text-green-600">{money(c.todaySalesTotal)}</td>
                  <td>{money(c.todayPurchaseTotal)}</td>
                  <td className="text-red-600">{money(c.todayExpenseTotal || 0)}</td>
                  <td>{c.note || "-"}</td>
                  <td>{c.user || "-"}</td>
                </tr>
              ))}

              {filteredClosings.length === 0 && (
                <tr>
                  <td colSpan="13" className="py-5 text-slate-400">
                    Henüz devir kaydı yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CashPage({ cashBalance, cardBalance, remainingCredit, totalCompanyDebt, sales, debtPayments, creditPayments, expenses }) {
  const [filter, setFilter] = useState({ start: "", end: "" });
  const filteredSales = filterByDate(sales, filter.start, filter.end);
  const filteredPayments = filterByDate(debtPayments, filter.start, filter.end);
  const filteredCreditPayments = filterByDate(creditPayments, filter.start, filter.end);
  const filteredExpenses = filterByDate(expenses, filter.start, filter.end);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Nakit Kasa" value={money(cashBalance)} desc="Nakit hareket toplamı" />
        <StatCard title="Kart Kasa" value={money(cardBalance)} desc="Kart hareket toplamı" />
        <StatCard title="Veresiye Alacak" value={money(remainingCredit)} desc="Tahsil edilmemiş satış" />
        <StatCard title="Firma Borçları" value={money(totalCompanyDebt)} desc="Ödenecek cari borç" />
      </div>

      <DateFilter filter={filter} setFilter={setFilter} />

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Kasa Hareketleri</h3>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b text-sm text-slate-500">
                <th className="py-3">Tarih</th>
                <th>Tür</th>
                <th>Ödeme</th>
                <th>Açıklama</th>
                <th>Tutar</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.filter((s) => s.paymentType !== "Veresiye").map((s) => (
                <tr key={`sale-${s.id}`} className="border-b">
                  <td className="py-4">{formatDate(s.date)}</td>
                  <td>Satış Girişi</td>
                  <td>{s.paymentType}</td>
                  <td>{s.productName}</td>
                  <td className="font-semibold text-green-600">{money(s.total)}</td>
                </tr>
              ))}

              {filteredExpenses.map((e) => (
                <tr key={`expense-${e.id}`} className="border-b">
                  <td className="py-4">{formatDate(e.date)}</td>
                  <td>Gider</td>
                  <td>{e.paymentType}</td>
                  <td>{e.category} {e.note ? `- ${e.note}` : ""}</td>
                  <td className="font-semibold text-red-600">-{money(e.amount)}</td>
                </tr>
              ))}

              {filteredPayments.map((p) => (
                <tr key={`pay-${p.id}`} className="border-b">
                  <td className="py-4">{formatDate(p.date)}</td>
                  <td>Borç Ödemesi</td>
                  <td>{p.paymentType}</td>
                  <td>{p.supplier}</td>
                  <td className="font-semibold text-red-600">-{money(p.amount)}</td>
                </tr>
              ))}

              {filteredSales.length === 0 && filteredPayments.length === 0 && filteredCreditPayments.length === 0 && filteredExpenses.length === 0 && (
                <tr><td colSpan="5" className="py-5 text-slate-400">Bu tarih aralığında hareket yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


function CreditsPage({ customerCredits, customers, creditForm, setCreditForm, addCreditPayment, creditPayments }) {
  const [filter, setFilter] = useState({ start: "", end: "" });
  const filteredPayments = filterByDate(creditPayments, filter.start, filter.end);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Veresiye Tahsilat</h3>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">Müşteri</label>
            <input
              list="customer-list"
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
              placeholder="Müşteri seç veya yeni müşteri yaz"
              value={creditForm.customer}
              onChange={(e) => setCreditForm({ ...creditForm, customer: e.target.value })}
            />
            <datalist id="customer-list">
              {customers.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          <InputBox label="Tahsilat Tutarı" type="number" placeholder="Tutar" value={creditForm.amount} onChange={(e) => setCreditForm({ ...creditForm, amount: e.target.value })} />

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">Ödeme Türü</label>
            <select className="w-full rounded-xl border border-slate-300 px-4 py-3" value={creditForm.paymentType} onChange={(e) => setCreditForm({ ...creditForm, paymentType: e.target.value })}>
              <option>Nakit</option>
              <option>Kart</option>
            </select>
          </div>

          <InputBox label="Tarih" type="date" value={creditForm.date} onChange={(e) => setCreditForm({ ...creditForm, date: e.target.value })} />
          <InputBox label="Açıklama" placeholder="Açıklama" value={creditForm.note} onChange={(e) => setCreditForm({ ...creditForm, note: e.target.value })} />
        </div>

        <button onClick={addCreditPayment} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700">Tahsilat Kaydet</button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-bold">Müşteri Müşteri Veresiye Durumu</h3>
          <div className="flex flex-wrap gap-2">
            <ExportButton
              filename="veresiye-alacak-listesi.csv"
              rows={customerCredits}
              columns={[
                ["Müşteri", "customer"],
                ["Toplam Veresiye", "debt"],
                ["Tahsil Edilen", "paid"],
                ["Kalan Alacak", "remaining"],
                ["Satış Sayısı", "saleCount"],
              ]}
            />
            <PrintButton
              title="Veresiye Alacak Listesi"
              rows={customerCredits}
              columns={[
                ["Müşteri", "customer"],
                ["Toplam Veresiye", (r) => money(r.debt)],
                ["Tahsil Edilen", (r) => money(r.paid)],
                ["Kalan Alacak", (r) => money(r.remaining)],
                ["Satış Sayısı", "saleCount"],
              ]}
              summary={[
                { label: "Toplam Veresiye", value: money(customerCredits.reduce((t, r) => t + r.debt, 0)) },
                { label: "Tahsil Edilen", value: money(customerCredits.reduce((t, r) => t + r.paid, 0)) },
                { label: "Kalan Alacak", value: money(customerCredits.reduce((t, r) => t + r.remaining, 0)) },
              ]}
            />
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b text-sm text-slate-500">
                <th className="py-3">Müşteri</th>
                <th>Toplam Veresiye</th>
                <th>Tahsil Edilen</th>
                <th>Kalan Alacak</th>
                <th>Satış Sayısı</th>
              </tr>
            </thead>
            <tbody>
              {customerCredits.map((c) => (
                <tr key={c.customer} className="border-b">
                  <td className="py-4 font-medium">{c.customer}</td>
                  <td>{money(c.debt)}</td>
                  <td className="text-green-600">{money(c.paid)}</td>
                  <td className="font-semibold text-red-600">{money(c.remaining)}</td>
                  <td>{c.saleCount}</td>
                </tr>
              ))}
              {customerCredits.length === 0 && <tr><td colSpan="5" className="py-5 text-slate-400">Henüz veresiye alacak yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <DateFilter filter={filter} setFilter={setFilter} />

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Tahsilat Hareketleri</h3>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead>
              <tr className="border-b text-sm text-slate-500">
                <th className="py-3">Tarih</th>
                <th>Müşteri</th>
                <th>Ödeme Türü</th>
                <th>Tutar</th>
                <th>Açıklama</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-4">{formatDate(p.date)}</td>
                  <td>{p.customer}</td>
                  <td>{p.paymentType}</td>
                  <td>{money(p.amount)}</td>
                  <td>{p.note}</td>
                </tr>
              ))}
              {filteredPayments.length === 0 && <tr><td colSpan="5" className="py-5 text-slate-400">Bu tarih aralığında tahsilat yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PurchasesPage({ products, purchaseForm, setPurchaseForm, addPurchase, purchases, selectProductByBarcode, usdRate, usdStatus, loadUsdRate }) {
  const [filter, setFilter] = useState({ start: "", end: "" });
  const quantity = Number(purchaseForm.quantity) || 0;
  const buyPriceUsd = Number(purchaseForm.buyPrice) || 0;
  const activeUsdRate = Number(purchaseForm.usdRate || usdRate || 0);
  const totalUsd = quantity * buyPriceUsd;
  const unitTl = buyPriceUsd * activeUsdRate;
  const totalTl = totalUsd * activeUsdRate;
  const filteredPurchases = filterByDate(purchases, filter.start, filter.end);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-bold">Yeni Alış Ekle</h3>
          <button onClick={loadUsdRate} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
            Güncel Kuru Çek
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-700">
          {usdStatus}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-7">
          <BarcodeInput
            label="Barkod"
            value={purchaseForm.barcodeSearch}
            onChange={(value) => setPurchaseForm({ ...purchaseForm, barcodeSearch: value })}
            onSubmit={(value) => selectProductByBarcode(value, "purchase")}
          />
          <InputSelect label="Ürün seç" value={purchaseForm.productId} onChange={(e) => setPurchaseForm({ ...purchaseForm, productId: e.target.value })} products={products} />
          <InputBox label="Mal Alım Firması" placeholder="Firma adı" value={purchaseForm.supplier} onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })} />
          <InputBox label="Adet" type="number" value={purchaseForm.quantity} onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })} />
          <InputBox label="Alış Fiyatı $" type="number" placeholder="Dolar fiyatı" value={purchaseForm.buyPrice} onChange={(e) => setPurchaseForm({ ...purchaseForm, buyPrice: e.target.value, currency: "USD" })} />
          <InputBox label="USD Kuru" type="number" placeholder="Güncel kur" value={purchaseForm.usdRate || usdRate || ""} onChange={(e) => setPurchaseForm({ ...purchaseForm, usdRate: e.target.value })} />
          <InputBox label="Tarih" type="date" value={purchaseForm.date} onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })} />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">Birim Dolar</label>
            <input readOnly className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 font-semibold" value={moneyUSD(buyPriceUsd)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">Toplam Dolar</label>
            <input readOnly className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 font-semibold" value={moneyUSD(totalUsd)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">Birim TL Karşılığı</label>
            <input readOnly className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 font-semibold" value={money(unitTl)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">Toplam TL Karşılığı</label>
            <input readOnly className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 font-semibold" value={money(totalTl)} />
          </div>
        </div>

        <div className="mt-5">
          <InputBox label="Açıklama opsiyonel" placeholder="Açıklama" value={purchaseForm.note} onChange={(e) => setPurchaseForm({ ...purchaseForm, note: e.target.value })} />
        </div>

        <button onClick={addPurchase} className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700">Alışı Kaydet</button>
      </div>

      <DateFilter filter={filter} setFilter={setFilter} />

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-bold">Alış Listesi</h3>
          <div className="flex flex-wrap gap-2">
            <ExportButton
              filename="alis-listesi.csv"
              rows={filteredPurchases}
              columns={[
                ["Tarih", (r) => formatDate(r.date)],
                ["Ürün", "productName"],
                ["Firma", "supplier"],
                ["Adet", "quantity"],
                ["Alış Fiyatı USD", "buyPrice"],
                ["Toplam USD", "total"],
                ["Alan Kişi", "buyer"],
                ["Açıklama", "note"],
              ]}
            />
            <PrintButton
              title="Alış Listesi"
              rows={filteredPurchases}
              columns={[
                ["Tarih", (r) => formatDate(r.date)],
                ["Ürün", "productName"],
                ["Firma", "supplier"],
                ["Adet", "quantity"],
                ["Alış Fiyatı", (r) => moneyUSD(r.buyPrice)],
                ["Toplam", (r) => moneyUSD(r.total)],
                ["Alan Kişi", "buyer"],
              ]}
              summary={[
                { label: "Toplam Alış USD", value: moneyUSD(filteredPurchases.reduce((t, r) => t + r.total, 0)) },
                { label: "Güncel TL Karşılığı", value: money(filteredPurchases.reduce((t, r) => t + r.total, 0) * activeUsdRate) },
                { label: "Kayıt Sayısı", value: filteredPurchases.length },
              ]}
            />
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead>
              <tr className="border-b text-sm text-slate-500">
                <th className="py-3">Tarih</th>
                <th>Ürün</th>
                <th>Firma</th>
                <th>Barkod</th>
                <th>Adet</th>
                <th>Alış $</th>
                <th>Toplam $</th>
                <th>Güncel TL</th>
                <th>Alan Kişi</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-4">{formatDate(p.date)}</td>
                  <td>{p.productName}</td>
                  <td>{p.supplier}</td>
                  <td>{p.barcode || "-"}</td>
                  <td>{p.quantity}</td>
                  <td>{moneyUSD(p.buyPrice)}</td>
                  <td>{moneyUSD(p.total)}</td>
                  <td>{money(p.total * activeUsdRate)}</td>
                  <td>{p.buyer}</td>
                </tr>
              ))}
              {filteredPurchases.length === 0 && <tr><td className="py-5 text-slate-400" colSpan="9">Bu tarih aralığında alış yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


function ExpensesPage({ expenseForm, setExpenseForm, addExpense, deleteExpense, expenses }) {
  const [filter, setFilter] = useState({ start: "", end: "" });
  const filteredExpenses = filterByDate(expenses, filter.start, filter.end);
  const totalExpense = filteredExpenses.reduce((t, e) => t + e.amount, 0);

  const categories = ["Kira", "Yemek", "Yol", "Kargo", "Reklam", "Personel", "Mağaza", "Fatura", "Diğer"];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Yeni Gider Ekle</h3>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">Gider Kategorisi</label>
            <select
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
            >
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <InputBox label="Tutar" type="number" placeholder="Gider tutarı" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">Ödeme Türü</label>
            <select
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
              value={expenseForm.paymentType}
              onChange={(e) => setExpenseForm({ ...expenseForm, paymentType: e.target.value })}
            >
              <option>Nakit</option>
              <option>Kart</option>
            </select>
          </div>

          <InputBox label="Tarih" type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
          <InputBox label="Açıklama" placeholder="Açıklama" value={expenseForm.note} onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })} />
        </div>

        <button onClick={addExpense} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700">
          Gider Kaydet
        </button>
      </div>

      <DateFilter filter={filter} setFilter={setFilter} />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Filtreli Gider" value={money(totalExpense)} desc="Seçilen tarih aralığı" />
        <StatCard title="Gider Sayısı" value={String(filteredExpenses.length)} desc="Kayıt adedi" />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-bold">Gider Listesi</h3>
          <div className="flex flex-wrap gap-2">
            <ExportButton
              filename="gider-listesi.csv"
              rows={filteredExpenses}
              columns={[
                ["Tarih", (r) => formatDate(r.date)],
                ["Kategori", "category"],
                ["Ödeme", "paymentType"],
                ["Tutar", "amount"],
                ["Açıklama", "note"],
                ["Kullanıcı", "user"],
              ]}
            />
            <PrintButton
              title="Gider Listesi"
              rows={filteredExpenses}
              columns={[
                ["Tarih", (r) => formatDate(r.date)],
                ["Kategori", "category"],
                ["Ödeme", "paymentType"],
                ["Tutar", (r) => money(r.amount)],
                ["Açıklama", "note"],
                ["Kullanıcı", "user"],
              ]}
              summary={[
                { label: "Toplam Gider", value: money(filteredExpenses.reduce((t, r) => t + r.amount, 0)) },
                { label: "Kayıt Sayısı", value: filteredExpenses.length },
              ]}
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b text-sm text-slate-500">
                <th className="py-3">Tarih</th>
                <th>Kategori</th>
                <th>Ödeme</th>
                <th>Tutar</th>
                <th>Açıklama</th>
                <th>Kullanıcı</th>
                <th>İşlem</th>
              </tr>
            </thead>

            <tbody>
              {filteredExpenses.map((e) => (
                <tr key={e.id} className="border-b">
                  <td className="py-4">{formatDate(e.date)}</td>
                  <td>{e.category}</td>
                  <td>{e.paymentType}</td>
                  <td className="font-semibold text-red-600">{money(e.amount)}</td>
                  <td>{e.note || "-"}</td>
                  <td>{e.user || "-"}</td>
                  <td>
                    <button onClick={() => deleteExpense(e.id)} className="rounded-lg bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100">
                      Sil
                    </button>
                  </td>
                </tr>
              ))}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-5 text-slate-400">
                    Bu tarih aralığında gider yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DebtsPage({
  supplierDebts,
  suppliers,
  debtForm,
  setDebtForm,
  addDebtPayment,
  debtPayments,
  usdRate,
  usdStatus,
  loadUsdRate,
}) {
  const [filter, setFilter] = useState({ start: "", end: "" });
  const filteredPayments = filterByDate(debtPayments, filter.start, filter.end);
  const activeUsdRate = Number(debtForm.usdRate || usdRate || 0);

  const totalDebtUsd = supplierDebts.reduce((t, d) => t + d.debt, 0);
  const totalPaidUsd = supplierDebts.reduce((t, d) => t + d.paid, 0);
  const totalRemainingUsd = supplierDebts.reduce((t, d) => t + d.remaining, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard title="Toplam Firma Borcu $" value={moneyUSD(totalDebtUsd)} desc="Alışlardan gelen borç" />
        <StatCard title="Ödenen $" value={moneyUSD(totalPaidUsd)} desc="Cari ödeme toplamı" />
        <StatCard title="Kalan TL Karşılığı" value={money(totalRemainingUsd * activeUsdRate)} desc={usdStatus} />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-bold">Firma Borç Ödemesi</h3>
          <button onClick={loadUsdRate} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
            Güncel Kuru Çek
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-700">
          {usdStatus}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">Firma</label>
            <select className="w-full rounded-xl border border-slate-300 px-4 py-3" value={debtForm.supplier} onChange={(e) => setDebtForm({ ...debtForm, supplier: e.target.value })}>
              <option value="">Firma seç</option>
              {suppliers.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <InputBox label="Ödeme Tutarı $" type="number" placeholder="Dolar tutarı" value={debtForm.amount} onChange={(e) => setDebtForm({ ...debtForm, amount: e.target.value })} />

          <InputBox label="USD Kuru" type="number" placeholder="Güncel kur" value={debtForm.usdRate || usdRate || ""} onChange={(e) => setDebtForm({ ...debtForm, usdRate: e.target.value })} />

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">Ödeme Türü</label>
            <select className="w-full rounded-xl border border-slate-300 px-4 py-3" value={debtForm.paymentType} onChange={(e) => setDebtForm({ ...debtForm, paymentType: e.target.value })}>
              <option>Nakit</option>
              <option>Kart</option>
            </select>
          </div>

          <InputBox label="Tarih" type="date" value={debtForm.date} onChange={(e) => setDebtForm({ ...debtForm, date: e.target.value })} />
          <InputBox label="Açıklama" placeholder="Açıklama" value={debtForm.note} onChange={(e) => setDebtForm({ ...debtForm, note: e.target.value })} />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">Ödeme $</label>
            <input readOnly className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 font-semibold" value={moneyUSD(Number(debtForm.amount || 0))} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">TL Karşılığı</label>
            <input readOnly className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 font-semibold" value={money(Number(debtForm.amount || 0) * activeUsdRate)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">Kur</label>
            <input readOnly className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 font-semibold" value={`${activeUsdRate || 0} TL`} />
          </div>
        </div>

        <button onClick={addDebtPayment} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700">Ödeme Kaydet</button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-bold">Firma Firma Borç Durumu</h3>
          <ExportButton
            filename="firma-borc-listesi.csv"
            rows={supplierDebts}
            columns={[
              ["Firma", "supplier"],
              ["Toplam Borç USD", "debt"],
              ["Ödenen USD", "paid"],
              ["Kalan USD", "remaining"],
              ["Kalan TL", (r) => Number(r.remaining || 0) * activeUsdRate],
              ["Alış Sayısı", "purchaseCount"],
            ]}
          />
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead>
              <tr className="border-b text-sm text-slate-500">
                <th className="py-3">Firma</th>
                <th>Toplam Borç $</th>
                <th>Ödenen $</th>
                <th>Kalan $</th>
                <th>Güncel TL</th>
                <th>Alış Sayısı</th>
              </tr>
            </thead>
            <tbody>
              {supplierDebts.map((d) => (
                <tr key={d.supplier} className="border-b">
                  <td className="py-4 font-medium">{d.supplier}</td>
                  <td>{moneyUSD(d.debt)}</td>
                  <td className="text-green-600">{moneyUSD(d.paid)}</td>
                  <td className="font-semibold text-red-600">{moneyUSD(d.remaining)}</td>
                  <td className="font-semibold text-blue-600">{money(d.remaining * activeUsdRate)}</td>
                  <td>{d.purchaseCount}</td>
                </tr>
              ))}
              {supplierDebts.length === 0 && <tr><td colSpan="6" className="py-5 text-slate-400">Henüz firma borcu yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <DateFilter filter={filter} setFilter={setFilter} />

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Borç Ödeme Hareketleri</h3>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b text-sm text-slate-500">
                <th className="py-3">Tarih</th>
                <th>Firma</th>
                <th>Ödeme Türü</th>
                <th>Tutar $</th>
                <th>Güncel TL</th>
                <th>Açıklama</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-4">{formatDate(p.date)}</td>
                  <td>{p.supplier}</td>
                  <td>{p.paymentType}</td>
                  <td>{moneyUSD(p.amount)}</td>
                  <td>{money(p.amount * activeUsdRate)}</td>
                  <td>{p.note}</td>
                </tr>
              ))}
              {filteredPayments.length === 0 && <tr><td colSpan="6" className="py-5 text-slate-400">Bu tarih aralığında ödeme yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


function ProductsPage({ products, setProducts, cloudStatus, setCloudStatus, usdRate, usdStatus, loadUsdRate }) {
  const [newProduct, setNewProduct] = useState({
    barcode: "",
    name: "",
    supplier: "",
    stock: "",
    buyPrice: "",
    sellPrice: "",
  });

  const totalStockUsd = products.reduce((t, p) => t + Number(p.stock || 0) * Number(p.buyPrice || 0), 0);
  const totalStockTl = totalStockUsd * Number(usdRate || 0);

  const addProduct = async () => {
    if (
      !newProduct.barcode ||
      !newProduct.name ||
      !newProduct.supplier ||
      !newProduct.stock ||
      !newProduct.buyPrice ||
      !newProduct.sellPrice
    ) {
      alert("Tüm alanları doldur");
      return;
    }

    if (products.some((p) => String(p.barcode || "").trim() === String(newProduct.barcode).trim())) {
      alert("Bu barkod zaten kayıtlı");
      return;
    }

    try {
      setCloudStatus("Ürün buluta kaydediliyor...");

      const { data, error } = await supabase
        .from("products")
        .insert({
          barcode: newProduct.barcode,
          name: newProduct.name,
          supplier: newProduct.supplier,
          stock: Number(newProduct.stock),
          buy_price: Number(newProduct.buyPrice),
          sell_price: Number(newProduct.sellPrice),
        })
        .select()
        .single();

      if (error) throw error;

      const cloudProduct = mapProductFromDb(data);
      setProducts([...products, cloudProduct]);
      setCloudStatus("Ürün buluta kaydedildi");

      setNewProduct({
        barcode: "",
        name: "",
        supplier: "",
        stock: "",
        buyPrice: "",
        sellPrice: "",
      });

      showToast("Ürün buluta kaydedildi");
    } catch (error) {
      console.log("Ürün ekleme hatası:", error);
      setCloudStatus("Ürün buluta eklenemedi");
      showToast("Ürün buluta eklenemedi", "error");
    }
  };

  const updateProduct = async (id, field, value) => {
    const updatedProducts = products.map((p) =>
      p.id === id
        ? {
            ...p,
            [field]:
              field === "name" || field === "supplier" || field === "barcode"
                ? value
                : Number(value),
          }
        : p
    );

    setProducts(updatedProducts);

    const dbFields = {
      barcode: "barcode",
      name: "name",
      supplier: "supplier",
      stock: "stock",
      buyPrice: "buy_price",
      sellPrice: "sell_price",
    };

    const dbValue =
      field === "name" || field === "supplier" || field === "barcode"
        ? value
        : Number(value);

    try {
      setCloudStatus("Ürün bulutta güncelleniyor...");

      const { error } = await supabase
        .from("products")
        .update({ [dbFields[field]]: dbValue })
        .eq("id", id);

      if (error) throw error;

      setCloudStatus("Ürün bulutta güncellendi");
    } catch (error) {
      console.log("Ürün güncelleme hatası:", error);
      setCloudStatus("Bulut güncelleme hatası");
    }
  };

  const deleteProduct = async (id) => {
    if (!confirm("Bu ürün silinsin mi?")) return;

    const oldProducts = products;
    setProducts(products.filter((p) => p.id !== id));

    try {
      setCloudStatus("Ürün buluttan siliniyor...");

      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setCloudStatus("Ürün buluttan silindi");
    } catch (error) {
      console.log("Ürün silme hatası:", error);
      setProducts(oldProducts);
      setCloudStatus("Bulut silme hatası");
      showToast("Ürün buluttan silinemedi", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-700">
        Bulut Durumu: {cloudStatus}
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard title="Stok Toplamı $" value={moneyUSD(totalStockUsd)} desc="Alış maliyeti dolar" />
        <StatCard title="Güncel TL Karşılığı" value={money(totalStockTl)} desc={usdStatus} />
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Kur İşlemi</p>
          <button onClick={loadUsdRate} className="mt-3 rounded-xl bg-slate-950 px-4 py-3 font-bold text-white hover:bg-slate-800">
            Güncel Kuru Çek
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Yeni Ürün Ekle</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <InputBox label="Barkod" value={newProduct.barcode} onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })} />
          <InputBox label="Ürün adı" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
          <InputBox label="Mal alım firması" value={newProduct.supplier} onChange={(e) => setNewProduct({ ...newProduct, supplier: e.target.value })} />
          <InputBox label="Stok" type="number" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} />
          <InputBox label="Alış fiyatı $" type="number" value={newProduct.buyPrice} onChange={(e) => setNewProduct({ ...newProduct, buyPrice: e.target.value })} />
          <InputBox label="Satış fiyatı ₺" type="number" value={newProduct.sellPrice} onChange={(e) => setNewProduct({ ...newProduct, sellPrice: e.target.value })} />
        </div>
        <button onClick={addProduct} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700">Ürün Ekle</button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-bold">Ürün / Fiyat Düzenleme</h3>
          <ExportButton
            filename="stok-urun-listesi.csv"
            rows={products}
            columns={[
              ["Barkod", (r) => r.barcode || ""],
              ["Ürün", "name"],
              ["Firma", "supplier"],
              ["Stok", "stock"],
              ["Alış Fiyatı USD", "buyPrice"],
              ["Stok Toplamı USD", (r) => Number(r.stock || 0) * Number(r.buyPrice || 0)],
              ["Güncel TL Karşılığı", (r) => Number(r.stock || 0) * Number(r.buyPrice || 0) * Number(usdRate || 0)],
              ["Satış Fiyatı TL", "sellPrice"],
            ]}
          />
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left">
            <thead>
              <tr className="border-b text-sm text-slate-500">
                <th className="py-3">Barkod</th>
                <th>Ürün</th>
                <th>Mal Alım Firması</th>
                <th>Stok</th>
                <th>Alış $</th>
                <th>Stok Toplam $</th>
                <th>Güncel TL</th>
                <th>Satış ₺</th>
                <th>Birim Kâr ₺</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const stockUsd = Number(p.stock || 0) * Number(p.buyPrice || 0);
                const stockTl = stockUsd * Number(usdRate || 0);
                const unitCostTl = Number(p.buyPrice || 0) * Number(usdRate || 0);
                const unitProfitTl = Number(p.sellPrice || 0) - unitCostTl;

                return (
                  <tr key={p.id} className="border-b">
                    <td className="py-3"><input className="w-40 rounded-lg border border-slate-300 px-3 py-2" value={p.barcode || ""} onChange={(e) => updateProduct(p.id, "barcode", e.target.value)} /></td>
                    <td><input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={p.name} onChange={(e) => updateProduct(p.id, "name", e.target.value)} /></td>
                    <td><input className="w-44 rounded-lg border border-slate-300 px-3 py-2" value={p.supplier || ""} onChange={(e) => updateProduct(p.id, "supplier", e.target.value)} /></td>
                    <td><input type="number" className="w-24 rounded-lg border border-slate-300 px-3 py-2" value={p.stock} onChange={(e) => updateProduct(p.id, "stock", e.target.value)} /></td>
                    <td><input type="number" className="w-32 rounded-lg border border-slate-300 px-3 py-2" value={p.buyPrice} onChange={(e) => updateProduct(p.id, "buyPrice", e.target.value)} /></td>
                    <td className="font-semibold">{moneyUSD(stockUsd)}</td>
                    <td className="font-semibold text-blue-600">{money(stockTl)}</td>
                    <td><input type="number" className="w-32 rounded-lg border border-slate-300 px-3 py-2" value={p.sellPrice} onChange={(e) => updateProduct(p.id, "sellPrice", e.target.value)} /></td>
                    <td className={`font-semibold ${unitProfitTl >= 0 ? "text-green-600" : "text-red-600"}`}>{money(unitProfitTl)}</td>
                    <td><button onClick={() => deleteProduct(p.id)} className="rounded-lg bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100">Sil</button></td>
                  </tr>
                );
              })}
              {products.length === 0 && <tr><td colSpan="10" className="py-5 text-slate-400">Henüz ürün yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


function ReportsPage({ sales, purchases, debtPayments, creditPayments, expenses }) {
  const [filter, setFilter] = useState({ start: "", end: "" });

  const fs = filterByDate(sales, filter.start, filter.end);
  const fp = filterByDate(purchases, filter.start, filter.end);
  const fd = filterByDate(debtPayments, filter.start, filter.end);
  const fc = filterByDate(creditPayments, filter.start, filter.end);
  const fe = filterByDate(expenses, filter.start, filter.end);

  const totalSales = fs.reduce((t, s) => t + s.total, 0);
  const totalPurchases = fp.reduce((t, p) => t + p.total, 0);
  const totalProfit = fs.reduce((t, s) => t + s.profit, 0);
  const totalDebtPaid = fd.reduce((t, p) => t + p.amount, 0);
  const totalCreditPaid = fc.reduce((t, p) => t + p.amount, 0);
  const totalExpenses = fe.reduce((t, e) => t + e.amount, 0);
  const net = totalProfit - totalExpenses;

  return (
    <div className="space-y-6">
      <DateFilter filter={filter} setFilter={setFilter} />

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard title="Satış Toplamı" value={money(totalSales)} desc="Seçili tarih aralığı" />
        <StatCard title="Kâr" value={money(totalProfit)} desc="Satış kârı" />
        <StatCard title="Net" value={money(net)} desc="Kâr - gider" />
        <StatCard title="Gider" value={money(totalExpenses)} desc="Gider toplamı" />
        <StatCard title="Alış $" value={moneyUSD(totalPurchases)} desc="Alış toplamı" />
        <StatCard title="Tahsilat" value={money(totalCreditPaid)} desc="Veresiye tahsilat" />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Kurumsal PDF Raporlar</h3>
        <p className="mt-2 text-sm text-slate-500">Seçtiğin tarih aralığına göre rapor oluşturur. Yazdır ekranından PDF olarak kaydedebilirsin.</p>

        <div className="mt-5 flex flex-wrap gap-3">
          <CorporateReportButton
            title="Satış Raporu"
            rows={fs}
            columns={[
              ["Tarih", (r) => formatDate(r.date)],
              ["Ürün", "productName"],
              ["Firma", (r) => r.supplier || "Belirtilmedi"],
              ["Adet", "quantity"],
              ["Ödeme", "paymentType"],
              ["Toplam", (r) => money(r.total)],
              ["Kâr", (r) => money(r.profit)],
              ["Müşteri", "customer"],
            ]}
            summary={[
              { label: "Toplam Satış", value: money(totalSales) },
              { label: "Toplam Kâr", value: money(totalProfit) },
              { label: "Satış Sayısı", value: fs.length },
            ]}
          />

          <CorporateReportButton
            title="Gider Raporu"
            rows={fe}
            columns={[
              ["Tarih", (r) => formatDate(r.date)],
              ["Kategori", "category"],
              ["Ödeme", "paymentType"],
              ["Tutar", (r) => money(r.amount)],
              ["Açıklama", "note"],
              ["Kullanıcı", "user"],
            ]}
            summary={[
              { label: "Toplam Gider", value: money(totalExpenses) },
              { label: "Kayıt Sayısı", value: fe.length },
              { label: "Net Kâr", value: money(net) },
            ]}
          />

          <CorporateReportButton
            title="Alış Raporu"
            rows={fp}
            columns={[
              ["Tarih", (r) => formatDate(r.date)],
              ["Ürün", "productName"],
              ["Firma", "supplier"],
              ["Adet", "quantity"],
              ["Alış $", (r) => moneyUSD(r.buyPrice)],
              ["Toplam $", (r) => moneyUSD(r.total)],
              ["Alan", "buyer"],
            ]}
            summary={[
              { label: "Toplam Alış $", value: moneyUSD(totalPurchases) },
              { label: "Kayıt Sayısı", value: fp.length },
              { label: "Borç Ödeme $", value: moneyUSD(totalDebtPaid) },
            ]}
          />

          <CorporateReportButton
            title="Cari ve Veresiye Raporu"
            rows={[...fd.map((x) => ({ ...x, type: "Firma Borç Ödeme" })), ...fc.map((x) => ({ ...x, type: "Veresiye Tahsilat" }))]}
            columns={[
              ["Tarih", (r) => formatDate(r.date)],
              ["Tür", "type"],
              ["Kişi/Firma", (r) => r.supplier || r.customer || ""],
              ["Ödeme", "paymentType"],
              ["Tutar", (r) => r.supplier ? moneyUSD(r.amount) : money(r.amount)],
              ["Açıklama", "note"],
            ]}
            summary={[
              { label: "Firma Ödeme $", value: moneyUSD(totalDebtPaid) },
              { label: "Veresiye Tahsilat", value: money(totalCreditPaid) },
              { label: "Kayıt Sayısı", value: fd.length + fc.length },
            ]}
          />

          <CorporateReportButton
            title="Genel Özet Raporu"
            rows={[
              { name: "Satış Toplamı", value: money(totalSales) },
              { name: "Kâr", value: money(totalProfit) },
              { name: "Gider", value: money(totalExpenses) },
              { name: "Net", value: money(net) },
              { name: "Alış Toplamı", value: moneyUSD(totalPurchases) },
              { name: "Veresiye Tahsilat", value: money(totalCreditPaid) },
              { name: "Firma Borç Ödeme", value: moneyUSD(totalDebtPaid) },
            ]}
            columns={[
              ["Kalem", "name"],
              ["Tutar", "value"],
            ]}
            summary={[
              { label: "Net", value: money(net) },
              { label: "Satış", value: money(totalSales) },
              { label: "Kâr", value: money(totalProfit) },
            ]}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Rapor Özeti</h3>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead>
              <tr className="border-b text-sm text-slate-500">
                <th className="py-3">Kalem</th>
                <th>Tutar</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b"><td className="py-4">Satış Toplamı</td><td>{money(totalSales)}</td></tr>
              <tr className="border-b"><td className="py-4">Satış Kârı</td><td>{money(totalProfit)}</td></tr>
              <tr className="border-b"><td className="py-4">Gider</td><td>{money(totalExpenses)}</td></tr>
              <tr className="border-b"><td className="py-4 font-bold">Net</td><td className="font-bold">{money(net)}</td></tr>
              <tr className="border-b"><td className="py-4">Alış Toplamı</td><td>{moneyUSD(totalPurchases)}</td></tr>
              <tr className="border-b"><td className="py-4">Firma Borç Ödeme</td><td>{moneyUSD(totalDebtPaid)}</td></tr>
              <tr className="border-b"><td className="py-4">Veresiye Tahsilat</td><td>{money(totalCreditPaid)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BarcodeInput({ label, value, onChange, onSubmit }) {
  const [scannerOpen, setScannerOpen] = useState(false);

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-600">{label}</label>
      <div className="flex gap-2">
        <input
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
          placeholder="Barkod okut/yaz"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit(e.currentTarget.value);
          }}
        />
        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-bold text-white hover:bg-slate-800"
        >
          <Camera size={18} />
          <span className="hidden sm:inline">Kamera</span>
        </button>
      </div>

      {scannerOpen && (
        <BarcodeScanner
          onClose={() => setScannerOpen(false)}
          onDetected={(barcode) => {
            onChange(barcode);
            onSubmit(barcode);
            setScannerOpen(false);
          }}
        />
      )}
    </div>
  );
}

function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useState(null)[0];
  const [videoNode, setVideoNode] = useState(null);
  const [status, setStatus] = useState("Kamera açılıyor...");
  const [manualBarcode, setManualBarcode] = useState("");

  useEffect(() => {
    let stream = null;
    let timer = null;
    let stopped = false;

    const start = async () => {
      try {
        if (!("BarcodeDetector" in window)) {
          setStatus("Bu tarayıcı kamera barkod okumayı desteklemiyor. Barkodu elle yazabilirsin.");
          return;
        }

        if (!videoNode) return;

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        videoNode.srcObject = stream;
        await videoNode.play();

        const detector = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code", "upc_a", "upc_e"],
        });

        setStatus("Barkodu kameraya göster");

        timer = setInterval(async () => {
          if (stopped || !videoNode || videoNode.readyState < 2) return;

          try {
            const barcodes = await detector.detect(videoNode);
            if (barcodes.length > 0) {
              const value = barcodes[0].rawValue;
              if (value) {
                stopped = true;
                clearInterval(timer);
                onDetected(value);
              }
            }
          } catch (error) {
            console.log("Barkod okuma hatası:", error);
          }
        }, 700);
      } catch (error) {
        console.log("Kamera açma hatası:", error);
        setStatus("Kamera açılamadı. İzin ver veya barkodu elle yaz.");
      }
    };

    start();

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [videoNode, onDetected]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold">Kamera ile Barkod Okut</h3>
          <button onClick={onClose} className="rounded-xl bg-slate-100 px-3 py-2 font-bold">
            Kapat
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-500">{status}</p>

        <video
          ref={setVideoNode}
          className="mt-4 h-72 w-full rounded-2xl bg-slate-950 object-cover"
          playsInline
          muted
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
            placeholder="Kamera olmazsa barkodu elle yaz"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && manualBarcode.trim()) {
                onDetected(manualBarcode.trim());
              }
            }}
          />
          <button
            onClick={() => manualBarcode.trim() && onDetected(manualBarcode.trim())}
            className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
          >
            Kullan
          </button>
        </div>
      </div>
    </div>
  );
}

function InputSelect({ label, value, onChange, products }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-600">{label}</label>
      <select className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600" value={value} onChange={onChange}>
        <option value="">Ürün seç</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} / {p.supplier || "Firma yok"} / Stok: {p.stock}
          </option>
        ))}
      </select>
    </div>
  );
}

function InputBox({ label, type = "text", placeholder = "", value, onChange, onKeyDown }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-600">{label}</label>
      <input type={type} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600" placeholder={placeholder} value={value} onChange={onChange} onKeyDown={onKeyDown} />
    </div>
  );
}

function DateFilter({ filter, setFilter }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold">Tarih Filtresi</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <InputBox label="Başlangıç" type="date" value={filter.start} onChange={(e) => setFilter({ ...filter, start: e.target.value })} />
        <InputBox label="Bitiş" type="date" value={filter.end} onChange={(e) => setFilter({ ...filter, end: e.target.value })} />
        <div className="flex items-end">
          <button onClick={() => setFilter({ start: "", end: "" })} className="w-full rounded-xl bg-slate-950 px-5 py-3 font-bold text-white">Filtreyi Temizle</button>
        </div>
      </div>
    </div>
  );
}

function UsersPage({ users, newUser, setNewUser, addUser, deleteUser }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">
        <b>Yetki Açıklaması:</b> Yönetici tüm sayfaları görür. Satış: satış, kasa, veresiye ve rapor. Kasa: satış, kasa, gider ve rapor. Stok: alış, firma borç, ürün ve rapor.
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <UserPlus size={22} className="text-blue-600" />
          <h3 className="text-xl font-bold">Yeni Kullanıcı Ekle</h3>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InputBox label="Ad Soyad" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
          <InputBox label="Kullanıcı adı" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
          <InputBox label="Şifre" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">Yetki</label>
            <select className="w-full rounded-xl border border-slate-300 px-4 py-3" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
              <option>Yönetici</option>
              <option>Satış</option>
              <option>Stok</option>
              <option>Kasa</option>
              <option>Görüntüleme</option>
            </select>
          </div>
        </div>

        <button onClick={addUser} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">Kullanıcı Ekle</button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Kullanıcı Listesi</h3>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead>
              <tr className="border-b text-sm text-slate-500">
                <th className="py-3">Ad Soyad</th>
                <th>Kullanıcı Adı</th>
                <th>Şifre</th>
                <th>Yetki</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="py-4 font-medium">{u.name}</td>
                  <td>{u.username}</td>
                  <td>{u.password}</td>
                  <td>{u.role}</td>
                  <td><button onClick={() => deleteUser(u.id)} className="rounded-lg bg-red-50 px-3 py-2 text-red-600">Sil</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}






function WhatsAppButton({ sale }) {
  const sendWhatsApp = () => {
    const text = `CEP DÜNYASI - SATIŞ FİŞİ

Firma: SAR ELEKTRONİK
Telefon: 533 810 75 25
Adres: Cumhuriyet, Kaleönü Cad No:36/B, Melikgazi/Kayseri

Tarih: ${formatDate(sale.date)}
Ürün: ${sale.productName || ""}
Barkod: ${sale.barcode || "-"}
Adet: ${sale.quantity}
Birim Fiyat: ${money(sale.unitPrice)}
Toplam: ${money(sale.total)}
Ödeme: ${sale.paymentType || "Nakit"}
Müşteri: ${sale.customer || "Belirtilmedi"}

Bizi tercih ettiğiniz için teşekkür ederiz.`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <button
      onClick={sendWhatsApp}
      className="rounded-lg bg-green-600 px-3 py-2 text-sm font-bold text-white hover:bg-green-700"
    >
      WhatsApp
    </button>
  );
}

function ReceiptButton({ sale }) {
  const printReceipt = () => {
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>SAR ELEKTRONİK - Satış Fişi</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 18px; color: #111827; background: #ffffff; }
            .receipt { max-width: 390px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 18px; border-radius: 16px; }
            .logoBox { text-align: center; margin-bottom: 8px; }
            .logo { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 18px; background: #0f172a; color: white; font-weight: 900; font-size: 24px; letter-spacing: -1px; }
            h1 { text-align: center; font-size: 22px; margin: 8px 0 0; letter-spacing: .5px; }
            .brand { text-align: center; font-weight: 800; font-size: 14px; margin-top: 4px; color: #2563eb; }
            .sub { text-align: center; color: #64748b; font-size: 12px; margin-top: 6px; line-height: 1.35; }
            .line { border-top: 1px dashed #94a3b8; margin: 14px 0; }
            .row { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; margin: 8px 0; }
            .row span { color: #475569; }
            .row strong { font-size: 14px; text-align: right; }
            .total { font-size: 18px; font-weight: 900; background: #f1f5f9; padding: 10px; border-radius: 12px; }
            .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 16px; line-height: 1.4; }
            @media print {
              body { padding: 0; }
              .receipt { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="logoBox">
              <div class="logo">SAR</div>
            </div>
            <h1>SAR ELEKTRONİK</h1>
            <div class="brand">CEP DÜNYASI</div>
            <div class="sub">
              Tel: 533 810 75 25<br />
              Cumhuriyet, Kaleönü Cad No:36/B<br />
              38040 Melikgazi / Kayseri
            </div>

            <div class="line"></div>
            <div class="row"><span>Fiş Türü</span><strong>Satış Fişi</strong></div>
            <div class="row"><span>Tarih</span><strong>${formatDate(sale.date)}</strong></div>
            <div class="row"><span>Ürün</span><strong>${sale.productName || ""}</strong></div>
            <div class="row"><span>Barkod</span><strong>${sale.barcode || "-"}</strong></div>
            <div class="row"><span>Müşteri</span><strong>${sale.customer || "Belirtilmedi"}</strong></div>
            <div class="row"><span>Ödeme</span><strong>${sale.paymentType || "Nakit"}</strong></div>

            <div class="line"></div>
            <div class="row"><span>Adet</span><strong>${sale.quantity}</strong></div>
            <div class="row"><span>Birim Fiyat</span><strong>${money(sale.unitPrice)}</strong></div>
            <div class="row total"><span>Toplam</span><strong>${money(sale.total)}</strong></div>

            <div class="line"></div>
            <div class="footer">
              Bizi tercih ettiğiniz için teşekkür ederiz.<br />
              CEP DÜNYASI
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
  };

  return (
    <button
      onClick={printReceipt}
      className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800"
    >
      Fiş
    </button>
  );
}


function CorporateReportButton({ title, rows, columns, summary = [], filename = "rapor" }) {
  const openReport = () => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const safeColumns = Array.isArray(columns) ? columns : [];

    const bodyRows = safeRows
      .map((row) => {
        const cells = safeColumns
          .map(([label, getter]) => {
            const value = typeof getter === "function" ? getter(row) : row?.[getter];
            return `<td>${value ?? ""}</td>`;
          })
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    const headCells = safeColumns.map(([label]) => `<th>${label}</th>`).join("");

    const summaryHtml = summary
      .map((item) => `
        <div class="summaryCard">
          <div class="summaryLabel">${item.label}</div>
          <div class="summaryValue">${item.value}</div>
        </div>
      `)
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; background: white; }
            .top { display: flex; align-items: center; justify-content: space-between; gap: 20px; border-bottom: 2px solid #0f172a; padding-bottom: 16px; }
            .brand { display: flex; align-items: center; gap: 14px; }
            .logo { width: 58px; height: 58px; border-radius: 16px; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 22px; }
            h1 { margin: 0; font-size: 24px; }
            .muted { color: #64748b; font-size: 12px; line-height: 1.45; }
            .reportTitle { margin-top: 22px; font-size: 22px; font-weight: 900; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 18px 0; }
            .summaryCard { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; }
            .summaryLabel { font-size: 12px; color: #64748b; }
            .summaryValue { margin-top: 6px; font-size: 18px; font-weight: 900; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
            th { text-align: left; background: #0f172a; color: white; padding: 10px; }
            td { border-bottom: 1px solid #e5e7eb; padding: 9px; vertical-align: top; }
            .footer { margin-top: 22px; text-align: center; color: #64748b; font-size: 12px; }
            @media print {
              body { padding: 12px; }
              .noPrint { display: none; }
              .summary { grid-template-columns: repeat(3, 1fr); }
            }
          </style>
        </head>
        <body>
          <div class="top">
            <div class="brand">
              <div class="logo">SAR</div>
              <div>
                <h1>SAR ELEKTRONİK</h1>
                <div class="muted">CEP DÜNYASI</div>
              </div>
            </div>
            <div class="muted" style="text-align:right">
              Tel: 533 810 75 25<br />
              Cumhuriyet, Kaleönü Cad No:36/B<br />
              38040 Melikgazi / Kayseri
            </div>
          </div>

          <div class="reportTitle">${title}</div>
          <div class="muted">Rapor Tarihi: ${new Date().toLocaleDateString("tr-TR")}</div>

          <div class="summary">${summaryHtml}</div>

          <table>
            <thead><tr>${headCells}</tr></thead>
            <tbody>
              ${bodyRows || `<tr><td colspan="${safeColumns.length}">Kayıt bulunamadı.</td></tr>`}
            </tbody>
          </table>

          <div class="footer">Bu rapor Cep Dünyası yönetim sistemi üzerinden oluşturulmuştur.</div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
  };

  return (
    <button
      onClick={openReport}
      className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
    >
      PDF Rapor
    </button>
  );
}

function PrintButton({ title, rows, columns, summary = [] }) {
  const printReport = () => {
    if (!rows || rows.length === 0) {
      alert("Yazdırılacak kayıt yok");
      return;
    }

    const headerHtml = columns.map(([title]) => `<th>${title}</th>`).join("");
    const bodyHtml = rows
      .map((row) => {
        const cells = columns
          .map(([, key]) => {
            const value = typeof key === "function" ? key(row) : row[key];
            return `<td>${value ?? ""}</td>`;
          })
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    const summaryHtml = summary
      .map((item) => `<div class="summary-card"><strong>${item.label}</strong><span>${item.value}</span></div>`)
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 16px; margin-bottom: 20px; }
            h1 { margin: 0; font-size: 24px; }
            .brand { font-size: 13px; color: #475569; margin-top: 6px; }
            .date { font-size: 13px; color: #475569; text-align: right; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0; }
            .summary-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; background: #f8fafc; }
            .summary-card strong { display: block; font-size: 12px; color: #64748b; }
            .summary-card span { display: block; margin-top: 6px; font-size: 16px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
            th { text-align: left; background: #111827; color: white; padding: 9px; }
            td { border-bottom: 1px solid #e5e7eb; padding: 8px; }
            .footer { margin-top: 24px; font-size: 12px; color: #64748b; }
            @media print {
              button { display: none; }
              body { padding: 12px; }
            }
          </style>
        </head>
        <body>
          <div class="top">
            <div>
              <h1>${title}</h1>
              <div class="brand">CEP DÜNYASI Yönetim Paneli</div>
            </div>
            <div class="date">
              Yazdırma Tarihi<br />
              ${new Date().toLocaleString("tr-TR")}
            </div>
          </div>

          ${summary.length ? `<div class="summary">${summaryHtml}</div>` : ""}

          <table>
            <thead><tr>${headerHtml}</tr></thead>
            <tbody>${bodyHtml}</tbody>
          </table>

          <div class="footer">Bu çıktı Cep Dünyası Yönetim Paneli üzerinden oluşturulmuştur.</div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
  };

  return (
    <button
      onClick={printReport}
      className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
    >
      PDF / Yazdır
    </button>
  );
}

function ExportButton({ filename, rows, columns }) {
  const exportCsv = () => {
    if (!rows || rows.length === 0) {
      alert("Dışa aktarılacak kayıt yok");
      return;
    }

    const header = columns.map(([title]) => title);
    const body = rows.map((row) =>
      columns.map(([, key]) => {
        const value = typeof key === "function" ? key(row) : row[key];
        return cleanCsvValue(value);
      })
    );

    const csv = [header, ...body].map((line) => line.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={exportCsv}
      className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
    >
      Excel Çıktı
    </button>
  );
}

function cleanCsvValue(value) {
  if (value === undefined || value === null) return "";
  const text = String(value).replaceAll('"', '""');
  return `"${text}"`;
}

function DashboardCard({ title, value, desc, color }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${color} p-6 text-white shadow-sm`}>
      <p className="text-sm font-semibold opacity-90">{title}</p>
      <h3 className="mt-3 text-2xl font-bold sm:text-3xl">{value}</h3>
      <p className="mt-2 text-sm opacity-80">{desc}</p>
    </div>
  );
}

function SummaryRow({ label, value, positive, negative, big }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-b-0">
      <span className={big ? "text-lg font-bold" : "text-slate-600"}>{label}</span>
      <span className={`${big ? "text-xl" : "text-base"} font-bold ${positive ? "text-green-600" : ""} ${negative ? "text-red-600" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function getLastSixMonths() {
  const result = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("tr-TR", { month: "short" });
    result.push({ key, label });
  }

  return result;
}

function MenuItem({ icon, text, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm ${active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-900"}`}>
      {icon}
      {text}
    </button>
  );
}

function StatCard({ title, value, desc }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <h3 className="mt-2 text-3xl font-bold">{value}</h3>
      <p className="mt-2 text-sm text-slate-400">{desc}</p>
    </div>
  );
}

function mapUserFromDb(row) {
  return {
    id: row.id,
    name: row.name || "",
    username: row.username || "",
    password: row.password || "",
    role: row.role || "Satış",
  };
}

function mapDailyClosingFromDb(row) {
  return {
    id: row.id,
    closingDate: row.closing_date || "",
    createdAt: row.created_at || new Date().toISOString(),
    cashBalance: Number(row.cash_balance || 0),
    cardBalance: Number(row.card_balance || 0),
    remainingCredit: Number(row.remaining_credit || 0),
    totalCompanyDebt: Number(row.total_company_debt || 0),
    todaySalesTotal: Number(row.today_sales_total || 0),
    todayPurchaseTotal: Number(row.today_purchase_total || 0),
    todayExpenseTotal: Number(row.today_expense_total || 0),
    note: row.note || "",
    user: row.user_name || "",
  };
}

function mapDebtPaymentFromDb(row) {
  return {
    id: row.id,
    supplier: row.supplier || "",
    amount: Number(row.amount || 0),
    paymentType: row.payment_type || "Nakit",
    note: row.note || "",
    user: row.user_name || "",
    date: row.created_at || new Date().toISOString(),
  };
}

function mapCreditPaymentFromDb(row) {
  return {
    id: row.id,
    customer: row.customer || "",
    amount: Number(row.amount || 0),
    paymentType: row.payment_type || "Nakit",
    note: row.note || "",
    user: row.user_name || "",
    date: row.created_at || new Date().toISOString(),
  };
}

function mapExpenseFromDb(row) {
  return {
    id: row.id,
    category: row.category || "",
    paymentType: row.payment_type || "Nakit",
    amount: Number(row.amount || 0),
    note: row.note || "",
    user: row.user_name || "",
    date: row.created_at || new Date().toISOString(),
  };
}

function mapPurchaseFromDb(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name || "",
    barcode: row.barcode || "",
    supplier: row.supplier || "",
    quantity: Number(row.quantity || 0),
    buyPrice: Number(row.buy_price || 0),
    total: Number(row.total || 0),
    note: row.note || "",
    buyer: row.buyer || "",
    date: row.created_at || new Date().toISOString(),
  };
}

function mapSaleFromDb(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name || "",
    barcode: row.barcode || "",
    supplier: row.supplier || "Belirtilmedi",
    customer: row.customer || "Belirtilmedi",
    paymentType: row.payment_type || "Nakit",
    quantity: Number(row.quantity || 0),
    unitPrice: Number(row.unit_price || 0),
    total: Number(row.total || 0),
    profit: Number(row.profit || 0),
    note: row.note || "",
    seller: row.seller || "",
    date: row.created_at || new Date().toISOString(),
  };
}

function mapProductFromDb(row) {
  return {
    id: row.id,
    barcode: row.barcode || "",
    name: row.name || "",
    supplier: row.supplier || "",
    stock: Number(row.stock || 0),
    buyPrice: Number(row.buy_price || 0),
    sellPrice: Number(row.sell_price || 0),
  };
}

function getPageTitle(page) {
  return {
    dashboard: "Ana Panel",
    sales: "Satış İşlemleri",
    purchases: "Alış İşlemleri",
    cash: "Kasa Yönetimi",
    closing: "Günlük Devir",
    credits: "Veresiye / Alacak",
    debts: "Cari / Firma Borçları",
    products: "Stok / Ürünler",
    expenses: "Giderler",
    reports: "Raporlar & Grafikler",
    users: "Kullanıcı Yönetimi",
  }[page];
}

function money(value) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(value || 0);
}

function moneyUSD(value) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function toIsoDate(inputDate) {
  if (!inputDate) return new Date().toISOString();
  return new Date(inputDate + "T12:00:00").toISOString();
}

function isoToInput(iso) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("tr-TR");
}

function filterByDate(items, start, end) {
  return items.filter((item) => {
    const d = isoToInput(item.date);
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}

export default App;

function SalesPage({ products, saleForm, setSaleForm, addSale, sales, deleteSale, selectProductByBarcode }) {
  const [filter, setFilter] = useState({ start: "", end: "" });
  const quantity = Number(saleForm.quantity) || 0;
  const price = Number(saleForm.price) || 0;
  const total = price * quantity;
  const filteredSales = filterByDate(sales, filter.start, filter.end);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Yeni Satış Ekle</h3>

        <div className="mt-5 grid gap-5 xl:grid-cols-7">
          <BarcodeInput
            label="Barkod"
            value={saleForm.barcodeSearch}
            onChange={(value) => setSaleForm({ ...saleForm, barcodeSearch: value })}
            onSubmit={(value) => selectProductByBarcode(value, "sale")}
          />
          <InputSelect label="Ürün seç" value={saleForm.productId} onChange={(e) => setSaleForm({ ...saleForm, productId: e.target.value })} products={products} />
          <InputBox label="Adet" type="number" value={saleForm.quantity} onChange={(e) => setSaleForm({ ...saleForm, quantity: e.target.value })} />
          <InputBox label="Fiyat ₺" type="number" placeholder="Satış fiyatı" value={saleForm.price} onChange={(e) => setSaleForm({ ...saleForm, price: e.target.value })} />

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">Ödeme Türü</label>
            <select className="w-full rounded-xl border border-slate-300 px-4 py-3" value={saleForm.paymentType} onChange={(e) => setSaleForm({ ...saleForm, paymentType: e.target.value })}>
              <option>Nakit</option>
              <option>Kart</option>
              <option>Veresiye</option>
            </select>
          </div>

          <InputBox label="Tarih" type="date" value={saleForm.date} onChange={(e) => setSaleForm({ ...saleForm, date: e.target.value })} />

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">Toplam ₺</label>
            <input readOnly className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 font-semibold" value={money(total)} />
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <InputBox label="Müşteri adı opsiyonel" placeholder="Müşteri adı" value={saleForm.customer} onChange={(e) => setSaleForm({ ...saleForm, customer: e.target.value })} />
          <InputBox label="Açıklama opsiyonel" placeholder="Açıklama" value={saleForm.note} onChange={(e) => setSaleForm({ ...saleForm, note: e.target.value })} />
        </div>

        <button onClick={addSale} className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700">Satışı Kaydet</button>
      </div>

      <DateFilter filter={filter} setFilter={setFilter} />

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-bold">Satış Listesi</h3>
          <div className="flex flex-wrap gap-2">
            <ExportButton
              filename="satis-listesi.csv"
              rows={filteredSales}
              columns={[
                ["Tarih", (r) => formatDate(r.date)],
                ["Ürün", "productName"],
                ["Firma", (r) => r.supplier || "Belirtilmedi"],
                ["Adet", "quantity"],
                ["Birim Fiyat", "unitPrice"],
                ["Ödeme", "paymentType"],
                ["Toplam", "total"],
                ["Kâr", "profit"],
                ["Müşteri", "customer"],
                ["Açıklama", "note"],
                ["Satan", "seller"],
              ]}
            />
            <PrintButton
              title="Satış Listesi"
              rows={filteredSales}
              columns={[
                ["Tarih", (r) => formatDate(r.date)],
                ["Ürün", "productName"],
                ["Ödeme", "paymentType"],
                ["Adet", "quantity"],
                ["Fiyat", (r) => money(r.unitPrice)],
                ["Toplam", (r) => money(r.total)],
                ["Kâr", (r) => money(r.profit)],
                ["Müşteri", "customer"],
              ]}
              summary={[
                { label: "Toplam Satış", value: money(filteredSales.reduce((t, r) => t + r.total, 0)) },
                { label: "Toplam Kâr", value: money(filteredSales.reduce((t, r) => t + r.profit, 0)) },
                { label: "Kayıt Sayısı", value: filteredSales.length },
              ]}
            />
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead>
              <tr className="border-b text-sm text-slate-500">
                <th className="py-3">Tarih</th>
                <th>Ürün</th>
                <th>Firma</th>
                <th>Barkod</th>
                <th>Adet</th>
                <th>Fiyat</th>
                <th>Ödeme</th>
                <th>Toplam</th>
                <th>Kâr</th>
                <th>Müşteri</th>
                <th>Fiş</th>
                <th>WhatsApp</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((s) => (
                <tr key={s.id} className="border-b">
                  <td className="py-4">{formatDate(s.date)}</td>
                  <td>{s.productName}</td>
                  <td>{s.supplier || "Belirtilmedi"}</td>
                  <td>{s.barcode || "-"}</td>
                  <td>{s.quantity}</td>
                  <td>{money(s.unitPrice)}</td>
                  <td>{s.paymentType}</td>
                  <td>{money(s.total)}</td>
                  <td className="font-semibold text-green-600">{money(s.profit)}</td>
                  <td>{s.customer}</td>
                  <td><ReceiptButton sale={s} /></td>
                  <td><WhatsAppButton sale={s} /></td>
                  <td><button onClick={() => deleteSale(s.id)} className="rounded-lg bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100">Sil</button></td>
                </tr>
              ))}
              {filteredSales.length === 0 && <tr><td className="py-5 text-slate-400" colSpan="12">Bu tarih aralığında satış yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
