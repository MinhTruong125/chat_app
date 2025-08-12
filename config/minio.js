const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({
  region: 'us-east-1', // bất kỳ, vì MinIO không cần đúng region
  endpoint: process.env.MINIO_ENDPOINT,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY
  },
  forcePathStyle: true // quan trọng cho MinIO
});

const BUCKET = process.env.MINIO_BUCKET_NAME;

async function uploadToMinIO(file) {
  const uniqueName = `${Date.now()}-${file.originalname}`;
  const params = {
    Bucket: BUCKET,
    Key: uniqueName,
    Body: file.buffer,
    ContentType: file.mimetype
  };
  await s3.send(new PutObjectCommand(params));
  return `${process.env.MINIO_ENDPOINT}/${BUCKET}/${uniqueName}`;
}

// async function getPresignedUrl(key) {
//   const command = new GetObjectCommand({
//     Bucket: BUCKET,
//     Key: key,
//   });

//   const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 giờ
//   return url;
// }

module.exports = { uploadToMinIO };