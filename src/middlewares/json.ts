import express from "express";

export const jsonParser = express.json({ strict: false });
export const urlencodedParser = express.urlencoded({ extended: true });
