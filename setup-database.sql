-- ============================================================================
-- Complete Database Setup Script
-- Creates all tables for dynamic content, pages, image library, and SEO
-- Includes storage bucket policies for site-images (no auth required for uploads)
-- ============================================================================

-- ============================================================================
-- 1. UTILITY FUNCTIONS
-- ============================================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Alternative function name for compatibility
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. STORAGE BUCKET POLICIES FOR 'site-images'
-- ============================================================================
-- 
-- IMPORTANT: Before running this script, you must create the bucket manually:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New Bucket"
-- 3. Name: "site-images"
-- 4. Public bucket: ✅ (checked)
-- 5. File size limit: 50MB (or your preferred limit)
--
-- ============================================================================

-- Drop existing policies (if they exist) to avoid conflicts


-- Policy 1: Allow public read access to all files in site-images bucket
CREATE POLICY "Public read access for site-images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'site-images');

-- Policy 2: Allow public insert (no auth required)
CREATE POLICY "Public insert for site-images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'site-images');

-- Policy 3: Allow public update (no auth required)
CREATE POLICY "Public update for site-images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'site-images')
WITH CHECK (bucket_id = 'site-images');

-- Policy 4: Allow public delete (no auth required)
CREATE POLICY "Public delete for site-images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'site-images');

-- ============================================================================
-- 3. PAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT,
    description TEXT,
    content JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_pages_slug ON public.pages(slug);

-- Enable RLS
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Create policies for pages
CREATE POLICY "Enable read access for all users" ON public.pages
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.pages
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.pages
    FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.pages
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_pages_updated_at
    BEFORE UPDATE ON public.pages
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================================================
-- 4. BLOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blogs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    cover_image TEXT,
    excerpt TEXT,
    author TEXT NOT NULL,
    content TEXT,
    slug TEXT NOT NULL UNIQUE,
    -- SEO fields
    meta_title TEXT,
    meta_description TEXT,
    keywords TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for blogs
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON public.blogs(slug);
CREATE INDEX IF NOT EXISTS idx_blogs_created_at ON public.blogs(created_at DESC);

-- Enable RLS
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Create policies for blogs
CREATE POLICY "Enable read access for all users" ON public.blogs
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.blogs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.blogs
    FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.blogs
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_blogs_updated_at
    BEFORE UPDATE ON public.blogs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Add comments for SEO fields
COMMENT ON COLUMN public.blogs.meta_title IS 'Custom SEO meta title for the blog post';
COMMENT ON COLUMN public.blogs.meta_description IS 'Custom SEO meta description for the blog post';
COMMENT ON COLUMN public.blogs.keywords IS 'Comma-separated keywords for SEO meta tags';

