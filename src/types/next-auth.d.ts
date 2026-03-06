import NextAuth, { DefaultSession } from "next-auth";

// Extend the built-in session types to include our custom user role
declare module "next-auth" {
    interface Session {
        user: {
            role?: 'ADMIN' | 'EDITOR' | 'USER';
        } & DefaultSession["user"]
    }

    interface User {
        role?: 'ADMIN' | 'EDITOR' | 'USER';
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role?: 'ADMIN' | 'EDITOR' | 'USER';
    }
}
