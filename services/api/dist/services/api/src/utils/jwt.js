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
const config_1 = require("../../../../lib/config");
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
    const expiresIn = parseExpiry(config_1.config.jwt.accessTokenExpiry);
    return jsonwebtoken_1.default.sign(payload, (0, config_1.getJWTSecret)(), {
        expiresIn,
    });
}
function generateRefreshToken() {
    return (0, crypto_1.randomUUID)();
}
function verifyAccessToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, (0, config_1.getJWTSecret)());
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
    const expiresInSeconds = parseExpiry(config_1.config.jwt.refreshTokenExpiry);
    return new Date(Date.now() + expiresInSeconds * 1000);
}
