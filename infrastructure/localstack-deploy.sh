#!/bin/bash

set -e # Exit immediately if a command exits with a non-zero status.

# The stack runs the local images auth-service, billing-service, analytics-service, patient-service and
# api-gateway (ContainerImage.fromRegistry in LocalStack.java). Build them first, so a deploy also works
# after the Docker images on this machine were cleaned up.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
for service in auth-service billing-service analytics-service patient-service api-gateway; do
    docker build -t "$service" "$ROOT/$service"
done

aws --endpoint-url=http://localhost:4566 cloudformation delete-stack \
    --stack-name patient-management

aws --endpoint-url=http://localhost:4566 cloudformation deploy \
    --stack-name patient-management \
    --template-file ./cdk.out/localstack.template.json

aws --endpoint-url=http://localhost:4566 elbv2 describe-load-balancers \
    --query "LoadBalancers[0].DNSName" --output text