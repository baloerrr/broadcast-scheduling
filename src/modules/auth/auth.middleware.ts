import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HttpException } from '../../common/exceptions/HttpExceptions';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import AuthRepository from './auth.repository';
import { User } from '@prisma/client';



export function getAuthorization(req: Request, res:Response, next: NextFunction) {
    // const token = req.header('Authorization')?.replace('Bearer ', '');

    const token = req.cookies['authToken'];


    if (!token) {
        return res.status(401).json({ message: 'Access denied, no token provided' });
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new HttpException(500, "JWT Secret not configured");
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token' });
    }
}


export function validationMiddleware<T>(type: any): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
        const input = plainToInstance(type, req.body);
        validate(input).then(errors => {
            if (errors.length > 0) {
                const messages = errors.map(error => Object.values(error.constraints || {}).join(', ')).join(', ');
                res.status(400).json({ message: messages });
            } else {
                req.body = input;
                next();
            }
        });
    };
}

export const refreshUserData = async (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && req.user) {
        const userId = (req.user as User).id;
        const updatedUser = await AuthRepository.findById(userId);
        if (updatedUser) {
            req.user = updatedUser;
        }
    }
    next();
};
