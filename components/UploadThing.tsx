'use client';

import { useState } from 'react';
import { generateReactHelpers } from '@uploadthing/react';
import type { OurFileRouter } from '../app/api/uploadthing/core';

const { useUploadThing } = generateReactHelpers<OurFileRouter>();

type ConfirmUploadButtonProps = {
  endpoint: keyof OurFileRouter;
  onUploadComplete?: (url: string) => void;
  onUploadError?: (error: Error) => void;
  onImagePreview?: (url: string) => void;
  onCancel?: () => void;
  accept?: string;
  className?: string;
  buttonClassName?: string;
  texts?: {
    chooseFile?: string;
    confirmUpload?: string;
    cancel?: string;
    uploading?: string;
  };
};

export function ConfirmUploadButton({
  endpoint,
  onUploadComplete,
  onUploadError,
  onImagePreview,
  onCancel = () => {},
  accept = 'image/*',
  className,
  buttonClassName,
  texts = {},
}: ConfirmUploadButtonProps) {
  const {
    chooseFile = 'Choose File',
    confirmUpload = 'Confirm Upload',
    cancel = 'Cancel',
    uploading = 'Uploading...',
  } = texts;
  const [file, setFile] = useState<File | null>(null);

  const { startUpload, isUploading } = useUploadThing(endpoint, {
    onClientUploadComplete: (res) => {
      const url = res[0]?.url;
      if (!url) {
        throw new Error('No URL returned from upload');
      }
      setFile(null);
      onUploadComplete?.(url);
    },
    onUploadError: (error) => {
      onUploadError?.(error);
    },
  });

  if (!file) {
    return (
      <div className={className}>
        <div>
          <label
            htmlFor="file-upload"
            className={
              buttonClassName ||
              'cursor-pointer inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors'
            }
          >
            {chooseFile}
          </label>
          <input
            id="file-upload"
            type="file"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                const selectedFiles = Array.from(e.target.files);
                const file = selectedFiles[0];
                setFile(file);

                if (file.type.startsWith('image/')) {
                  const url = URL.createObjectURL(file);
                  onImagePreview?.(url);
                }
              }
            }}
            accept={accept}
            className="hidden"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        <div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                await startUpload([file]);
              }}
              disabled={isUploading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? uploading : confirmUpload}
            </button>
            <button
              onClick={() => {
                setFile(null);
                onCancel();
              }}
              disabled={isUploading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {cancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
