# Website Template

A Next.js website template with Supabase integration, featuring a blog, admin panel, and dynamic content management.

## 🚀 One-command setup (recommended)

Spin up a complete new site — GitHub repo, Supabase project (schema + buckets +
admin user), Vercel deploy, env vars wired, browser opened at the live URL — with
a single command:

```bash
curl -fsSL https://raw.githubusercontent.com/tjsoho/summer-website-template/main/bootstrap.sh | bash -s my-site
```

That creates a private repo `my-site` from this template, clones it, installs
dependencies, and runs the interactive bootstrap (`npm start app`). It asks
for an admin password, Supabase region, and Vercel scope; everything else is
automated (≈ 4–6 minutes, mostly Supabase provisioning).

**Prerequisites:** Node ≥ 20, the [`gh` CLI](https://cli.github.com) (`gh auth login`),
and one-time [Supabase](https://supabase.com/dashboard/account/tokens) +
[Vercel](https://vercel.com/account/tokens) API tokens (cached after first run).

See [`scripts/README.md`](scripts/README.md) for what each step does, flags
(`--dry-run`, `--admin-email`, …), and safety/rollback behavior.

> **v2:** this CLI will be published to npm so `npx create-summer-site` works
> without the `bootstrap.sh` curl step. For now, use the command above.

The manual setup below remains available if you'd rather wire things up yourself.

## Getting Started

### 1. Install Dependencies

First, install the project dependencies:

```bash
npm install
```

### 2. Set Up Supabase

1. Create a [Supabase account](https://supabase.com) and create a new project
2. Go to your project settings and copy the following environment variables:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Create a `.env.local` file in your project root and add these variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set Up Database

1. Go to the SQL Editor in your Supabase dashboard
2. Run the following SQL queries to create the required tables:

```sql
-- Create blogs table
create table if not exists blogs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cover_image text,
  excerpt text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  author text not null,
  content text,
  slug text unique not null
);

-- Create pages table
create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  slug text unique not null,
  content jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Optional: Trigger to automatically update `updated_at` on row update
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_update_updated_at
before update on pages
for each row
execute procedure update_updated_at_column();
```

### 4. Set Up Storage Bucket

1. Go to the Storage section in your Supabase dashboard
2. Create a new bucket called `site-images` with the following settings:

   - Bucket Name: `site-images`
   - Public bucket: ✅ (checked)
   - File size limit: 50MB (or your preferred limit)

3. Set up storage policies by going to Authentication > Policies and adding these RLS policies for the `site-images` bucket:

```sql
-- Allow public read access to all files
CREATE POLICY "Give public access to all files" ON storage.objects
bucket_id = 'site-images';

-- Allow authenticated users to insert files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'site-images'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update their files
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE WITH CHECK (
  bucket_id = 'site-images'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their files
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE USING (
  bucket_id = 'site-images'
  AND auth.role() = 'authenticated'
);
```

4. Initial Image Sync (Optional)
   If you have existing images in your `public/images` directory that you want to sync to Supabase:

5. Usage in Code
   - To upload images: Use the Media Library component which handles uploads to the `site-images` bucket
   - To get public URLs: Use `supabase.storage.from('site-images').getPublicUrl(filename)`
   - Maximum file size is determined by your bucket settings
   - Supported file types: Images (jpg, jpeg, png, gif, svg, webp)

### 5. Create Admin User

1. Go to Authentication > Users in your Supabase dashboard
2. Click "Add User" and create an admin account with:
   - Email: your admin email
   - Password: your admin password
3. This user will be able to access the admin panel at `/admin`

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- **Blog System**: Create and manage blog posts with markdown support
- **Admin Panel**: Secure admin interface for content management
- **Dynamic Pages**: Manage about, services, and other pages through the admin panel
- **Authentication**: Supabase-powered authentication with middleware protection
- **Responsive Design**: Built with Tailwind CSS for mobile-first design

## Project Structure

- `/src/app/admin` - Admin panel pages
- `/src/app/blog` - Blog pages and posts
- `/src/components` - Reusable React components
- `/src/utils` - Utility functions and Supabase clients
- `/src/server-actions` - Server-side actions for data operations

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Supabase Documentation](https://supabase.com/docs) - learn about Supabase features
- [Tailwind CSS](https://tailwindcss.com/docs) - utility-first CSS framework

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

```
sql create table if not exists blogs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cover_image text,
  excerpt text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  author text not null,
  content text,
  slug text unique not null
);

```

```sql
create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  slug text unique not null,
  content jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Optional: Trigger to automatically update `updated_at` on row update
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_update_updated_at
before update on pages
for each row
execute procedure update_updated_at_column();
```
