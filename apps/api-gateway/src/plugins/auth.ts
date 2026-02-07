import {Elysia} from "elysia";

import jwt from "@elysiajs/jwt"
import bearer from "@elysiajs/bearer";
import { AppError } from "../types";
import type { User } from "../types";
export const  authPlugin = new Elysia({name : 'auth'})
    .use(
        // it expose 2 function on request contex
        // jwt.sign() and jwt.verify() 
        jwt({
            name : 'jwt',
            secret : process.env.JWT_SECRET !
        })
    )
    .use(bearer())

    //  derive user from token 
    .derive(async({jwt,bearer})=>{
        if(!bearer){
            return {
                user : null as User | null
            }
        }
        try{
        const payload = await jwt.verify(bearer);
        if(!payload){
            return {
                user: null as User | null
            }
        }

        return {
            user:{
                userId:payload.userId as string,
                email : payload.email as string,
                username : payload.username as string
            },
        };
    }catch(e){
        return {user : null};
    }
    }) 
    .macro(({ onBeforeHandle }) => ({
        isAuthenticated(enabled: boolean) {
          if (!enabled) return;
          
          onBeforeHandle(({ user }: { user: { userId: string; email: string; username: string } | null }) => {
            if (!user) {
              throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
            }
          });
        },
    }));