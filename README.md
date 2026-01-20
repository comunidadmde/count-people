# Door Counter System

A Next.js application for tracking people count across multiple doors with MongoDB integration.

## Features

- **3 Door Counters**: Main Entrance, Side Door, Back Door
- **Individual Door Views**: Dedicated page for each door counter
- **Admin Dashboard**: Password-protected admin view to manage all counters
- **Counter Management**: Increment/Decrement functionality
- **Reset Functionality**: Reset individual or all counters (admin only)
- **MongoDB Integration**: Save count data to MongoDB
- **Real-time Display**: View current counts and historical data
- **Modern UI**: Responsive design with Tailwind CSS

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
   - Create a `.env.local` file in the root directory
   - Add your MongoDB connection string:
   ```
   MONGODB_URI=mongodb://localhost:27017/door-counter
   ```
   - For MongoDB Atlas, use:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/door-counter
   ```
   - Add admin password (required for admin dashboard):
   ```
   ADMIN_PASSWORD=your-secure-password-here
   ```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## MongoDB Schema

The application stores counter data in a `counters` collection with the following structure:

```typescript
{
  doorId: string;
  count: number;
  timestamp: Date;
  ipAddress?: string; // IP address of the person who made the click
}
```

**Note**: The IP address is automatically captured from request headers (x-forwarded-for, x-real-ip, cf-connecting-ip) to handle proxies, load balancers, and CDNs properly.

## Pages & Routes

- `/` - Home page with all door counters
- `/door/[doorId]` - Individual door counter view (door-1, door-2, door-3)
- `/admin` - Admin login page
- `/admin/dashboard` - Admin dashboard (password protected)

## API Routes

- `GET /api/counters` - Get all counter records
- `POST /api/counters` - Save a new counter record
- `GET /api/counters/[doorId]` - Get the latest count for a specific door
- `POST /api/admin/login` - Admin login authentication
- `POST /api/admin/logout` - Admin logout
- `POST /api/admin/reset` - Reset counters (admin only)

## Troubleshooting

### MongoDB Connection Errors

If you encounter SSL/TLS errors when connecting to MongoDB Atlas:

1. **Check your connection string**: Ensure your `MONGODB_URI` in `.env.local` is correct and properly formatted:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name?retryWrites=true&w=majority
   ```

2. **IP Whitelist**: Make sure your IP address is whitelisted in MongoDB Atlas:
   - Go to MongoDB Atlas → Network Access
   - Add your current IP address (or use `0.0.0.0/0` for development, but this is less secure)

3. **Database User**: Verify your database user has the correct permissions:
   - Go to MongoDB Atlas → Database Access
   - Ensure the user has at least "Read and write to any database" permissions

4. **Connection String Format**: For MongoDB Atlas, use `mongodb+srv://` format. For local MongoDB, use `mongodb://localhost:27017/database-name`

5. **Restart the dev server**: After updating `.env.local`, restart your Next.js development server

### Common Error Messages

- **"MongoServerSelectionError"**: Usually indicates a connection issue. Check your network, IP whitelist, and connection string.
- **"SSL/TLS alert internal error"**: Often related to MongoDB Atlas connection issues. Verify your connection string and IP whitelist settings.

## Technologies

- Next.js 15
- React 18
- TypeScript
- Tailwind CSS
- MongoDB
