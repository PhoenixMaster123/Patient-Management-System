# gRPC Client for Billing Service

The `BillingServiceGrpcClient` class in the `patient-service` microservice acts as a gRPC client that connects to the `billing-service` microservice. It allows communication between the two services over gRPC.

## Code Breakdown

| Component | Code | Description |
|-----------|------|-------------|
| **Class Declaration** | `@Service public class BillingServiceGrpcClient {` | Defines the class as a Spring service, making it eligible for dependency injection. |
| **Logger** | `private static final Logger log = LoggerFactory.getLogger(BillingServiceGrpcClient.class);` | Creates a logger instance to log messages for debugging and monitoring. |
| **gRPC Stub** | `private final BillingServiceGrpc.BillingServiceBlockingStub blockingStub;` | Declares a blocking stub for synchronous gRPC communication with the `billing-service`. |
| **Constructor** | `public BillingServiceGrpcClient(@Value("${billing.service.address:localhost}") String serverAddress, @Value("${billing.service.grpc.port:9001}") int serverPort) { ... }` | Initializes the gRPC client using configurable server address and port. |
| **Logging Connection Info** | `log.info("Connecting to Billing Service Grpc at {}:{}", serverAddress, serverPort);` | Logs the connection details when the client initializes. |
| **Creating Managed Channel** | `ManagedChannel channel = ManagedChannelBuilder.forAddress(serverAddress, serverPort).usePlaintext().build();` | Establishes a gRPC connection to the billing service. Uses plaintext communication (no TLS). |
| **Initializing Stub** | `blockingStub = BillingServiceGrpc.newBlockingStub(channel);` | Creates a blocking stub for making synchronous gRPC calls. |
| **createBillingAccount Method** | `public BillingResponse createBillingAccount(String patientId, String name, String email) { ... }` | Sends a `BillingRequest` to the `billing-service` and receives a `BillingResponse`. |
| **Building Request** | `BillingRequest request = BillingRequest.newBuilder().setPatientId(patientId).setName(name).setEmail(email).build();` | Constructs a request with patient details. |
| **Sending gRPC Request** | `BillingResponse response = blockingStub.createBillingAccount(request);` | Calls the `createBillingAccount` method on the remote gRPC server. |
| **Logging Response** | `log.info("Received response from Billing Service via GRPC: {}", response);` | Logs the received response for debugging and monitoring. |
| **Returning Response** | `return response;` | Returns the response received from the billing service. |

## Summary

- This client allows the `patient-service` to communicate with the `billing-service` via gRPC.
- It establishes a gRPC connection using a `ManagedChannel` and a `BlockingStub`.
- The `createBillingAccount` method sends a request to the billing service and retrieves a response synchronously.
- Logging is used to track connection status and responses.

This setup enables seamless inter-service communication in a microservices architecture.
