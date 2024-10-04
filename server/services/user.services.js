import prisma from "../../prisma/postgresClient.js";
import bcrypt from "bcrypt";
import { authService } from "./auth.services.js";
import { Icons } from "../tools/IconGenerator.js";

export class UserServices {
    static async getUserByMail(email) {
        const auth = await authService.getAuthByMail(email);
        if(!auth){
            return auth
        }
        const user = await prisma.user.findFirst({ where: { id: auth.userId } });
        return user;
    }

    static async getUserById(ID) {
        const user = await prisma.user.findFirst({ where: { id: ID } });
        return user;
    }

    static async createUser({ email, password, name, accesToken, refreshToken }) {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        const icon=Icons.genRandomIcon()
        // Create user and authentication data in a transaction
        return await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    isPremium:false,
                    icon:icon.seed,
                    iconStyle:icon.style
                },
            });

            await tx.auth.create({
                data: {
                    userId: user.id,
                    email,
                    password: hashedPassword,
                    accesToken,
                    refreshToken
                },
            });

            return user;
        });
    }
}
