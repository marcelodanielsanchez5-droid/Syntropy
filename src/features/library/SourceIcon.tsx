import {
  BookOpen,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Link2,
  Paperclip,
  type LucideIcon,
} from 'lucide-react'
import type { SourceType } from '@/types/database'

export const SOURCE_ICONS: Record<SourceType, LucideIcon> = {
  document: FileText,
  book: BookOpen,
  link: Link2,
  video: FileVideo,
  image: FileImage,
  audio: FileAudio,
  other: Paperclip,
}

export function SourceIcon({ type, className }: { type: SourceType; className?: string }) {
  const Icon = SOURCE_ICONS[type]
  return <Icon className={className} aria-hidden="true" />
}
