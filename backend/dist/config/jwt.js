"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signToken = signToken;
exports.verifyToken = verifyToken;
// src/config/jwt.ts
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// jsonwebtoken's Secret type
const JWT_SECRET = process.env.JWT_SECRET || "codesync-super-secret-CHANGE-ME-123456789";
function signToken(payload) {
    // Explicitly type options as SignOptions so TS uses the right overload
    const options = {
        expiresIn: "7d", // token valid for 7 days
    };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, options);
}
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
