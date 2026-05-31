-- SQL script to create avatars and covers buckets and apply RLS policies

-- 1. Create the avatars bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create the covers bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS for avatars bucket
-- Allow public read access to the avatars bucket
CREATE POLICY "Public Access Avatars" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- Allow authenticated users to insert/upload files into their own folder (user_id/)
CREATE POLICY "Users can upload their own avatars" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update files in their own folder
CREATE POLICY "Users can update their own avatars" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete files in their own folder
CREATE POLICY "Users can delete their own avatars" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. RLS for covers bucket
-- Allow public read access to the covers bucket
CREATE POLICY "Public Access Covers" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'covers');

-- Allow authenticated users to insert/upload files into their own folder (user_id/)
CREATE POLICY "Users can upload their own covers" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'covers' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update files in their own folder
CREATE POLICY "Users can update their own covers" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'covers' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete files in their own folder
CREATE POLICY "Users can delete their own covers" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'covers' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
