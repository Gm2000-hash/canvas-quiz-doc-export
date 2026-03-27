import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useCallback, useRef } from 'react';
import { RichTextToolbar } from './RichTextToolbar';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Compact mode hides some toolbar items for smaller fields */
  compact?: boolean;
  /** Minimal mode shows only inline formatting (bold/italic/underline) */
  minimal?: boolean;
  className?: string;
  /** If true, editor is not editable */
  readOnly?: boolean;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  compact = false,
  minimal = false,
  className = '',
  readOnly = false,
}: RichTextEditorProps) {
  const isUpdatingRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: minimal ? false : { levels: [1, 2, 3, 4] },
        bulletList: minimal ? false : undefined,
        orderedList: minimal ? false : undefined,
        blockquote: minimal ? false : undefined,
        codeBlock: minimal ? false : undefined,
        horizontalRule: minimal ? false : undefined,
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      ...(minimal
        ? []
        : [
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline cursor-pointer' } }),
            Image.configure({ inline: true }),
          ]),
      Placeholder.configure({ placeholder }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (isUpdatingRef.current) return;
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none min-h-[60px] px-3 py-2 ${className}`,
      },
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (!editor) return;
    const currentHTML = editor.getHTML();
    if (content !== currentHTML) {
      isUpdatingRef.current = true;
      editor.commands.setContent(content);
      isUpdatingRef.current = false;
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) editor.setEditable(!readOnly);
  }, [readOnly, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-input bg-background overflow-hidden">
      {!readOnly && <RichTextToolbar editor={editor} compact={compact} minimal={minimal} />}
      <EditorContent editor={editor} />
    </div>
  );
}
