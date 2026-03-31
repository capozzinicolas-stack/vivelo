'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import LinkExtension from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Youtube from '@tiptap/extension-youtube';
import { useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus,
  Link2, ImagePlus, Youtube as YoutubeIcon,
  Undo2, Redo2, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  variant?: 'full' | 'simple';
  onImageUpload?: (file: File) => Promise<string>;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = '',
  variant = 'full',
  onImageUpload,
  className,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUpdatingRef = useRef(false);
  const uploadingRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: variant === 'full' ? { levels: [1, 2, 3] } : false,
        bulletList: variant === 'full' ? {} : false,
        orderedList: variant === 'full' ? {} : false,
        blockquote: variant === 'full' ? {} : false,
        horizontalRule: variant === 'full' ? {} : false,
        codeBlock: false,
        code: false,
      }),
      Underline,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      ...(variant === 'full'
        ? [
            Image.configure({ inline: false, allowBase64: false }),
            Youtube.configure({ inline: false, nocookie: true }),
          ]
        : []),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      isUpdatingRef.current = true;
      onChange(ed.getHTML());
      isUpdatingRef.current = false;
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm prose-neutral max-w-none focus:outline-none',
          variant === 'full' ? 'min-h-[200px]' : 'min-h-[60px]',
        ),
      },
    },
  });

  // Sync external content changes (e.g. opening a different post)
  useEffect(() => {
    if (editor && !isUpdatingRef.current) {
      const currentHtml = editor.getHTML();
      // Only update if content truly changed externally
      if (content !== currentHtml) {
        editor.commands.setContent(content, { emitUpdate: false });
      }
    }
  }, [content, editor]);

  const handleLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL del enlace:', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const handleImage = useCallback(async (file: File) => {
    if (!editor || !onImageUpload || uploadingRef.current) return;
    uploadingRef.current = true;
    try {
      const url = await onImageUpload(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch {
      console.error('Error uploading image');
    }
    uploadingRef.current = false;
  }, [editor, onImageUpload]);

  const handleYoutube = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('URL del video de YouTube:');
    if (!url) return;
    editor.chain().focus().setYoutubeVideo({ src: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={cn('border rounded-md overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 p-1.5 border-b bg-muted/30">
        {/* Text formatting — always shown */}
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Negrita"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Cursiva"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Subrayado"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>

        {variant === 'full' && (
          <>
            <ToolbarButton
              active={editor.isActive('strike')}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="Tachado"
            >
              <Strikethrough className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarSeparator />

            {/* Headings */}
            <ToolbarButton
              active={editor.isActive('heading', { level: 1 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              title="Titulo 1"
            >
              <Heading1 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive('heading', { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Titulo 2"
            >
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive('heading', { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              title="Titulo 3"
            >
              <Heading3 className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarSeparator />

            {/* Lists */}
            <ToolbarButton
              active={editor.isActive('bulletList')}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="Lista"
            >
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive('orderedList')}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="Lista numerada"
            >
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>

            {/* Blockquote + HR */}
            <ToolbarButton
              active={editor.isActive('blockquote')}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              title="Cita"
            >
              <Quote className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Linea horizontal"
            >
              <Minus className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarSeparator />
          </>
        )}

        {/* Link — always shown */}
        <ToolbarButton
          active={editor.isActive('link')}
          onClick={handleLink}
          title="Enlace"
        >
          <Link2 className="h-4 w-4" />
        </ToolbarButton>

        {variant === 'full' && (
          <>
            {/* Image */}
            {onImageUpload && (
              <ToolbarButton
                onClick={() => fileInputRef.current?.click()}
                title="Insertar imagen"
              >
                {uploadingRef.current ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
              </ToolbarButton>
            )}

            {/* YouTube */}
            <ToolbarButton
              onClick={handleYoutube}
              title="Video de YouTube"
            >
              <YoutubeIcon className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarSeparator />

            {/* Undo / Redo */}
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Deshacer"
            >
              <Undo2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Rehacer"
            >
              <Redo2 className="h-4 w-4" />
            </ToolbarButton>
          </>
        )}
      </div>

      {/* Editor */}
      <div className="p-3">
        <EditorContent editor={editor} />
      </div>

      {/* Hidden file input for image upload */}
      {variant === 'full' && onImageUpload && (
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,image/webp"
          onChange={e => {
            if (e.target.files?.[0]) handleImage(e.target.files[0]);
            e.target.value = '';
          }}
        />
      )}
    </div>
  );
}

function ToolbarButton({
  children,
  active,
  disabled,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8', active && 'bg-muted')}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      {children}
    </Button>
  );
}

function ToolbarSeparator() {
  return <div className="w-px h-6 bg-border self-center mx-0.5" />;
}
