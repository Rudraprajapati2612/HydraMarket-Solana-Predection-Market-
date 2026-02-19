fn main() {
    tonic_build::compile_protos("proto/matching_engine.proto")
        .unwrap_or_else(|e| panic!("Failed to compile protos: {:?}", e));
}