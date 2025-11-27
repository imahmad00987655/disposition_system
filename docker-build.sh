#!/bin/bash

# Docker Build and Deploy Script
# Usage: ./docker-build.sh [production|development]

set -e

ENV=${1:-production}
IMAGE_NAME="disposition-system"
CONTAINER_NAME="disposition-system-nextjs"
PORT=${PORT:-6126}

echo "🚀 Building Docker image for $ENV environment..."

# Build the image
if [ "$ENV" = "production" ]; then
    docker build -t $IMAGE_NAME:latest .
else
    docker build -f Dockerfile.simple -t $IMAGE_NAME:dev .
fi

echo "✅ Build complete!"

# Stop and remove existing container if running
if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
    echo "🛑 Stopping existing container..."
    docker stop $CONTAINER_NAME
    docker rm $CONTAINER_NAME
fi

echo "🏃 Starting container on port $PORT..."

# Run the container
docker run -d \
    --name $CONTAINER_NAME \
    -p $PORT:6126 \
    -e NODE_ENV=$ENV \
    -e NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL:-http://localhost/Disposition-system/} \
    -e NEXT_PUBLIC_COMPLAINTS_API=${NEXT_PUBLIC_COMPLAINTS_API:-http://192.168.1.209:6004/callcenterreportdata} \
    -e NEXT_PUBLIC_ORDERS_API=${NEXT_PUBLIC_ORDERS_API:-http://192.168.1.209:5125/api_data} \
    --restart unless-stopped \
    $IMAGE_NAME:latest

echo "✅ Container started successfully!"
echo "📊 Container status:"
docker ps | grep $CONTAINER_NAME

echo ""
echo "📝 Useful commands:"
echo "  View logs: docker logs -f $CONTAINER_NAME"
echo "  Stop: docker stop $CONTAINER_NAME"
echo "  Remove: docker rm $CONTAINER_NAME"
echo "  Access: http://localhost:$PORT"

