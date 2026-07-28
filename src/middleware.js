import express from "express";
import rateLimit from "./algorithms/fixed-window.js";
const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
	res.send("Express server is running");
});
const limiter = new FixedWindowRateLimiter({ limit: 10, windowMs: 60000 });
app.use(limiter);
app.listen(port, () => {
	console.log(`Server listening on port ${port}`);
});
