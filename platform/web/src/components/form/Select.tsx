import { inputBase } from './styles'

// Styled <select> — forwards every native prop so state/handlers wire up unchanged.
export default function Select({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${inputBase} ${className}`.trim()}>
      {children}
    </select>
  )
}
