const express = require("express");
const cors = require("cors");
require("dotenv").config();

const paymentRoutes = require("./routes/payments.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Payment backend running 🚀");
});

app.use("/api/payments", paymentRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});