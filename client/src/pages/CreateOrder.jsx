import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth, UKRAINIAN_CITIES } from "../context/AuthContext.jsx";

const DEFAULT_CATEGORIES = [
  { id: 1, name: "Вантажники", icon: "📦", isDelivery: false },
  { id: 2, name: "Прибирання", icon: "🧹", isDelivery: false },
  { id: 3, name: "Доставка та кур'єри", icon: "🚗", isDelivery: true },
  { id: 4, name: "Дрібний ремонт", icon: "🛠️", isDelivery: false },
  { id: 5, name: "Електрика та сантехніка", icon: "⚡", isDelivery: false },
  { id: 6, name: "Різноробочі", icon: "👷", isDelivery: false },
  { id: 7, name: "IT та цифрова допомога", icon: "💻", isDelivery: false },
];

export default function CreateOrder() {
  const { user, cities, reloadProfile } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [form, setForm] = useState({
    title: "",
    description: "",
    categoryId: "1",
    cityId: user?.cityId || "1",
    address: "",
    pickupAddress: "",
    dropoffAddress: "",
    price: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/catalog/categories")
      .then((r) => {
        if (Array.isArray(r.data) && r.data.length > 0) {
          setCategories(r.data);
        }
      })
      .catch(() => setCategories(DEFAULT_CATEGORIES));
  }, []);

  useEffect(() => {
    if (user?.cityId) {
      setForm((f) => ({ ...f, cityId: String(user.cityId) }));
    }
  }, [user?.cityId]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const safeCategories = Array.isArray(categories) ? categories : DEFAULT_CATEGORIES;
  const safeCities = Array.isArray(cities) && cities.length > 0 ? cities : UKRAINIAN_CITIES;

  const selectedCategoryObj = safeCategories.find(
    (c) => String(c.id) === String(form.categoryId)
  );
  const isDelivery =
    selectedCategoryObj?.isDelivery ||
    selectedCategoryObj?.name?.toLowerCase().includes("доставк");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    // Validation for delivery vs regular address
    if (isDelivery && (!form.pickupAddress?.trim() || !form.dropoffAddress?.trim())) {
      setError("Будь ласка, вкажіть обидві адреси: звідки забрати та куди доставити");
      setBusy(false);
      return;
    }

    const selectedCity = safeCities.find((c) => String(c.id) === String(form.cityId)) || { id: 1, name: "Київ" };
    const categoryObj = safeCategories.find((c) => String(c.id) === String(form.categoryId)) || safeCategories[0];

    let finalAddress = form.address?.trim() || selectedCity.name;
    if (isDelivery && form.pickupAddress && form.dropoffAddress) {
      finalAddress = `${form.pickupAddress.trim()} → ${form.dropoffAddress.trim()}`;
    }

    const newOrderData = {
      id: Date.now(),
      title: form.title.trim(),
      description: form.description?.trim() || "",
      price: parseFloat(form.price),
      address: finalAddress,
      pickupAddress: form.pickupAddress?.trim() || null,
      dropoffAddress: form.dropoffAddress?.trim() || null,
      categoryId: parseInt(form.categoryId, 10),
      Category: { id: categoryObj.id, name: categoryObj.name, icon: categoryObj.icon },
      cityId: selectedCity.id,
      city: selectedCity,
      customer: {
        id: user?.id || 1,
        firstName: user?.firstName || "Замовник",
        username: user?.username || "",
      },
      customerId: user?.id || 1,
      status: "OPEN",
      createdAt: new Date().toISOString(),
      _count: { applications: 0 },
    };

    // Save locally to custom_created_orders in localStorage
    try {
      const existing = JSON.parse(localStorage.getItem("custom_created_orders") || "[]");
      const updated = [newOrderData, ...existing];
      localStorage.setItem("custom_created_orders", JSON.stringify(updated));
    } catch (e) {
      console.warn("Помилка збереження в localStorage:", e);
    }

    // Try posting to backend API
    try {
      await api.post("/orders", {
        ...form,
        cityId: parseInt(form.cityId, 10) || selectedCity.id,
        price: parseFloat(form.price),
        categoryId: parseInt(form.categoryId, 10),
      }).catch((err) => {
        console.warn("API POST /orders не відповів, збережено в локальну базу:", err);
      });
      await reloadProfile();
    } catch (err) {
      console.warn("API POST failed:", err);
    } finally {
      setBusy(false);
      navigate("/");
    }
  }

  return (
    <form onSubmit={submit} className="p-4 pb-28 flex flex-col gap-4 max-w-md mx-auto">
      <div className="flex items-center gap-2 mt-1">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          ← Назад
        </button>
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          Розмістити завдання
        </h1>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
        Оплата — готівкою на місці після виконання роботи
      </p>

      {error && (
        <div className="bg-red-50 text-red-800 border border-red-200 text-xs p-3 rounded-xl">
          {error}
        </div>
      )}

      <Field label="Що потрібно зробити">
        <input
          required
          className="input"
          placeholder="Наприклад: розвантажити фуру з будматеріалами, 3 години"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Категорія">
          <select
            required
            className="input"
            value={form.categoryId}
            onChange={(e) => update("categoryId", e.target.value)}
          >
            {safeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Місто">
          <select
            required
            className="input"
            value={form.cityId}
            onChange={(e) => update("cityId", e.target.value)}
          >
            {safeCities.map((c) => (
              <option key={c.id} value={c.id}>
                📍 {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Деталі (необов'язково)">
        <textarea
          className="input"
          rows={3}
          placeholder="Вимоги, що взяти з собою, бажаний час початку"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </Field>

      {/* Dynamic Address Inputs for Delivery vs Regular */}
      {isDelivery ? (
        <div className="flex flex-col gap-3 p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60">
          <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
            <span>🚗</span> Маршрут кур'єрської доставки:
          </div>

          <Field label="📍 Звідки (забір посилки / відправник)">
            <input
              required
              className="input bg-white dark:bg-slate-900"
              placeholder="Вулиця, номер будинку, поверх/під'їзд"
              value={form.pickupAddress}
              onChange={(e) => update("pickupAddress", e.target.value)}
            />
          </Field>

          <Field label="🏁 Куди (доставка / одержувач)">
            <input
              required
              className="input bg-white dark:bg-slate-900"
              placeholder="Вулиця, номер будинку, орієнтир або метро"
              value={form.dropoffAddress}
              onChange={(e) => update("dropoffAddress", e.target.value)}
            />
          </Field>
        </div>
      ) : (
        <Field label="Адреса або район">
          <input
            className="input"
            placeholder="Вулиця, орієнтир або станція метро"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
          />
        </Field>
      )}

      <Field label="Оплата готівкою, ₴">
        <input
          required
          type="number"
          min="1"
          className="input amount text-lg"
          placeholder="500"
          value={form.price}
          onChange={(e) => update("price", e.target.value)}
        />
      </Field>

      <button
        disabled={busy}
        className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full py-3.5 font-semibold text-sm shadow-md active:scale-95 transition-all disabled:opacity-50"
      >
        {busy ? "Публікуємо…" : "Опублікувати завдання 🚀"}
      </button>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}