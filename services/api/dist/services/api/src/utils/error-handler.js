"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapDomainErrorToStatusCode = mapDomainErrorToStatusCode;
exports.handleError = handleError;
exports.wrapHandler = wrapHandler;
const domain_errors_1 = require("../../../../domain/errors/domain-errors");
function mapDomainErrorToStatusCode(error) {
    if (error instanceof domain_errors_1.NotFoundError)
        return 404;
    if (error instanceof domain_errors_1.UnauthorizedError)
        return 401;
    if (error instanceof domain_errors_1.ForbiddenError)
        return 403;
    if (error instanceof domain_errors_1.ValidationError)
        return 400;
    if (error instanceof domain_errors_1.DuplicateError)
        return 409;
    if (error instanceof domain_errors_1.DomainError)
        return 400;
    return 500;
}
function handleError(error, request, reply) {
    const statusCode = mapDomainErrorToStatusCode(error);
    if (statusCode >= 500) {
        request.log.error({ err: error }, 'Internal server error');
    }
    else {
        request.log.warn({ err: error }, 'Request failed');
    }
    const response = {
        error: error.name,
        message: error.message,
        statusCode,
    };
    reply.code(statusCode).send(response);
}
function wrapHandler(handler) {
    return async (request, reply) => {
        try {
            await handler(request, reply);
        }
        catch (error) {
            handleError(error, request, reply);
        }
    };
}
