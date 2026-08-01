import { inputBase } from './styles'

// Styled <textarea> — resize disabled to keep the card layout stable.
export default function Textarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputBase} resize-none ${className}`.trim()} />
}
