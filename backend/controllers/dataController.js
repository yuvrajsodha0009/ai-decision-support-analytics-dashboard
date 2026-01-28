import axios from "axios";
import Data from "../models/Data.js";

export const fetchAndStoreData = async (req, res) => {
  const response = await axios.get("https://api.example.com/data");

  const savedData = await Data.insertMany(response.data);
  res.json(savedData);
};
