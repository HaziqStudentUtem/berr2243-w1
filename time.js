const mongoose = require("mongoose");

const startTime = Date.now(); // Start timing

mongoose
  .connect("mongodb://localhost:27017/testDB") // Removed deprecated options
  .then(() => {
    const duration = Date.now() - startTime;
    console.log("Connected to MongoDB!");
    console.log(`Connection time: ${duration} ms`);
  })
  .catch((err) => console.error("Connection error:", err));
