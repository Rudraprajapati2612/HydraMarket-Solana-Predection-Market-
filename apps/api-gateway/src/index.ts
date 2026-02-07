import Elysia, { status } from "elysia";
import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import { authPlugin } from "./plugins/auth"; //Middleware 
import { rateLimitPlugins } from "./plugins/rateLimit";
import { authRoutes } from './routes/auth';
import { publicRoutes } from "./routes/public";
import { AppError } from './types';

const PORT = parseInt(process.env.PORT || '3000');


const app  =  new Elysia()
            .use(cors({
                origin:true,
                credentials : true
            }))

            .use(swagger({
                documentation:{
                    info:{
                        title : 'HydraMarket-Api',
                        version : '1.0.0',
                        description : "Predection market API"
                    },

                    tags :[
                        {name : 'Authentication',description : 'Auth Endpoint'},
                        {name :"Users",description : "User endPoint"}
                    ]
                }
            }))


            .use(authPlugin())
            .use(rateLimitPlugins)

            .get('/health',()=>({
                status : 'ok',
                timestamp: Date.now(),
                uptime: process.uptime(),
                version: '1.0.0', 
            }),{
                detail : {
                    summary : 'Health Check',
                    tags : ['System']
                }
            })

            .use(authRoutes)
            .use(publicRoutes)


            .onError(({ code, error, set }) => {
                console.error('Error:', error);
                
                // Handle custom AppError
                if (error instanceof AppError) {
                  set.status = error.statusCode;
                  return {
                    success: false,
                    error: error.message,
                    code: error.code,
                  };
                }
                
                // Handle validation errors
                if (code === 'VALIDATION') {
                  set.status = 400;
                  return {
                    success: false,
                    error: 'Validation error',
                    details: error.message,
                  };
                }
                
                // Handle not found
                if (code === 'NOT_FOUND') {
                  set.status = 404;
                  return {
                    success: false,
                    error: 'Route not found',
                  };
                }
                
                // Generic error
                set.status = 500;
                return {
                  success: false,
                  error: 'Internal server error',
                };
              })
              
              // Start server
              .listen(PORT);
            
            console.log(`
            🚀 HydraMarket API Gateway started!
            
            📍 Server: http://${app.server?.hostname}:${app.server?.port}
            📚 Swagger: http://${app.server?.hostname}:${app.server?.port}/swagger
            ⚡ Framework: Elysia.js
            🔥 Runtime: Bun ${Bun.version}
            `);
            
            // Graceful shutdown
            process.on('SIGINT', () => {
              console.log('\n🛑 Shutting down gracefully...');
              app.stop();
              process.exit(0);
            });