-- ============================================================================
-- 5. IMAGE LIBRARY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.image_library (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_name TEXT NOT NULL,
    url TEXT NOT NULL,
    usage_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on url for faster lookups
CREATE INDEX IF NOT EXISTS idx_image_library_url ON public.image_library(url);
CREATE INDEX IF NOT EXISTS idx_image_library_file_name ON public.image_library(file_name);

-- Enable RLS
ALTER TABLE public.image_library ENABLE ROW LEVEL SECURITY;

-- Create policies for image_library
CREATE POLICY "Enable read access for all users" ON public.image_library
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.image_library
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.image_library
    FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.image_library
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_image_library_updated_at
    BEFORE UPDATE ON public.image_library
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================================================
-- 6. SEO METADATA TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.seo_metadata (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    meta_title TEXT NOT NULL,
    meta_description TEXT,
    keywords TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_seo_metadata_slug ON public.seo_metadata(slug);

-- Disable RLS (or configure as needed based on your requirements)
ALTER TABLE public.seo_metadata DISABLE ROW LEVEL SECURITY;

-- Add comment
COMMENT ON TABLE public.seo_metadata IS 'Stores custom SEO title, description, and keywords for each route.';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_seo_metadata_updated_at
    BEFORE UPDATE ON public.seo_metadata
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================================================
-- 7. FAQ CATEGORIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.faq_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_faq_categories_slug ON public.faq_categories(slug);

-- ============================================================================
-- 8. FAQS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.faqs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category_id UUID REFERENCES public.faq_categories(id) ON DELETE SET NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for FAQs
CREATE INDEX IF NOT EXISTS idx_faqs_category_id ON public.faqs(category_id);
CREATE INDEX IF NOT EXISTS idx_faqs_order_index ON public.faqs(order_index);

-- Insert default 'General' category if it doesn't exist
INSERT INTO public.faq_categories (id, name, slug)
SELECT 
    '00000000-0000-0000-0000-000000000000'::uuid,
    'General',
    'general'
WHERE NOT EXISTS (
    SELECT 1 FROM public.faq_categories WHERE slug = 'general'
);

-- Update any FAQs without a category to use 'General'
UPDATE public.faqs 
SET category_id = '00000000-0000-0000-0000-000000000000'::uuid
WHERE category_id IS NULL;

-- Function to move FAQs to 'General' category when their category is deleted
CREATE OR REPLACE FUNCTION move_faqs_to_general()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.faqs
    SET category_id = '00000000-0000-0000-0000-000000000000'::uuid
    WHERE category_id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to move FAQs before category deletion
CREATE TRIGGER move_faqs_before_category_delete
    BEFORE DELETE ON public.faq_categories
    FOR EACH ROW
    WHEN (OLD.id != '00000000-0000-0000-0000-000000000000'::uuid)
    EXECUTE FUNCTION move_faqs_to_general();

-- Function to prevent deletion of 'General' category
CREATE OR REPLACE FUNCTION prevent_general_category_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.id = '00000000-0000-0000-0000-000000000000'::uuid THEN
        RAISE EXCEPTION 'Cannot delete the General category';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent deletion of General category
CREATE TRIGGER prevent_general_category_delete
    BEFORE DELETE ON public.faq_categories
    FOR EACH ROW
    EXECUTE FUNCTION prevent_general_category_deletion();

-- Create trigger to auto-update updated_at for FAQs
CREATE TRIGGER update_faqs_updated_at
    BEFORE UPDATE ON public.faqs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Disable RLS for FAQ tables (or configure as needed)
ALTER TABLE public.faq_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 9. TEAM TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.team (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    excerpt TEXT,
    content TEXT,
    cover_image TEXT,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_slug ON public.team(slug);

-- Enable RLS
ALTER TABLE public.team ENABLE ROW LEVEL SECURITY;

-- Create policies for team
CREATE POLICY "Enable read access for all users" ON public.team
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.team
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.team
    FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.team
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_team_updated_at
    BEFORE UPDATE ON public.team
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================================================
-- 10. PRIVACY POLICY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.privacy_policy (
    id TEXT PRIMARY KEY DEFAULT 'privacy-policy-1',
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.privacy_policy ENABLE ROW LEVEL SECURITY;

-- Create policies for privacy_policy
CREATE POLICY "Anyone can read privacy policy" ON public.privacy_policy
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can update privacy policy" ON public.privacy_policy
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert privacy policy" ON public.privacy_policy
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_privacy_policy_updated_at
    BEFORE UPDATE ON public.privacy_policy
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================================================
-- 11. TERMS AND CONDITIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.terms_and_conditions (
    id TEXT PRIMARY KEY DEFAULT 'terms-and-conditions-1',
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.terms_and_conditions ENABLE ROW LEVEL SECURITY;

-- Create policies for terms_and_conditions
CREATE POLICY "Enable read access for all users" ON public.terms_and_conditions
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.terms_and_conditions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.terms_and_conditions
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_terms_and_conditions_updated_at
    BEFORE UPDATE ON public.terms_and_conditions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================================================
-- 12. TERMS OF USE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.terms_of_use (
    id TEXT PRIMARY KEY DEFAULT 'terms-of-use-1',
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.terms_of_use ENABLE ROW LEVEL SECURITY;

-- Create policies for terms_of_use
CREATE POLICY "Enable read access for all users" ON public.terms_of_use
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.terms_of_use
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.terms_of_use
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_terms_of_use_updated_at
    BEFORE UPDATE ON public.terms_of_use
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Database setup complete! All tables have been created.';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - pages (dynamic page content)';
    RAISE NOTICE '  - blogs (blog posts with SEO fields)';
    RAISE NOTICE '  - image_library (image management)';
    RAISE NOTICE '  - seo_metadata (page-level SEO)';
    RAISE NOTICE '  - faq_categories (FAQ categories)';
    RAISE NOTICE '  - faqs (FAQ entries)';
    RAISE NOTICE '  - team (team members)';
    RAISE NOTICE '  - privacy_policy (privacy policy content)';
    RAISE NOTICE '  - terms_and_conditions (terms and conditions content)';
    RAISE NOTICE '  - terms_of_use (terms of use content)';
    RAISE NOTICE '';
    RAISE NOTICE 'Storage policies created for "site-images" bucket:';
    RAISE NOTICE '  ✓ Public read access';
    RAISE NOTICE '  ✓ Public insert (no auth required)';
    RAISE NOTICE '  ✓ Public update (no auth required)';
    RAISE NOTICE '  ✓ Public delete (no auth required)';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: Make sure you have created the "site-images" bucket in Supabase Dashboard > Storage';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT: Create an admin user:';
    RAISE NOTICE '  1. Go to Supabase Dashboard > Authentication > Users';
    RAISE NOTICE '  2. Click "Add User" or "Create User"';
    RAISE NOTICE '  3. Enter email and password for your admin account';
    RAISE NOTICE '  4. Use these credentials to log in at /admin/login';
END $$;

