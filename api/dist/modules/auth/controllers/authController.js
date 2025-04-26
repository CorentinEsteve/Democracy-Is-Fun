"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.signup = void 0;
const authService = __importStar(require("../services/authService"));
const signup = async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
        res.status(400).json({ message: 'Email, password, and name are required' });
        return;
    }
    try {
        const existingUser = await authService.findUserByEmail(email);
        if (existingUser) {
            res.status(409).json({ message: 'Email already exists' });
            return;
        }
        const passwordHash = await authService.hashPassword(password);
        const user = await authService.createUser({ email, name, passwordHash });
        const token = authService.generateToken(user.id);
        // Omit passwordHash from the response
        const { passwordHash: _, ...userWithoutPassword } = user;
        res.status(201).json({ token, user: userWithoutPassword });
    }
    catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error during signup' });
    }
};
exports.signup = signup;
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ message: 'Email and password are required' });
        return;
    }
    try {
        const user = await authService.findUserByEmail(email);
        if (!user || !user.passwordHash) { // Check if user exists and has a password
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }
        const isPasswordValid = await authService.comparePassword(password, user.passwordHash);
        if (!isPasswordValid) {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }
        const token = authService.generateToken(user.id);
        // Omit passwordHash from the response
        const { passwordHash: _, ...userWithoutPassword } = user;
        res.status(200).json({ token, user: userWithoutPassword });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error during login' });
    }
};
exports.login = login;
//# sourceMappingURL=authController.js.map