# NestJS Azure DAM Backend

A secure Digital Asset Management API built with NestJS, Prisma, and PostgreSQL that handles authenticated multi-part file uploads and direct management streaming with Azure Blob Storage. This service features fully type-safe request mapping, temporary secure SAS URL generation, and automatic cloud-to-database deletion syncing.

## Prerequisites

Ensure you have a `.env` file configured in your root directory containing your PostgreSQL connection string, Azure Blob connection strings, and target storage container variables:

```env
DATABASE_URL="postgresql://..."
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=..."
AZURE_CONTAINER_NAME="uploads"

1. Boot up the Infrastructure (Database)

docker compose up -d

2. Install Project Dependencies

Install the foundational node modules tracked by the project ecosystem. A full audit log of these packages can also be cross-referenced inside the dependencies.txt file:

npm install

3. Synchronize Database & Generate Client

npx prisma migrate dev
npx prisma generate

4. Start the Application

npm run start:dev