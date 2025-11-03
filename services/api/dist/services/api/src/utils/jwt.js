"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.calculateRefreshTokenExpiry = calculateRefreshTokenExpiry;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = require("crypto");
function getJWTSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    return secret;
}
function parseExpiry(expiry) {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
        throw new Error(`Invalid expiry format: ${expiry}`);
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers = {
        s: 1,
        m: 60,
        h: 60 * 60,
        d: 60 * 60 * 24,
    };
    return value * multipliers[unit];
}
function generateAccessToken(payload) {
    const expiry = process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m';
    const expiresIn = parseExpiry(expiry);
    return jsonwebtoken_1.default.sign(payload, getJWTSecret(), {
        expiresIn,
    });
}
function generateRefreshToken() {
    return (0, crypto_1.randomUUID)();
}
function verifyAccessToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, getJWTSecret());
        return decoded;
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new Error('Access token has expired');
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new Error('Invalid access token');
        }
        throw error;
    }
}
function calculateRefreshTokenExpiry() {
    const expiry = process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d';
    const expiresInSeconds = parseExpiry(expiry);
    return new Date(Date.now() + expiresInSeconds * 1000);
}
