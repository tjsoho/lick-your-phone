'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import { useCallback, useEffect, useState } from 'react';
import LinkModal from './LinkModal';
import { useImageLibrary } from '@/contexts/ImageLibraryContext';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    className?: string;
}

const RichTextEditor = ({ content, onChange, className }: RichTextEditorProps) => {
    const { openImageLibrary } = useImageLibrary();
    const [isMounted, setIsMounted] = useState(false);

    const editor = useEditor({
        editable: true,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none prose-headings:text-brand-black prose-p:text-brand-black prose-strong:text-brand-black prose-img:rounded-none prose-a:text-brand-teal [&_a]:text-brand-teal [&_a]:underline [&_a]:hover:text-brand-yellow [&_p]:mb-6',
            },
        },
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-brand-teal underline cursor-pointer hover:text-brand-yellow transition-colors !text-inherit',
                    ondblclick: 'window.__handleLinkDoubleClick && window.__handleLinkDoubleClick(this)',
                },
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'max-w-full h-auto shadow-lg',
                },
            }),
            Underline,
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        immediatelyRender: false,
    });

    const addImage = useCallback(() => {
        openImageLibrary((url) => {
            if (url && editor) {
                editor.chain().focus().setImage({ src: url }).run();
            }
        }, 'blog-content');
    }, [editor, openImageLibrary]);

    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkSelection, setLinkSelection] = useState<{
        text: string;
        url: string;
    }>({ text: '', url: '' });

    const setLink = useCallback(() => {
        const { from = 0, to = 0 } = editor?.state.selection || {};
        const selectedText = editor?.state.doc.textBetween(from, to, ' ');
        const previousUrl = editor?.getAttributes('link').href || '';

        setLinkSelection({
            text: selectedText || '',
            url: previousUrl
        });
        setShowLinkModal(true);
    }, [editor]);

    const handleLinkSubmit = useCallback((displayText: string, url: string) => {
        if (!editor) return;

        const { from, to } = editor.state.selection;
        const hasSelection = from !== to;

        if (!hasSelection) {
            editor.chain()
                .focus()
                .insertContent('<p>')
                .insertContent({
                    type: 'text',
                    text: displayText,
                    marks: [{ type: 'link', attrs: { href: url } }]
                })
                .insertContent('</p>')
                .insertContent('<p></p>') // Add empty paragraph for spacing
                .run();
        } else {
            if (url === '') {
                editor.chain().focus().unsetLink().run();
            } else {
                editor.chain()
                    .focus()
                    .setLink({ href: url })
                    .insertContent('<p></p>') // Add empty paragraph for spacing
                    .run();
            }
        }

        // Don't close modal - it will close itself after all links are processed
    }, [editor]);

    useEffect(() => {
        setIsMounted(true);

        // Add global handler for link double-clicks
        window.__handleLinkDoubleClick = (element: HTMLAnchorElement) => {
            if (!editor) return;

            const href = element.getAttribute('href') || '';
            const text = element.textContent || '';

            // Select the link node
            const { state } = editor;
            const { from, to } = state.selection;

            // Set the selection to the double-clicked link
            editor.commands.setTextSelection({
                from: from,
                to: to
            });

            // Open link modal with current values
            setLinkSelection({
                text: text,
                url: href
            });
            setShowLinkModal(true);
        };

        return () => {
            delete window.__handleLinkDoubleClick;
        };
    }, [editor]);

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            // Process content to ensure proper line breaks
            const processedContent = content
                // Add double line breaks after links
                .replace(/<\/a>/g, '</a>\n\n')
                // Add double line breaks after paragraphs
                .replace(/<\/p>/g, '</p>\n\n')
                // Normalize multiple line breaks to just two
                .replace(/\n{3,}/g, '\n\n');

            editor.commands.setContent(processedContent);
        }
    }, [content, editor]);

    if (!editor || !isMounted) {
        return <div className="border border-brand-black/20 h-[400px] animate-pulse bg-brand-cream/30" />;
    }

    const buttonStyle = (isActive: boolean) => `
        px-3 py-1.5 text-sm font-medium transition-colors
        ${isActive ? 'bg-brand-teal/20 text-brand-black border border-brand-teal' : 'text-brand-black/70 hover:bg-brand-cream/50 border border-transparent'}
    `;

    return (
        <div className={`relative border border-brand-black/20 rounded-lg overflow-hidden bg-white ${className || ''}`}>
            <div className="sticky top-0 z-10 flex flex-wrap gap-1 p-2 bg-white border-b border-brand-black/20">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={buttonStyle(editor.isActive('heading', { level: 1 }))}
                    aria-label="Toggle Heading 1"
                >
                    H1
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={buttonStyle(editor.isActive('heading', { level: 2 }))}
                    aria-label="Toggle Heading 2"
                >
                    H2
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={buttonStyle(editor.isActive('heading', { level: 3 }))}
                    aria-label="Toggle Heading 3"
                >
                    H3
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setParagraph().run()}
                    className={buttonStyle(editor.isActive('paragraph'))}
                    aria-label="Toggle Paragraph"
                >
                    P
                </button>
                <div className="w-px h-6 bg-brand-black/20 mx-1 self-center" aria-hidden="true" />
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={buttonStyle(editor.isActive('bold'))}
                    aria-label="Toggle Bold"
                >
                    <strong>B</strong>
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={buttonStyle(editor.isActive('italic'))}
                    aria-label="Toggle Italic"
                >
                    <em>I</em>
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={buttonStyle(editor.isActive('underline'))}
                    aria-label="Toggle Underline"
                >
                    <u>U</u>
                </button>
                <div className="w-px h-6 bg-brand-black/20 mx-1 self-center" aria-hidden="true" />
                <button
                    type="button"
                    onClick={setLink}
                    className={buttonStyle(editor.isActive('link'))}
                    aria-label="Add or Edit Link"
                >
                    Link
                </button>
                <button
                    type="button"
                    onClick={addImage}
                    className="px-3 py-1.5 text-sm font-medium text-brand-black/70 hover:bg-brand-cream/50 transition-colors border border-transparent"
                    aria-label="Add Image"
                >
                    Image
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={buttonStyle(editor.isActive('bulletList'))}
                    aria-label="Toggle Bullet List"
                >
                    • List
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={buttonStyle(editor.isActive('orderedList'))}
                    aria-label="Toggle Numbered List"
                >
                    1. List
                </button>
            </div>

            <div
                className="p-4 overflow-y-auto h-[calc(100%-48px)] cursor-text"
                onClick={() => editor.chain().focus().run()}
            >
                <EditorContent editor={editor} />
            </div>

            <LinkModal
                isOpen={showLinkModal}
                onClose={() => setShowLinkModal(false)}
                onSubmit={handleLinkSubmit}
                initialText={linkSelection.text}
                initialUrl={linkSelection.url}
            />
        </div>
    );
};

export default RichTextEditor;