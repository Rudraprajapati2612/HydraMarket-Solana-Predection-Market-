import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader';
import { error } from 'console';

import path from "path"

const PROTO_PATH = path.join(__dirname, '../../proto/matching_engine.proto');


const packageDefination = protoLoader.loadSync(PROTO_PATH,{
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
})

const protoDescriptor = grpc.loadPackageDefinition(packageDefination);

const matchingEngineProto = (protoDescriptor.matching_engine as any);


export interface PlaceOrderRequest{
    user_id : string,
    market_id : string,
    side : 'BUY'|'SELL',
    outcome : 'YES'|'NO',
    order_type : 'MARKET'|'LIMIT'|'POSTONLY',
    price : string,
    quantity : string,
    reservation_id? : string
}


export interface Trade {
    trade_id: string;
    market_id: string;
    outcome: string;
    trade_type: string;
    buyer_id: string;
    seller_id: string;
    quantity: string;
    price: string;
    timestamp: string;
  }

  
  export interface ComplementaryMatch {
    trade_id: string;
    market_id: string;
    yes_buyer_id: string;
    no_buyer_id: string;
    quantity: string;
    yes_price: string;
    no_price: string;
    timestamp: string;
  }
  export interface PlaceOrderResponse {
    order_id: string;
    status: string;
    trades: Trade[];
    complementary_matches: ComplementaryMatch[];
  }
  
  
export interface GetOrderbookRequest {
    market_id: string;
    outcome: 'YES' | 'NO';
  }
  
  export interface PriceLevel {
    price: string;
    quantity: string;
    order_count: number;
  }
  
  export interface GetOrderbookResponse {
    bids: PriceLevel[];
    asks: PriceLevel[];
  }

  export class MatchingEngineClient{
    private client : any;

    constructor(address:string='localhost:50052'){{
        this.client = new matchingEngineProto.MatchingEngine(
            address,
            grpc.credentials.createInsecure()
        );

        console.log(`matching engine connected to the address ${address}`);
    }}

    async placeOrder(request:PlaceOrderRequest):Promise<PlaceOrderResponse>{
        return new Promise ((resolve,reject)=>{
            this.client.PlaceOrder(request,(error:any,response:PlaceOrderResponse)=>{
                if(error){
                    console.error(' MatchingEngine.PlaceOrder error:', error);
                    reject(error);
                }else{
                    console.log(`MatchingEngine.PlaceOrder: order_id=${response.order_id}, status=${response.status}`);
                    resolve(response);
                }
            })
        })
    }

    async getOrderbook(request: GetOrderbookRequest): Promise<GetOrderbookResponse> {
        return new Promise((resolve, reject) => {
          this.client.GetOrderbook(request, (error: any, response: GetOrderbookResponse) => {
            if (error) {
              console.error('MatchingEngine.GetOrderbook error:', error);
              reject(error);
            } else {
              resolve(response);
            }
          });
        });
    }


    close() {
        grpc.closeClient(this.client);
    }
  }