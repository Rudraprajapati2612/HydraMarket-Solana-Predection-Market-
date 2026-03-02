use chrono::NaiveDateTime;


#[derive(Debug,Clone)]

pub struct Withdrawal{
    pub id : String,
    pub user_id : String,
    pub asset : String,
    pub amount : String,
    pub destination_address : String,
    pub status : WithdrawalStatus,
    pub requested_at : NaiveDateTime
}

#[derive(Debug,Clone)]
pub enum  WithdrawalStatus {
    Pending,
    Processing,
    Confirmed,
    Failed
}
