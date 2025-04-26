"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// TODO: Move JWT_SECRET to .env file
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = { userId: decoded.userId };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(401).json({ message: 'Unauthorized: Token expired' });
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({ message: 'Unauthorized: Invalid token' });
        }
        else {
            console.error('Authentication error:', error);
            return res.status(500).json({ message: 'Internal server error during authentication' });
        }
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=authenticate.js.map