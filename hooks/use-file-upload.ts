'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

interface UseFileUploadOptions {
    onUploadChange?: () => void;
}

export interface FileUpload {
    markdownFileInputRef: React.RefObject<HTMLInputElement | null>;
    imageFileInputRef: React.RefObject<HTMLInputElement | null>;
    uploadedMarkdown: string | null;
    uploadedFileName: string | null;
    uploadedImages: { dataUrl: string; name: string }[];
    uploadKind: 'markdown' | 'images' | null;
    handleMarkdownFileChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    handleImageFilesChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    handleRemoveImage: (index: number) => void;
    clearUpload: () => void;
}

const MAX_IMAGES_PER_REQUEST = 5;
const MAX_IMAGE_RAW_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_PAYLOAD_CHARS = 4 * 1024 * 1024;

function compressImageToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            const srcDataUrl = reader.result as string;
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                const MAX_W = 1920;
                const MAX_H = 1920;
                let { width, height } = img;
                if (width > MAX_W || height > MAX_H) {
                    const ratio = Math.min(MAX_W / width, MAX_H / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error('Canvas unavailable')); return; }
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.82));
            };
            img.src = srcDataUrl;
        };
        reader.readAsDataURL(file);
    });
}

export function useFileUpload({ onUploadChange }: UseFileUploadOptions = {}): FileUpload {
    const t = useTranslations('admin.races.import');
    const markdownFileInputRef = useRef<HTMLInputElement>(null);
    const imageFileInputRef = useRef<HTMLInputElement>(null);

    const [uploadedMarkdown, setUploadedMarkdown] = useState<string | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const [uploadedImages, setUploadedImages] = useState<{ dataUrl: string; name: string }[]>([]);

    const uploadKind: 'markdown' | 'images' | null =
        uploadedMarkdown !== null ? 'markdown' :
            uploadedImages.length > 0 ? 'images' :
                null;

    const handleMarkdownFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = event.target.files?.[0];
        if (!file) return;
        const lowerName = file.name.toLowerCase();
        if (!lowerName.endsWith('.md') && !lowerName.endsWith('.json')) {
            toast.error(t('fileTypeErrorMd'));
            event.target.value = '';
            return;
        }
        try {
            const text = await file.text();
            setUploadedMarkdown(text);
            setUploadedFileName(file.name);
            onUploadChange?.();
        } catch {
            toast.error(t('scrapeError'));
            event.target.value = '';
        }
    };

    const handleImageFilesChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const files = Array.from(event.target.files ?? []);
        if (files.length === 0) return;

        try {
            const combined = [...uploadedImages];
            for (const file of files) {
                if (!file.type.startsWith('image/')) {
                    toast.error(t('fileTypeErrorImage'));
                    event.target.value = '';
                    return;
                }
                if (file.size > MAX_IMAGE_RAW_BYTES) {
                    toast.error(t('imageSizeError'));
                    event.target.value = '';
                    return;
                }
                if (combined.length >= MAX_IMAGES_PER_REQUEST) {
                    toast.error(t('imageLimitError'));
                    event.target.value = '';
                    return;
                }
                const dataUrl = await compressImageToDataUrl(file);
                combined.push({ dataUrl, name: file.name });
            }

            const totalChars = combined.reduce((sum, img) => sum + img.dataUrl.length, 0);
            if (totalChars > MAX_TOTAL_PAYLOAD_CHARS) {
                toast.error(t('imageSizeError'));
                event.target.value = '';
                return;
            }

            setUploadedImages(combined);
            onUploadChange?.();
        } catch {
            toast.error(t('scrapeError'));
        } finally {
            event.target.value = '';
        }
    };

    const handleRemoveImage = (index: number): void => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
    };

    const clearUpload = (): void => {
        setUploadedMarkdown(null);
        setUploadedFileName(null);
        setUploadedImages([]);
        if (markdownFileInputRef.current) markdownFileInputRef.current.value = '';
        if (imageFileInputRef.current) imageFileInputRef.current.value = '';
    };

    return {
        markdownFileInputRef,
        imageFileInputRef,
        uploadedMarkdown,
        uploadedFileName,
        uploadedImages,
        uploadKind,
        handleMarkdownFileChange,
        handleImageFilesChange,
        handleRemoveImage,
        clearUpload,
    };
}
