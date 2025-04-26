"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserByEmail = exports.createUser = exports.generateToken = exports.comparePassword = exports.hashPassword = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const server_1 = require("../../../server"); // Adjust path if necessary
// TODO: Move JWT_SECRET to .env file
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key'; // Use a strong secret in production!
const SALT_ROUNDS = 10;
const hashPassword = async (password) => {
    return bcrypt_1.default.hash(password, SALT_ROUNDS);
};
exports.hashPassword = hashPassword;
const comparePassword = async (plainTextPassword, hash) => {
    return bcrypt_1.default.compare(plainTextPassword, hash);
};
exports.comparePassword = comparePassword;
const generateToken = (userId) => {
    const payload = { userId };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '1d' }); // Token expires in 1 day
};
exports.generateToken = generateToken;
const createUser = async (data) => {
    return server_1.prisma.user.create({
        data: {
            email: data.email,
            name: data.name,
            passwordHash: data.passwordHash, // Assuming you add this field to your User model
        },
    });
};
exports.createUser = createUser;
const findUserByEmail = async (email) => {
    return server_1.prisma.user.findUnique({ where: { email } });
};
exports.findUserByEmail = findUserByEmail;
//# sourceMappingURL=authService.js.map