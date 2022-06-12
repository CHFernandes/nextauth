import Router from "next/router";
import { destroyCookie, parseCookies, setCookie } from "nookies";
import { createContext, ReactNode, useEffect, useState } from "react";
import { api } from "../services/api";

type User = {
    email: string;
    permissions: string[];
    roles: string[];
}

type SignInCredentials = {
    email: string;
    password: string;
}

type AuthContextData = {
    signIn(credentials: SignInCredentials): Promise<void>;
    user: User;
    isAuthenticated: boolean;
}

type AuthProviderProps = {
    children: ReactNode;
}

export const AuthContext = createContext({} as AuthContextData);

export function signOut() {
    destroyCookie(undefined, 'nextauth.token')
    destroyCookie(undefined, 'nextauth.refreshToken')

    Router.push('/')
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User>({} as User);
    const isAuthenticated = !!user;

    useEffect(() => {
        const { 'nextauth.token': token } = parseCookies();

        if (token) {
            api.get('/me').then(response => {
                const { email, permissions, roles } = response.data
                setUser({ email, permissions, roles });
            })
            .catch(() => {
                signOut()
            })
        }
    }, [])

    async function signIn({ email, password }: SignInCredentials) {
        try {
            const response = await api.post('sessions', {
                email,
                password
            })

            const { token, refreshToken,permissions, roles } = response.data

            setCookie(undefined, 'nextauth.token', token, {
                maxAge: 24 * 60 * 60 * 30, // 30 days
                path: '/'
            });
            setCookie(undefined, 'nextauth.refreshToken', refreshToken, {
                maxAge: 24 * 60 * 60 * 30, // 30 days
                path: '/'
            });

            setUser({
                email,
                permissions,
                roles,
            })

            api.defaults.headers.common['Authorization'] = `Bearer ${token}`

            Router.push('/dashboard')
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated, signIn, user }} >
            {children}
        </AuthContext.Provider>
    )
}