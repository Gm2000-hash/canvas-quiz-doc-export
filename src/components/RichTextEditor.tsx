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
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Details } from '@tiptap/extension-details';
import { DetailsSummary } from '@tiptap/extension-details-summary';
import { DetailsContent } from '@tiptap/extension-details-content';
import { Node, mergeAttributes } from '@tiptap/core';
import { useEffect, useRef } from 'react';
import { RichTextToolbar } from './RichTextToolbar';

// Notion-style "callout" block — a styled wrapper containing block content
const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      icon: { default: '💡' },
      tone: { default: 'info' }, // info | warn | success | danger
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const { icon, tone, ...rest } = HTMLAttributes as any;
    return [
      'div',
      mergeAttributes(rest, { 'data-callout': '', 'data-tone': tone, 'data-icon': icon, class: 'tk-callout' }),
      0,
    ];
  },
  addCommands() {
    return {
      setCallout:
        (attrs: { icon?: string; tone?: string } = {}) =>
        ({ commands }: any) =>
          commands.wrapIn(this.name, attrs),
      unsetCallout:
        () =>
        ({ commands }: any) =>
          commands.lift(this.name),
    } as any;
  },
});

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
            TaskList.configure({ HTMLAttributes: { class: 'tk-task-list' } }),
            TaskItem.configure({ nested: true, HTMLAttributes: { class: 'tk-task-item' } }),
            Table.configure({ resizable: true, HTMLAttributes: { class: 'tk-table' } }),
            TableRow,
            TableHeader,
            TableCell,
            Details.configure({ HTMLAttributes: { class: 'tk-details' } }),
            DetailsSummary,
            DetailsContent,
            Callout,
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
