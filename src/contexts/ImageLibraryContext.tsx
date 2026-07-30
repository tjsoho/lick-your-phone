'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import MediaLibraryModal from '@/components/core/media-library-modal';
import { supabase } from '@/lib/supabase';

interface ImageUsage {
    url: string;
    usedIn: {
        mobile?: boolean;
        desktop?: boolean;
        other?: string[];
    };
}

interface ImageLibraryContextType {
    openImageLibrary: (onSelect: (url: string) => void, usage?: 'mobile' | 'desktop' | string) => void;
    addImageUsage: (url: string, usage: 'mobile' | 'desktop' | string) => void;
}

const ImageLibraryContext = createContext<ImageLibraryContextType | undefined>(undefined);

export function ImageLibraryProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [onSelectCallback, setOnSelectCallback] = useState<((url: string) => void) | null>(null);
    const [imageUsage, setImageUsage] = useState<ImageUsage[]>([]);
    const [currentUsage, setCurrentUsage] = useState<'mobile' | 'desktop' | string | undefined>();

    const openImageLibrary = (onSelect: (url: string) => void, usage?: 'mobile' | 'desktop' | string) => {
        setOnSelectCallback(() => onSelect);
        setCurrentUsage(usage);
        setIsOpen(true);
    };

    const addImageUsage = async (url: string, usage: 'mobile' | 'desktop' | string) => {
        try {
            // First, check if the image exists in the library
            const { data: existingImages } = await supabase
                .from('image_library')
                .select('*')
                .eq('url', url)
                .single();

            if (existingImages) {
                // Update existing image usage
                const currentUsage = existingImages.usage_data || {};
                let newUsage;

                if (usage === 'mobile') {
                    newUsage = { ...currentUsage, mobile: true };
                } else if (usage === 'desktop') {
                    newUsage = { ...currentUsage, desktop: true };
                } else {
                    const otherUsages = currentUsage.other || [];
                    if (!otherUsages.includes(usage)) {
                        newUsage = {
                            ...currentUsage,
                            other: [...otherUsages, usage]
                        };
                    }
                }

                if (newUsage) {
                    await supabase
                        .from('image_library')
                        .update({ usage_data: newUsage })
                        .eq('url', url);
                }
            } else {
                // Create new image entry
                const fileName = url.split('/').pop() || '';
                const usageData: { mobile?: boolean; desktop?: boolean; other?: string[] } = {};

                if (usage === 'mobile') usageData.mobile = true;
                else if (usage === 'desktop') usageData.desktop = true;
                else usageData.other = [usage];

                await supabase
                    .from('image_library')
                    .insert({
                        file_name: fileName,
                        url: url,
                        usage_data: usageData
                    });
            }

            // Update local state
            setImageUsage(prev => {
                const existingUsage = prev.find(u => u.url === url);
                if (existingUsage) {
                    return prev.map(u => {
                        if (u.url === url) {
                            const usedIn = { ...u.usedIn };
                            if (usage === 'mobile') usedIn.mobile = true;
                            else if (usage === 'desktop') usedIn.desktop = true;
                            else {
                                usedIn.other = [...(usedIn.other || []), usage];
                            }
                            return { ...u, usedIn };
                        }
                        return u;
                    });
                } else {
                    const usedIn: ImageUsage['usedIn'] = {};
                    if (usage === 'mobile') usedIn.mobile = true;
                    else if (usage === 'desktop') usedIn.desktop = true;
                    else usedIn.other = [usage];
                    return [...prev, { url, usedIn }];
                }
            });
        } catch (error) {
            console.error('Error updating image usage:', error);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleSelectImage = (url: string) => {
        if (onSelectCallback) {
            onSelectCallback(url);
            if (currentUsage) {
                addImageUsage(url, currentUsage);
            }
        }
        setIsOpen(false);
    };

    return (
        <ImageLibraryContext.Provider value={{ openImageLibrary, addImageUsage }}>
            {children}
            <MediaLibraryModal
                isOpen={isOpen}
                onClose={handleClose}
                onSelect={handleSelectImage}
                currentUsage={imageUsage}
            />
        </ImageLibraryContext.Provider>
    );
}

export function useImageLibrary() {
    const context = useContext(ImageLibraryContext);
    if (context === undefined) {
        throw new Error('useImageLibrary must be used within an ImageLibraryProvider');
    }
    return context;
}