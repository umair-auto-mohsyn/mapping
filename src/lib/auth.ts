import GoogleProvider from "next-auth/providers/google";
import { NextAuthOptions } from "next-auth";
import { getAuthorizedUsers } from "./google-sheets";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async signIn({ user }) {
            const allowedDomains = ["@mohsyn.com", "@humanetek.com", "umair786uet@gmail.com"];
            const isAllowed = user.email && allowedDomains.some(domain => user.email?.endsWith(domain) || user.email === domain);
            return !!isAllowed;
        },
        async jwt({ token, account }) {
            if (account && token.email) {
                const rolesMap = await getAuthorizedUsers();
                const userRole = rolesMap[token.email.toLowerCase()];
                token.role = userRole || "USER";
            }
            return token;
        },
        async session({ session, token }: { session: any, token: any }) {
            if (session.user) {
                session.user.role = token.role;
            }
            return session;
        }
    },
};
