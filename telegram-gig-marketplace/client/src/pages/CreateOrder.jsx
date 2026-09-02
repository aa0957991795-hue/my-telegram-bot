import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function CreateOrder() {
  const { user, cities, reloadProfile } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    cityId: user?.cityId || "",
    address: "",
    pickupAddress: "",
    dropoffAddress: "",
    price: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/catalog/categories").then((r) => setCategories(r.data));
  }, []);

  useEffect(() => {
    if (user?.cityId && !form.cityId) {
      setForm((f) => ({ ...f, cityId: user.cityId }));
    }
  }, [user?.cityId]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const selectedCategoryObj = categories.find((c) => String(c.id) === String(form.categoryId));
  const isDelivery = selectedCategoryObj?.isDelivery || selectedCategoryObj?.name?.toLowerCase().includes('доставк');

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

    try {
      const { data } = await api.post("/orders", {
        ...form,
        cityId: form.cityId || user?.cityId || 1,
      });
      await reloadProfile();
      navigate(`/tasks/${data.id}`);
    } catch (err) {
      setError(err?.response?.data?.error || "Помилка при публікації завдання");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="p-4 pb-28 flex flex-col gap-4 max-w-md mx-auto">
      <div>
        <h1 className="font-display text-xl font-bold mt-1 text-ink">Розмістити завдання</h1>
        <p className="text-xs text-ink/50 mt-0.5">
          Оплата — готівкою на місці після виконання роботи
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 border border-red-200 text-xs p-3 rounded-xl">
          {error}
        </div>
      )}

      <Field label="Що потрібно зробити">
        <input
          required
          className="input"
          placeholder="Наприклад: розвантажити фуру, 3 години"
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
            <option value="">Оберіть категорію</option>
            {categories.map((c) => (
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
            <option value="">Оберіть місто</option>
            {cities.map((c) => (
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
        <div className="flex flex-col gap-3 p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
          <div className="text-xs font-bold text-emerald-900 flex items-center gap-1">
            <span>🚗</span> Маршрут кур'єрської доставки:
          </div>

          <Field label="📍 Звідки (забір посилки / відправник)">
            <input
              required
              className="input bg-white"
              placeholder="Вулиця, номер будинку, поверх/під'їзд"
              value={form.pickupAddress}
              onChange={(e) => update("pickupAddress", e.target.value)}
            />
          </Field>

          <Field label="🏁 Куди (доставка / одержувач)">
            <input
              required
              className="input bg-white"
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
        className="mt-2 bg-ink hover:bg-black text-white rounded-full py-3.5 font-medium disabled:opacity-40 shadow-md active:scale-95 transition-all"
      >
        {busy ? "Публікуємо…" : "Опублікувати завдання"}
      </button>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-ink/60">{label}</span>
      {children}
    </label>
  );
}