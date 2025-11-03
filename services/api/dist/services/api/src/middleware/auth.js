"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jwt_1 = require("../utils/jwt");
const domain_errors_1 = require("../../../../domain/errors/domain-errors");
async function authenticate(request, _reply) {
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new domain_errors_1.UnauthorizedError('Missing or invalid authorization header');
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const payload = (0, jwt_1.verifyAccessToken)(token);
        // Attach user info to request
        request.user = {
            userId: payload.userId,
            email: payload.email,
        };
    }
    catch (error) {
        throw new domain_errors_1.UnauthorizedError(error instanceof Error ? error.message : 'Authentication failed');
    }
}
