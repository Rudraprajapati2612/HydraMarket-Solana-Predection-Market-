import {Elysia,t} from "elysia";

import { userServiceAPi } from "../grpc/userClient";
import { AppError } from "../types";
import { catchall } from "zod/mini";


const publicRoutes = new Elysia()
    
        .get('/user/:username',async({params})=>{
            try{
                const user = await userServiceAPi.GetUserByUsername(params.username);

                return{
                    success : true,
                    data:{
                        userId: user.user_id,
                        username: user.username,
                        fullName: user.full_name,
                        walletAddress: user.wallet_address,
                        createdAt: user.created_at,
                    }
                }
            }catch(e:any){
                if (e.code === 5) { // NOT_FOUND
                    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
                  }
                  
                  throw new AppError('Failed to fetch user', 500);
            }   
        }, {
            params : t.Object({
                username : t.String({minLength:3,maxLength:20}),
            }),
            detail:{
                summary: 'Get user by username',
                tags: ['Users'],
            }
        }
    )