import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
    ],
    callbacks: {
        async signIn({ user }) {
            // Restriction: Only allow internal domains
            const allowedDomains = ["@mohsyn.com", "@humanetek.com"];
            const isAllowed = user.email && allowedDomains.some(domain => user.email?.endsWith(domain));

            if (isAllowed) {
                return true;
            }
            return false; // Deny access for all other domains
        },
    },
});

export { handler as GET, handler as POST };
