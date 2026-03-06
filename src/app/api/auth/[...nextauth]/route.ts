import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { getAuthorizedUsers } from "@/lib/google-sheets";

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
    ],
    // Secret needed for JWT encryption
    secret: process.env.NEXTAUTH_SECRET,
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async signIn({ user }) {
            // Restriction: Only allow internal domains
            const allowedDomains = ["@mohsyn.com", "@humanetek.com", "umair786uet@gmail.com"];
            const isAllowed = user.email && allowedDomains.some(domain => user.email?.endsWith(domain) || user.email === domain);

            if (isAllowed) {
                return true;
            }
            return false; // Deny access for all other domains
        },
        async jwt({ token, account }) {
            // Fetch roles from the Google Sheet when they log in
            if (account && token.email) {
                const rolesMap = await getAuthorizedUsers();
                const userRole = rolesMap[token.email.toLowerCase()];
                // If they are in the sheet, assign the role. If not, default to "USER" (view only).
                token.role = userRole || "USER";
            }
            return token;
        },
        async session({ session, token }) {
            // Pass the role from the token to the client session
            if (session.user) {
                session.user.role = token.role;
            }
            return session;
        }
    },
});

export { handler as GET, handler as POST };

