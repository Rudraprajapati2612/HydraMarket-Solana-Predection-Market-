import "dotenv/config"

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

import path from "path"
import { AuthServices } from "./services/authService";

const PROTO_PATH = path.join(__dirname,'../../../packages/proto/user.proto');
const GRPC_PORT = process.env.GRPC_PORT || "50051";

// Conver It to a Javascript type formate 
const packageDefination = protoLoader.loadSync(PROTO_PATH,{
    keepCase : true,
    longs : String,
    enums : String,
    defaults: true,
    oneofs: true,
});

// Load Grpc Package

const userProto = grpc.loadPackageDefinition(packageDefination).user as any;



const authService = new AuthServices();

const userServiceImpl = {
    async Register(call:any,callback:any){
        try{
            const {email,username,password,fullName} = call.request;
            
            console.log("RAW full_name:", fullName);
            const result = await authService.register({
                email ,
                username,
                password,
                fullName 
            });
          
            // it is used to send the response 
            // like res.status().json({})
            callback(null,{
                user_id : result.userId,
                email : result.email,
                username : result.username,
                role : result.role,
                deposite_memo:result.depositeMemo,
                token : result.token
            });
        }catch(e:any){
            console.error('Register error:', e);
                callback({
                  code: e.message.includes('exists') || e.message.includes('taken')
                    ? grpc.status.ALREADY_EXISTS
                    : grpc.status.INTERNAL,
                  message: e.message,
                });
        }
    },

    async Login(call: any, callback: any) {
        try {
          const { email, password } = call.request;
          
          const result = await authService.login({ email, password });
          
          callback(null, {
            user_id: result.userId,
            email: result.email,
            username: result.username,
            role : result.role,
            deposite_address:result.depositAddress,
            deposite_memo : result.depositeMemo,
            token: result.token,
          });
        } catch (error: any) {
          console.error('Login error:', error);
          callback({
            code: grpc.status.UNAUTHENTICATED,
            message: error.message,
          });
        }
      },

      async ValidateToken(call: any, callback: any) {
        try {
          const { token } = call.request;
          const result = await authService.validateToken(token);
          
          callback(null, {
            valid: result.valid,
            user_id: result.userId || '',
            email: result.email || '',
            username: result.username || '',
            role : result.role
          });
        } catch (error: any) {
          callback(null, {
            valid: false,
            user_id: '',
            email: '',
            username: '',
          });
        }
      },

      async GetUser(call: any, callback: any) {
        try {
          const { user_id } = call.request;
          const user = await authService.getUserById(user_id);
          
          callback(null, {
            user_id: user.userId,
            email: user.email,
            username: user.username,
            full_name: user.fullName || '',
            role : user.role,
            deposit_address: user.depositAddress,
            deposite_memo: user.depositeMemo,
            created_at: user.createdAt,
          });
        } catch (error: any) {
          callback({
            code: grpc.status.NOT_FOUND,
            message: error.message,
          });
        }
      },
      
      async GetUserByUsername(call: any, callback: any) {
        try {
          const { username } = call.request;
          const user = await authService.getUserByUsername(username);
          
          callback(null, {
            user_id: user.userId,
            email: user.email,
            username: user.username,
            full_name: user.fullName || '',
            role : user.role,
            deposite_address : user.depositeAddress,
            deposite_memo: user.depositeMemo,
            created_at: user.createdAt,
          });
        } catch (error: any) {
          callback({
            code: grpc.status.NOT_FOUND,
            message: error.message,
          });
        }
      },  
};


function main(){
    const server  = new  grpc.Server();

    server.addService(userProto.UserService.service,userServiceImpl);

    server.bindAsync(
        `0.0.0.0:${GRPC_PORT}`,
        grpc.ServerCredentials.createInsecure(),
        (err, port) => {
          if (err) {
            console.error('Failed to start server:', err);
            process.exit(1);
          }
          console.log(` User Service listening on port ${port}`);
          server.start();
        }
      );
}

main()