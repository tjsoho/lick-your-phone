import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Initialize Supabase client with your values
const supabaseUrl = "https://swvnnbrhtwlztjbwrtl.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3dm5uYnJodHdsenRqYndydGwiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwNzg2MzE2MSwiZXhwIjoyMDIzNDM5MTYxfQ.A3SP3NRaUujjNpGNWJODQvhVYOhbI";

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

const BUCKET_NAME = "site-images";

async function syncImages() {
  const publicImagesPath = path.join(process.cwd(), "public", "images");

  try {
    // Read all files from the public/images directory
    const files = fs.readdirSync(publicImagesPath);

    console.log(`Found ${files.length} files in public/images`);

    for (const file of files) {
      // Skip hidden files
      if (file.startsWith(".")) continue;

      const filePath = path.join(publicImagesPath, file);
      const fileContent = fs.readFileSync(filePath);
      const fileBuffer = Buffer.from(fileContent);

      console.log(`Uploading ${file}...`);

      try {
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(file, fileBuffer, {
            cacheControl: "3600",
            upsert: true,
          });

        if (error) {
          console.error(`Error uploading ${file}:`, error);
          continue;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);
        console.log(`✓ Uploaded ${file}: ${publicUrl}`);
      } catch (uploadError) {
        console.error(`Error uploading ${file}:`, uploadError);
      }
    }

    console.log("Image sync complete!");
  } catch (error) {
    console.error("Error syncing images:", error);
  }
}

// Run the sync
syncImages();
