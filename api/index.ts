import express from "express";
import { configureApp } from "../server/_core/app";

// Vercel invokes this exported Express app as a serverless function. Local
// development continues to use server/_core/index.ts, which imports the same
// application configuration and starts an HTTP listener.
const app = configureApp(express());

export default app;
