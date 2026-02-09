import { S3, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "node:stream";

const s3Client = new S3({
  forcePathStyle: false, // Configures to use subdomain/virtual calling format.
  endpoint: "https://nyc3.digitaloceanspaces.com",
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.DIGITALOCEAN_SPACES_KEY,
    secretAccessKey: process.env.DIGITALOCEAN_SPACES_SECRET
  }
});

async function downloadFile(path) {
  try {
    console.log('Downloading file from S3:', path);
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: process.env.DIGITALOCEAN_SPACES_BUCKET,
        Key: path,
      })
    );
    console.log("Download complete!");
    return response.Body;
  } catch (error) {
    console.error("Download failed:", error);
    throw error;
  }
}

async function uploadFile(path, Body, ACL = 'private', ContentType) {
  // If Body is a string, convert to a single-chunk Readable stream.
  // If Body is a Buffer, leave it as-is (the SDK accepts Buffer/Uint8Array directly).
  if (typeof Body === 'string') {
    Body = Readable.from([Body]);
  }
  // verify content type is not null
  if (!ContentType) {
    ContentType = 'application/octet-stream';
  }
  try {
    const uploader = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.DIGITALOCEAN_SPACES_BUCKET,
        Key: path,
        Body,
        ACL: ACL,
        ContentType: ContentType,
      },
    });

    uploader.on("httpUploadProgress", (progress) => {
      console.log(progress);
    });

    await uploader.done();
    console.log("Upload complete!");
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
  return { key: path };
}

async function listFiles(bucket, prefix) {
  const Bucket = bucket || process.env.DIGITALOCEAN_SPACES_BUCKET;
  try {
    const response = await s3Client.send(
      new ListObjectsV2Command({
        Bucket,
        Prefix: prefix
      })
    );

    const contents = response?.Contents || [];
    return contents.map((item) => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified,
      url: `https://${Bucket}.nyc3.digitaloceanspaces.com/${item.Key}`
    }));
  } catch (error) {
    console.error("List files failed:", error);
    throw error;
  }
}

export default {
  s3Client,
  downloadFile,
  uploadFile,
  listFiles
};