import "dotenv/config"
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.join(__dirname, '../../../packages/proto/user.proto');
const USER_SERVICE_URL = process.env.USER_SERVICE_GRPC || 'localhost:50051';

// read the proto and convert it into a javascript friendly metadata

  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,  //keep in small case 
    longs: String,   // convert int64 to string 
    enums: String,   // convert enum to string 
    defaults: true,  // fill default space 
    oneofs: true,    // Proper on and off support
  });   

//   Load the grpc package 
  const userProto = grpc.loadPackageDefinition(packageDefinition).user as any;
  
//  Create a grpc client to connect 
  export const userServiceClient = new userProto.userService(
    USER_SERVICE_URL,
    grpc.credentials.createInsecure()
  )

  export function grpcCall<T>(method : string, request:any):Promise<T>{
    return new Promise((resolve,reject)=>{
        userServiceClient[method](request,(error:any,response:any)=>{
            if(error){
                reject(error)
            }else{
                resolve(response)
            }
        })
    })
  }


  export const userServiceAPi = {
    register: (data: {
        email: string;
        username: string;
        password: string;
        full_name?: string;
      }) => grpcCall<any>('Register', data),

    login:(data:{
        email : string,
        password : string
    })=> grpcCall<any>('Login',data),

    GetUser:(userId:string)=>grpcCall<any>('GetUser',{ user_id: userId }),

    GetUserByUsername : (username:string) => grpcCall<any>('GetUserByUsername',{username}),
    ValidateToken:(token:string)=>grpcCall<any>('ValidateToken',{token})

  }