# API Reference

Learnify provides RESTful API endpoints for all operations.

## Authentication

All protected endpoints require authentication via NextAuth.js session.

### Session Check

```typescript
import { auth } from "@/lib/auth";

const session = await auth();
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
```

## Courses API

### List Courses

```http
GET /api/courses
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category slug |
| `level` | string | Filter by level |
| `search` | string | Search term |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Response:**

```json
{
  "courses": [
    {
      "id": "clx...",
      "title": "Web Development Bootcamp",
      "slug": "web-development-bootcamp",
      "price": 49.99,
      "instructor": {
        "id": "...",
        "name": "John Doe"
      }
    }
  ],
  "total": 100,
  "page": 1,
  "totalPages": 10
}
```

### Get Course

```http
GET /api/courses/:id
```

**Response:**

```json
{
  "id": "clx...",
  "title": "Web Development Bootcamp",
  "description": "...",
  "price": 49.99,
  "level": "BEGINNER",
  "status": "PUBLISHED",
  "instructor": { ... },
  "category": { ... },
  "sections": [
    {
      "id": "...",
      "title": "Introduction",
      "lectures": [ ... ]
    }
  ]
}
```

### Create Course

```http
POST /api/courses
```

**Requires:** Instructor or Admin role

**Request Body:**

```json
{
  "title": "My Course",
  "description": "Course description",
  "categoryId": "...",
  "level": "BEGINNER",
  "price": 29.99
}
```

### Update Course

```http
PUT /api/courses/:id
```

**Requires:** Course owner or Admin

### Delete Course

```http
DELETE /api/courses/:id
```

**Requires:** Course owner or Admin

## Categories API

### List Categories

```http
GET /api/categories
```

**Response:**

```json
{
  "categories": [
    {
      "id": "...",
      "name": "Web Development",
      "slug": "web-development",
      "_count": { "courses": 25 }
    }
  ]
}
```

## Checkout API

### Create Checkout Session

```http
POST /api/checkout
```

**Request Body:**

```json
{
  "courseId": "clx..."
}
```

**Response:**

```json
{
  "url": "https://checkout.stripe.com/..."
}
```

## Sections API

### Create Section

```http
POST /api/courses/:id/sections
```

**Requires:** Course owner or Admin

**Request Body:**

```json
{
  "title": "Getting Started",
  "description": "Introduction to the course"
}
```

### Reorder Sections

```http
PUT /api/courses/:id/sections/reorder
```

**Requires:** Course owner or Admin

**Request Body:**

```json
{
  "orderedIds": ["section1-id", "section2-id", "section3-id"]
}
```

### Update / Delete Section

```http
PUT    /api/courses/:id/sections/:sectionId
DELETE /api/courses/:id/sections/:sectionId
```

**Requires:** Course owner or Admin

## Lectures API

### Create Lecture

```http
POST /api/courses/:id/sections/:sectionId/lectures
```

**Requires:** Course owner or Admin

**Request Body:**

```json
{
  "title": "Introduction Video",
  "type": "VIDEO",
  "videoUrl": "https://res.cloudinary.com/...",
  "videoDuration": 360,
  "isFreePreview": true
}
```

Lecture types: `VIDEO`, `TEXT`, `QUIZ`

### Reorder Lectures

```http
PUT /api/courses/:id/sections/:sectionId/lectures/reorder
```

### Update / Delete Lecture

```http
PUT    /api/courses/:id/sections/:sectionId/lectures/:lectureId
DELETE /api/courses/:id/sections/:sectionId/lectures/:lectureId
```

## Progress API

### Update Lecture Progress

```http
POST /api/lectures/:lectureId/progress
```

**Requires:** Authenticated user

**Request Body:**

```json
{
  "videoPosition": 120,
  "completed": true
}
```

Recalculates overall enrollment progress percentage.

## Upload API

### Get Cloudinary Signature

```http
POST /api/upload/signature
```

**Requires:** Authenticated user

Returns a signed upload URL for client-side Cloudinary uploads.

## Wishlist API

### Add / Remove from Wishlist

```http
POST   /api/wishlist   # Add course to wishlist
DELETE /api/wishlist   # Remove course from wishlist
```

**Requires:** Authenticated user

**Request Body:**

```json
{
  "courseId": "clx..."
}
```

## Certificates API

### Generate Certificate

```http
POST /api/certificates/generate
```

**Requires:** Authenticated user with 100% course completion

### Download Certificate

```http
GET /api/certificates/:id/download
```

## Invoices API

### Get Invoice

```http
GET /api/invoices/:id
```

**Requires:** Authenticated user (own invoice)

## Webhooks

### Stripe Webhook

```http
POST /api/webhooks/stripe
```

Handles Stripe events:

- `checkout.session.completed` - Creates enrollment after successful payment
- `payment_intent.succeeded` - Updates purchase status

## Server Actions

In addition to REST APIs, Learnify uses Server Actions for mutations:

```typescript
// Enroll in a free course
"use server"
export async function enrollInCourse(courseId: string) {
  // ... implementation
}

// Update course progress
"use server"
export async function updateProgress(lectureId: string) {
  // ... implementation
}

// Submit review
"use server"
export async function submitReview(courseId: string, rating: number, comment: string) {
  // ... implementation
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Common Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |
