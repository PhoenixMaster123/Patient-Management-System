# 🏥 Patient Management System (Microservices)

## 📌 Overview
This project is a **Patient Management System** designed with a **Microservices Architecture**, leveraging **Spring Boot** and **AWS (LocalStack)** for scalable and efficient healthcare data management. It enables secure patient record handling, appointment scheduling, and billing operations.

The system supports both **RESTful APIs** for external communication and **gRPC** for efficient inter-service communication, ensuring high performance and scalability in distributed environments.


## ⚙️ Technologies Used
- **Spring Boot** (for backend microservices)
- **AWS** Integration with LocalStack
- **gRPC** (for inter-service communication)
- **Kafka** (for event-driven communication)
- **PostgreSQL** (for database persistence)
- **API Gateway** (for centralized API management)
- **Docker** (for containerization and orchestration)

## 🏗️ Microservices Structure
- **Patient Service** 🏥 (`patient-service`)  
  Manages patient records, appointments, and medical history.

- **Billing Service** 💰 (`billing-service`)  
  Handles invoices, payments, and financial transactions.

- **Authentication Service** 🔐 (`auth-service`)  
  Manages user authentication, authorization, and Bearer token-based security.

- **API Gateway** 🌐 (`api-gateway`)  
  Central entry point for routing requests to the appropriate services.

- **Analytics Service** 📊 (`analytics-service`)  
  Processes and provides insights based on patient and billing data.

- **Integration Tests** 🧪 (`integration-tests`)  
  Contains test cases to validate interactions between microservices.

- **Infrastructure** ⚙️ (`infrastructure`)  
  Contains scripts and configurations for AWS CloudFormation and deployment automation.

- **gRPC Requests** 🔄 (`grpc-requests/billing-service`)  
  Defines protocol buffer files and gRPC communication for the billing service.

- **API Requests** 📡 (`api-requests`)  
  Stores predefined API request examples for testing and debugging.

## 🏗️ Prerequisites

Before running the project, ensure you have installed:

- **JDK 21**
- **Apache Maven 3.9.9**
- **Docker & Docker Compose**
- **LocalStack (for AWS emulation)**

## 🚀 Getting Started

1. ### Clone the Repository
```bash
git clone https://github.com/your-username/patient-management.git
cd patient-management
```
2. ### Run services with Docker:
   ```bash
   docker-compose up -d
   ```
3. ### Running LocalStack
   Ensure LocalStack is installed and started:   

# The whole structure
![Architecture](Architecture%20project.png)

## License ⚖️

This project is licensed under the MIT License. For more details, please refer to the file: [LICENSE](LICENSE).
