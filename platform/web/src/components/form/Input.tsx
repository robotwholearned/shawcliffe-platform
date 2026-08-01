import { inputBase } from './styles'

// Styled <input> — forwards every native prop so state/handlers wire up unchanged.
export default function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${className}`.trim()} />
}
