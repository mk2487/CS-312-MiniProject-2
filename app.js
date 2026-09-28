const express = require("express");
const axios = require("axios");
const path = require("node:path");

const currencies = [
    ["USD", "US Dollar"], ["EUR", "Euro"], ["GBP", "British Pound"],
    ["JPY", "Japanese Yen"], ["CAD", "Canadian Dollar"], ["AUD", "Australian Dollar"],
    ["CHF", "Swiss Franc"], ["CNY", "Chinese Yuan"], ["INR", "Indian Rupee"],
    ["MXN", "Mexican Peso"], ["HUF", "Hungarian Forint"], ["KRW", "South Korean Won"]
];
const codes = currencies.map(([code]) => code);
const client = axios.create({ baseURL: "https://api.frankfurter.dev/v2", timeout: 10000 });

function createApp(api = client) {
    const app = express();
    app.set("view engine", "ejs");
    app.set("views", path.join(__dirname, "views"));
    app.use(express.urlencoded({ extended: false, limit: "10kb" }));
    app.use(express.static(path.join(__dirname, "public")));

    function render(res, form, result = null, error = null, status = 200) {
        return res.status(status).render("index", { currencies, form, result, error });
    }

    app.get("/", (req, res) => render(res, { amount: "100", from: "USD", to: "EUR" }));
    app.get("/health", (req, res) => res.sendStatus(200));

    app.post("/convert", async (req, res) => {
        const form = {
            amount: typeof req.body.amount === "string" ? req.body.amount.trim() : "",
            from: typeof req.body.from === "string" ? req.body.from : "",
            to: typeof req.body.to === "string" ? req.body.to : ""
        };
        const amount = Number(form.amount);
        if (!/^\d+(\.\d{1,2})?$/.test(form.amount) || !Number.isFinite(amount) || amount <= 0 || amount > 1000000000) {
            return render(res, form, null, "Enter an amount from 0.01 to 1,000,000,000, with up to two decimal places.", 400);
        }
        if (!codes.includes(form.from) || !codes.includes(form.to)) {
            return render(res, form, null, "Choose a supported currency in both dropdowns.", 400);
        }
        if (form.from === form.to) {
            return render(res, form, null, "Choose two different currencies to get an exchange rate.", 400);
        }
        try {
            const { data } = await api.get(`/rate/${form.from}/${form.to}`);
            if (!data || data.base !== form.from || data.quote !== form.to || typeof data.rate !== "number" || !Number.isFinite(data.rate) || data.rate <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
                throw new Error("Invalid exchange-rate response");
            }
            const money = (value, currency) => new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "code" }).format(value);
            const rate = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 8 }).format(data.rate);
            return render(res, form, {
                original: money(amount, form.from),
                converted: money(amount * data.rate, form.to),
                rate,
                date: data.date,
                sourceName: currencies.find(([code]) => code === form.from)[1],
                targetName: currencies.find(([code]) => code === form.to)[1]
            });
        } catch (error) {
            const unavailable = [404, 422].includes(error.response?.status);
            return render(res, form, null, unavailable
                ? "A rate is not available for this pair. Choose another currency and try again."
                : "We couldn't reach the exchange-rate service. Your entries are saved below—please try again.", unavailable ? 422 : 503);
        }
    });

    app.use((req, res) => res.status(404).send('Page not found. <a href="/">Back to the converter</a>'));
    return app;
}

if (require.main === module) {
    const port = process.env.PORT || 3001;
    createApp().listen(port, "0.0.0.0", () => console.log(`Currency converter running on port ${port}`));
}

module.exports = { createApp };
