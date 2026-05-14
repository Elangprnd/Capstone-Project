import cloudinary from '../config/cloudinary';
import { UploadApiResponse } from 'cloudinary';

// Using the promise approach with a buffer.

export const uploadToCloudinary = (fileBuffer: Buffer, folder: string): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Cloudinary upload failed: no result'));
        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

export const uploadMultipleToCloudinary = async (fileBuffers: Buffer[], folder: string): Promise<string[]> => {
  const uploadPromises = fileBuffers.map(buffer => uploadToCloudinary(buffer, folder));
  const results = await Promise.all(uploadPromises);
  return results.map(result => result.secure_url);
};
