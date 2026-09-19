import express from "express";

const app = express();

app.use(express.json());

let shouldFail = false;

app.post("/webhook", (req, res) => {
  console.log("Webhook received:");
  console.log(req.body);

  if (shouldFail) {
    console.log("❌ Receiver returning 503");
    return res.status(503).json({
      message: "Service temporarily unavailable",
    });
  }

  console.log("✅ Receiver returning 200");

  return res.status(200).json({
    message: "Webhook received successfully",
  });
});

app.post("/fail", (req, res) => {
  shouldFail = true;

  res.json({
    message: "Receiver will now fail",
  });
});

app.post("/recover", (req, res) => {
  shouldFail = false;

  res.json({
    message: "Receiver recovered",
  });
});

app.listen(4000, () => {
  console.log("Test receiver running on http://localhost:4000");
});
